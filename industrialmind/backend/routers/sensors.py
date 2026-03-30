"""Sensor API and WebSocket router."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query, WebSocket, WebSocketDisconnect

from db.sqlite_client import get_history, get_latest
from services.anomaly_detector import SENSOR_THRESHOLDS
from services.sensor_simulator import get_latest_sensor_payload, register_client, unregister_client

router = APIRouter(tags=["sensors"])


@router.get("/sensors/latest")
async def latest_sensors() -> dict:
    """Return latest reading for all configured sensors."""
    try:
        live_payload = get_latest_sensor_payload()
        if live_payload.get("readings"):
            return live_payload

        latest = get_latest()
        readings = {}
        for sensor_name, thresholds in SENSOR_THRESHOLDS.items():
            row = latest.get(sensor_name)
            if row:
                readings[sensor_name] = {
                    "sensor_name": sensor_name,
                    "value": row["value"],
                    "unit": row["unit"],
                    "severity": row["severity"],
                    "timestamp": row["timestamp"],
                    "normal_range": thresholds["normal_range"],
                    "warning_range": thresholds["warning_range"],
                    "critical_range": thresholds["critical_range"],
                }
        return {
            "type": "sensor_snapshot",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "readings": readings,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unable to get latest sensors: {exc}") from exc


@router.get("/sensors/history")
async def sensor_history(
    sensor: str = Query(..., description="Sensor key, e.g. temperature"),
    limit: int = Query(100, ge=1, le=1000),
) -> dict:
    """Return historical records for a specific sensor from SQLite."""
    try:
        if sensor not in SENSOR_THRESHOLDS:
            raise HTTPException(status_code=400, detail=f"Unknown sensor '{sensor}'")
        history = get_history(sensor=sensor, limit=limit)
        return {"sensor": sensor, "count": len(history), "readings": history}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unable to get sensor history: {exc}") from exc


@router.websocket("/ws/sensors")
async def sensors_ws(websocket: WebSocket) -> None:
    """Stream real-time sensor updates to connected clients."""
    await websocket.accept()
    try:
        await register_client(websocket)
        while True:
            await asyncio.sleep(15)
            await websocket.send_json(
                {
                    "type": "heartbeat",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            )
    except WebSocketDisconnect:
        await unregister_client(websocket)
    except Exception:
        await unregister_client(websocket)

