import { useMemo } from "react";
import { useWebSocket } from "./useWebSocket";

const SENSOR_KEYS = ["temperature", "pressure", "vibration", "motor_rpm"];

/**
 * Calculates summary stats for a numeric series.
 * @param {Array<Record<string, any>>} points
 * @returns {{ current: number | null, min: number | null, max: number | null, avg: number | null, severity: string }}
 */
function calculateStats(points) {
  if (!points.length) {
    return { current: null, min: null, max: null, avg: null, severity: "unknown" };
  }
  const values = points.map((point) => Number(point.value));
  const sum = values.reduce((acc, value) => acc + value, 0);
  const currentPoint = points[points.length - 1];
  return {
    current: Number(currentPoint.value),
    min: Math.min(...values),
    max: Math.max(...values),
    avg: Number((sum / values.length).toFixed(2)),
    severity: currentPoint.severity ?? "normal",
  };
}

/**
 * Builds dashboard chart points from per-sensor rolling buffers.
 * @param {Record<string, Array<Record<string, any>>>} sensorData
 * @returns {Array<Record<string, any>>}
 */
function buildChartData(sensorData) {
  const maxLen = Math.max(...SENSOR_KEYS.map((key) => sensorData[key]?.length ?? 0), 0);
  if (maxLen === 0) {
    return [];
  }

  const rows = [];
  for (let index = 0; index < maxLen; index += 1) {
    const row = {};
    SENSOR_KEYS.forEach((key) => {
      const source = sensorData[key] ?? [];
      const offset = source.length - maxLen + index;
      if (offset >= 0 && source[offset]) {
        row.timestamp = source[offset].timestamp;
        row[key] = source[offset].value;
        row[`${key}_severity`] = source[offset].severity;
      }
    });
    rows.push(row);
  }

  return rows;
}

/**
 * Converts latest readings into alert-friendly anomaly records.
 * @param {Record<string, Array<Record<string, any>>>} sensorData
 * @returns {Array<Record<string, any>>}
 */
function buildAnomalies(sensorData) {
  return SENSOR_KEYS.map((sensorName) => {
    const points = sensorData[sensorName] ?? [];
    const latest = points[points.length - 1];
    if (!latest) {
      return null;
    }

    const thresholdText =
      latest.severity === "critical"
        ? `${latest.criticalRange?.[0]} - ${latest.criticalRange?.[1]}`
        : `${latest.warningRange?.[0]} - ${latest.warningRange?.[1]}`;

    const explanation =
      latest.failureMessage ||
      (latest.severity === "critical"
        ? "Critical out-of-range value detected."
        : latest.severity === "warning"
          ? "Approaching unsafe operating limits."
          : "Reading is within normal tolerance.");

    return {
      sensorName,
      currentValue: Number(latest.value),
      threshold: thresholdText,
      severity: latest.severity ?? "normal",
      aiExplanation: explanation,
      timestamp: latest.timestamp,
      failureRiskPercent: latest.failureRiskPercent ?? 0,
    };
  })
    .filter(Boolean)
    .sort((a, b) => {
      const severityRank = { critical: 3, warning: 2, normal: 1 };
      return severityRank[b.severity] - severityRank[a.severity];
    });
}

/**
 * Provides formatted chart data, anomaly records, and summary stats.
 * @returns {{ chartData: Array<Record<string, any>>, anomalies: Array<Record<string, any>>, stats: Record<string, any>, connectionStatus: string, lastUpdated: string | null, error: string | null, sensorData: Record<string, Array<Record<string, any>>> }}
 */
export function useSensorStream() {
  const { sensorData, connectionStatus, lastUpdated, error } = useWebSocket();

  const chartData = useMemo(() => buildChartData(sensorData), [sensorData]);

  const anomalies = useMemo(() => buildAnomalies(sensorData), [sensorData]);

  const stats = useMemo(
    () =>
      SENSOR_KEYS.reduce((acc, key) => {
        acc[key] = calculateStats(sensorData[key] ?? []);
        return acc;
      }, {}),
    [sensorData],
  );

  return { chartData, anomalies, stats, connectionStatus, lastUpdated, error, sensorData };
}

