import { useEffect, useMemo, useRef, useState } from "react";

const SENSOR_KEYS = ["temperature", "pressure", "vibration", "motor_rpm"];

/**
 * Resolves the WebSocket endpoint from env with a browser-based fallback.
 * @returns {string}
 */
function resolveWebSocketUrl() {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.hostname}:8000/ws/sensors`;
}

/**
 * Creates an empty sensor buffer object.
 * @returns {Record<string, Array<Record<string, any>>>}
 */
function createInitialBuffer() {
  return SENSOR_KEYS.reduce((acc, key) => {
    acc[key] = [];
    return acc;
  }, {});
}

/**
 * Appends one reading while keeping a rolling max size.
 * @param {Array<Record<string, any>>} existing
 * @param {Record<string, any>} nextReading
 * @param {number} maxLength
 * @returns {Array<Record<string, any>>}
 */
function appendRolling(existing, nextReading, maxLength) {
  const merged = [...existing, nextReading];
  return merged.slice(Math.max(merged.length - maxLength, 0));
}

/**
 * Maintains real-time sensor stream with reconnection and a 60-point rolling buffer.
 * @returns {{ sensorData: Record<string, Array<Record<string, any>>>, connectionStatus: string, lastUpdated: string | null, error: string | null }}
 */
export function useWebSocket() {
  const [sensorData, setSensorData] = useState(() => createInitialBuffer());
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const retriesRef = useRef(0);
  const shouldReconnectRef = useRef(true);

  const wsUrl = useMemo(() => resolveWebSocketUrl(), []);

  /**
   * Connects to backend WebSocket and wires event handlers.
   * @returns {void}
   */
  function connect() {
    if (!wsUrl) {
      setConnectionStatus("config-error");
      setError("VITE_WS_URL is missing.");
      return;
    }

    setConnectionStatus(retriesRef.current > 0 ? "reconnecting" : "connecting");

    try {
      wsRef.current = new WebSocket(wsUrl);
    } catch (connectionError) {
      setConnectionStatus("offline");
      setError("Failed to initialize WebSocket connection.");
      scheduleReconnect();
      return;
    }

    wsRef.current.onopen = () => {
      retriesRef.current = 0;
      setConnectionStatus("connected");
      setError(null);
    };

    wsRef.current.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (!payload?.readings) {
          return;
        }

        setSensorData((prev) => {
          const next = { ...prev };
          SENSOR_KEYS.forEach((sensorKey) => {
            const reading = payload.readings[sensorKey];
            if (!reading) {
              return;
            }
            next[sensorKey] = appendRolling(
              prev[sensorKey] ?? [],
              {
                timestamp: reading.timestamp ?? payload.timestamp ?? new Date().toISOString(),
                value: Number(reading.value),
                severity: reading.severity ?? "normal",
                unit: reading.unit ?? "",
                normalRange: reading.normal_range ?? null,
                warningRange: reading.warning_range ?? null,
                criticalRange: reading.critical_range ?? null,
                failureRiskPercent: reading.failure_risk_percent ?? null,
                failureMessage: reading.failure_message ?? "",
              },
              60,
            );
          });
          return next;
        });

        setLastUpdated(payload.timestamp ?? new Date().toISOString());
      } catch (parseError) {
        setError("Received invalid sensor payload.");
      }
    };

    wsRef.current.onerror = () => {
      setConnectionStatus("offline");
      setError("WebSocket stream interrupted.");
    };

    wsRef.current.onclose = () => {
      if (!shouldReconnectRef.current) {
        return;
      }
      setConnectionStatus("reconnecting");
      scheduleReconnect();
    };
  }

  /**
   * Schedules the next reconnect attempt with exponential backoff.
   * @returns {void}
   */
  function scheduleReconnect() {
    retriesRef.current += 1;
    const delayMs = Math.min(1000 * 2 ** retriesRef.current, 30000);
    reconnectTimeoutRef.current = window.setTimeout(() => {
      connect();
    }, delayMs);
  }

  useEffect(() => {
    connect();
    return () => {
      shouldReconnectRef.current = false;
      if (reconnectTimeoutRef.current) {
        window.clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [wsUrl]);

  return { sensorData, connectionStatus, lastUpdated, error };
}

