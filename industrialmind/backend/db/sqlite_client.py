"""SQLite client for sensor history persistence."""

from __future__ import annotations

import sqlite3
import threading
from pathlib import Path
from typing import Any

DB_PATH = Path(__file__).resolve().parents[1] / "industrialmind.db"
_LOCK = threading.Lock()


def _connect() -> sqlite3.Connection:
    """Create a SQLite connection with row factory enabled."""
    connection = sqlite3.connect(DB_PATH, check_same_thread=False)
    connection.row_factory = sqlite3.Row
    return connection


def init_db() -> None:
    """Initialize SQLite tables and indexes."""
    try:
        with _LOCK:
            conn = _connect()
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS sensor_readings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    sensor_name TEXT NOT NULL,
                    value REAL NOT NULL,
                    unit TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    timestamp TEXT NOT NULL
                )
                """
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_sensor_time ON sensor_readings(sensor_name, timestamp)"
            )
            conn.commit()
            conn.close()
    except Exception as exc:
        raise RuntimeError(f"SQLite init failed: {exc}") from exc


def insert_reading(sensor_name: str, value: float, unit: str, severity: str, timestamp: str) -> None:
    """Insert one sensor reading row."""
    try:
        with _LOCK:
            conn = _connect()
            conn.execute(
                """
                INSERT INTO sensor_readings(sensor_name, value, unit, severity, timestamp)
                VALUES (?, ?, ?, ?, ?)
                """,
                (sensor_name, value, unit, severity, timestamp),
            )
            conn.commit()
            conn.close()
    except Exception as exc:
        raise RuntimeError(f"Insert reading failed: {exc}") from exc


def get_history(sensor: str, limit: int = 100) -> list[dict[str, Any]]:
    """Fetch latest N rows for a sensor in chronological order."""
    try:
        with _LOCK:
            conn = _connect()
            rows = conn.execute(
                """
                SELECT sensor_name, value, unit, severity, timestamp
                FROM sensor_readings
                WHERE sensor_name = ?
                ORDER BY id DESC
                LIMIT ?
                """,
                (sensor, limit),
            ).fetchall()
            conn.close()

        history = [
            {
                "sensor_name": row["sensor_name"],
                "value": row["value"],
                "unit": row["unit"],
                "severity": row["severity"],
                "timestamp": row["timestamp"],
            }
            for row in rows
        ]
        history.reverse()
        return history
    except Exception as exc:
        raise RuntimeError(f"Get history failed: {exc}") from exc


def get_latest() -> dict[str, dict[str, Any]]:
    """Fetch the latest reading per sensor."""
    try:
        with _LOCK:
            conn = _connect()
            rows = conn.execute(
                """
                SELECT sr.sensor_name, sr.value, sr.unit, sr.severity, sr.timestamp
                FROM sensor_readings sr
                INNER JOIN (
                    SELECT sensor_name, MAX(id) AS max_id
                    FROM sensor_readings
                    GROUP BY sensor_name
                ) latest ON sr.id = latest.max_id
                """
            ).fetchall()
            conn.close()

        return {
            row["sensor_name"]: {
                "value": row["value"],
                "unit": row["unit"],
                "severity": row["severity"],
                "timestamp": row["timestamp"],
            }
            for row in rows
        }
    except Exception as exc:
        raise RuntimeError(f"Get latest failed: {exc}") from exc


def check_sqlite_health() -> tuple[bool, str | None]:
    """Perform lightweight SQLite health query."""
    try:
        with _LOCK:
            conn = _connect()
            _ = conn.execute("SELECT 1").fetchone()
            conn.close()
        return True, None
    except Exception as exc:
        return False, str(exc)

