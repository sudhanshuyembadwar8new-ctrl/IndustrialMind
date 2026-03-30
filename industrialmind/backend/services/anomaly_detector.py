"""Anomaly detection and simple failure prediction utilities."""

from __future__ import annotations

from typing import Literal

import numpy as np
from scipy import stats

Severity = Literal["normal", "warning", "critical"]

SENSOR_THRESHOLDS = {
    "temperature": {
        "unit": "°C",
        "normal_range": (68.0, 82.0),
        "warning_range": (60.0, 90.0),
        "critical_range": (50.0, 105.0),
    },
    "pressure": {
        "unit": "bar",
        "normal_range": (18.0, 24.0),
        "warning_range": (15.0, 27.0),
        "critical_range": (12.0, 30.0),
    },
    "vibration": {
        "unit": "mm/s",
        "normal_range": (1.0, 4.0),
        "warning_range": (0.5, 6.0),
        "critical_range": (0.0, 8.0),
    },
    "motor_rpm": {
        "unit": "rpm",
        "normal_range": (1450.0, 1650.0),
        "warning_range": (1350.0, 1750.0),
        "critical_range": (1200.0, 1900.0),
    },
}


def detect_anomaly(sensor_name: str, value: float) -> Severity:
    """Classify a reading into normal, warning, or critical bands."""
    try:
        ranges = SENSOR_THRESHOLDS[sensor_name]
        normal_min, normal_max = ranges["normal_range"]
        warning_min, warning_max = ranges["warning_range"]

        if normal_min <= value <= normal_max:
            return "normal"
        if warning_min <= value <= warning_max:
            return "warning"
        return "critical"
    except Exception:
        return "critical"


def predict_failure(sensor_name: str, recent_values: list[float]) -> dict[str, int | str]:
    """Estimate failure risk based on linear trend, variance, and critical proximity."""
    try:
        if not recent_values:
            return {"risk_percent": 5, "message": "Insufficient data for prediction."}

        ranges = SENSOR_THRESHOLDS[sensor_name]
        normal_low, normal_high = ranges["normal_range"]
        critical_low, critical_high = ranges["critical_range"]

        window = np.array(recent_values[-30:], dtype=float)
        x_axis = np.arange(len(window))

        slope = 0.0
        if len(window) >= 2:
            slope = float(stats.linregress(x_axis, window).slope)

        volatility = float(np.std(window))
        current = float(window[-1])

        normal_span = max(normal_high - normal_low, 1e-6)
        critical_span = max(critical_high - critical_low, 1e-6)

        slope_scale = max(normal_span / 30.0, 1e-6)
        slope_score = min(abs(slope) / slope_scale * 45.0, 45.0)

        if current <= critical_low or current >= critical_high:
            proximity_score = 40.0
        else:
            center = (critical_low + critical_high) / 2.0
            distance_from_center = abs(current - center) / (critical_span / 2.0)
            proximity_score = max(0.0, min(distance_from_center * 40.0, 40.0))

        volatility_scale = max(normal_span / 8.0, 1e-6)
        volatility_score = min(volatility / volatility_scale * 15.0, 15.0)

        risk_percent = int(max(1.0, min(99.0, slope_score + proximity_score + volatility_score)))

        if risk_percent >= 80:
            message = "High failure probability. Immediate inspection recommended."
        elif risk_percent >= 60:
            message = "Elevated failure risk. Schedule maintenance soon."
        elif risk_percent >= 35:
            message = "Moderate risk trend detected. Keep monitoring closely."
        else:
            message = "Low risk. Sensor behavior remains stable."

        return {"risk_percent": risk_percent, "message": message}
    except Exception:
        return {"risk_percent": 0, "message": "Prediction unavailable due to data quality issues."}

