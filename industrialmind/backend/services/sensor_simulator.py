"""Real-time sensor simulator and WebSocket broadcaster."""

from __future__ import annotations

import asyncio
import math
import random
import time
from collections import defaultdict, deque
from datetime import datetime, timezone
from typing import Any

import numpy as np
from fastapi import WebSocket

from db.sqlite_client import insert_reading
from services.anomaly_detector import SENSOR_THRESHOLDS, detect_anomaly, predict_failure

CONNECTED_CLIENTS: set[WebSocket] = set()
LATEST_PAYLOAD: dict[str, Any] = {"type": "sensor_snapshot", "timestamp": None, "readings": {}}
RECENT_VALUES: dict[str, deque[float]] = defaultdict(lambda: deque(maxlen=120))
SIMULATOR_TASK: asyncio.Task | None = None


def _sensor_base_value(sensor_name: str) -> float:
    """Return the midpoint of a sensor's normal operating range."""
    normal_low, normal_high = SENSOR_THRESHOLDS[sensor_name]["normal_range"]
    return (normal_low + normal_high) / 2.0


def _sensor_amplitude(sensor_name: str) -> float:
    """Compute a smooth oscillation amplitude for each sensor."""
    normal_low, normal_high = SENSOR_THRESHOLDS[sensor_name]["normal_range"]
    return max((normal_high - normal_low) * 0.22, 0.1)


def _generate_sensor_value(sensor_name: str, tick: int, anomaly_boost: float = 0.0) -> float:
    """Generate one sensor sample with sine-wave behavior and gaussian noise."""
    phase_seed = (hash(sensor_name) % 17) / 5.0
    base = _sensor_base_value(sensor_name)
    amplitude = _sensor_amplitude(sensor_name)
    sinusoid = math.sin((tick / 8.0) + phase_seed) * amplitude
    noise = float(np.random.normal(0.0, amplitude * 0.18))
    value = base + sinusoid + noise + anomaly_boost
    return round(max(value, 0.0), 3)


async def _broadcast(payload: dict[str, Any]) -> None:
    """Broadcast sensor payload to all connected WebSocket clients."""
    disconnected: list[WebSocket] = []
    for client in list(CONNECTED_CLIENTS):
        try:
            await client.send_json(payload)
        except Exception:
            disconnected.append(client)

    for client in disconnected:
        await unregister_client(client)


def get_latest_sensor_payload() -> dict[str, Any]:
    """Return the latest generated sensor payload for API responses."""
    return LATEST_PAYLOAD


async def register_client(websocket: WebSocket) -> None:
    """Register an active WebSocket client and send the latest snapshot."""
    CONNECTED_CLIENTS.add(websocket)
    if LATEST_PAYLOAD.get("readings"):
        try:
            await websocket.send_json(LATEST_PAYLOAD)
        except Exception:
            await unregister_client(websocket)


async def unregister_client(websocket: WebSocket) -> None:
    """Safely remove a disconnected WebSocket client."""
    if websocket in CONNECTED_CLIENTS:
        CONNECTED_CLIENTS.remove(websocket)
    try:
        await websocket.close()
    except Exception:
        pass


async def _simulation_loop() -> None:
    """Produce sensor data every second and broadcast updates."""
    tick = 0
    next_anomaly_at = time.monotonic() + random.uniform(30, 60)
    anomaly_sensor: str | None = None
    anomaly_steps_left = 0
    anomaly_multiplier = 0.0

    while True:
        try:
            now = time.monotonic()
            if now >= next_anomaly_at:
                anomaly_sensor = random.choice(list(SENSOR_THRESHOLDS.keys()))
                anomaly_steps_left = random.randint(2, 6)
                anomaly_multiplier = random.uniform(1.8, 3.4)
                next_anomaly_at = now + random.uniform(30, 60)

            readings: dict[str, Any] = {}
            for sensor_name, cfg in SENSOR_THRESHOLDS.items():
                anomaly_boost = 0.0
                if anomaly_sensor == sensor_name and anomaly_steps_left > 0:
                    direction = random.choice([-1.0, 1.0])
                    anomaly_boost = direction * _sensor_amplitude(sensor_name) * anomaly_multiplier

                value = _generate_sensor_value(sensor_name=sensor_name, tick=tick, anomaly_boost=anomaly_boost)
                severity = detect_anomaly(sensor_name, value)

                RECENT_VALUES[sensor_name].append(value)
                failure = predict_failure(sensor_name, list(RECENT_VALUES[sensor_name]))

                timestamp = datetime.now(timezone.utc).isoformat()
                insert_reading(
                    sensor_name=sensor_name,
                    value=value,
                    unit=cfg["unit"],
                    severity=severity,
                    timestamp=timestamp,
                )

                readings[sensor_name] = {
                    "sensor_name": sensor_name,
                    "value": value,
                    "unit": cfg["unit"],
                    "severity": severity,
                    "timestamp": timestamp,
                    "normal_range": cfg["normal_range"],
                    "warning_range": cfg["warning_range"],
                    "critical_range": cfg["critical_range"],
                    "failure_risk_percent": failure["risk_percent"],
                    "failure_message": failure["message"],
                }

            if anomaly_steps_left > 0:
                anomaly_steps_left -= 1

            payload = {
                "type": "sensor_update",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "readings": readings,
            }
            LATEST_PAYLOAD.update(payload)
            await _broadcast(payload)

            tick += 1
            await asyncio.sleep(1)
        except asyncio.CancelledError:
            raise
        except Exception:
            await asyncio.sleep(1)


async def start_sensor_simulator() -> None:
    """Start simulator task if it is not already running."""
    global SIMULATOR_TASK
    if SIMULATOR_TASK and not SIMULATOR_TASK.done():
        return
    SIMULATOR_TASK = asyncio.create_task(_simulation_loop(), name="industrialmind-simulator")


async def stop_sensor_simulator() -> None:
    """Stop simulator task and close WebSocket clients."""
    global SIMULATOR_TASK
    if SIMULATOR_TASK and not SIMULATOR_TASK.done():
        SIMULATOR_TASK.cancel()
        try:
            await SIMULATOR_TASK
        except asyncio.CancelledError:
            pass
    SIMULATOR_TASK = None

    for client in list(CONNECTED_CLIENTS):
        await unregister_client(client)

