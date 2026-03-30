import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Chip, Paper, Stack, Typography } from "@mui/material";

/**
 * Returns glow style based on alert severity.
 * @param {string} severity
 * @returns {object}
 */
function severityStyle(severity) {
  if (severity === "critical") {
    return {
      borderColor: "rgba(255,68,68,0.7)",
      boxShadow: "0 0 20px rgba(255,68,68,0.6)",
      background: "linear-gradient(135deg, rgba(255,68,68,0.18), rgba(22,27,34,0.9))",
    };
  }
  if (severity === "warning") {
    return {
      borderColor: "rgba(255,165,0,0.7)",
      boxShadow: "0 0 20px rgba(255,165,0,0.4)",
      background: "linear-gradient(135deg, rgba(255,165,0,0.14), rgba(22,27,34,0.9))",
    };
  }
  return {
    borderColor: "rgba(255,255,255,0.15)",
    boxShadow: "none",
    background: "rgba(22,27,34,0.9)",
  };
}

/**
 * Live anomaly alert stream with severity glow styles.
 * @param {{ anomalies: Array<Record<string, any>> }} props
 * @returns {JSX.Element}
 */
export default function AlertsPanel({ anomalies = [] }) {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    setAlerts((previous) => {
      const merged = [...previous];
      anomalies.forEach((anomaly) => {
        const existing = merged.find((item) => item.sensorName === anomaly.sensorName);
        const isNewState = !existing || existing.severity !== anomaly.severity || existing.currentValue !== anomaly.currentValue;
        if (isNewState) {
          merged.unshift({ ...anomaly, createdAt: Date.now() });
        }
      });
      return merged.slice(0, 16);
    });
  }, [anomalies]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now();
      setAlerts((previous) =>
        previous.filter((item) => !(item.severity === "normal" && now - item.createdAt > 10000)),
      );
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const visibleAlerts = useMemo(() => alerts.filter((item) => item.severity !== "normal"), [alerts]);

  return (
    <Paper
      sx={{
        p: 2,
        background: "rgba(22,27,34,0.75)",
        border: "1px solid rgba(255,255,255,0.1)",
        backdropFilter: "blur(10px)",
        minHeight: 260,
      }}
    >
      <Typography variant="h6" sx={{ mb: 1.5 }}>
        Real-Time Alerts
      </Typography>

      {visibleAlerts.length === 0 && (
        <Alert severity="success" sx={{ backgroundColor: "rgba(34,197,94,0.15)" }}>
          No active anomalies. System operating normally.
        </Alert>
      )}

      <Stack spacing={1.2}>
        {visibleAlerts.map((alertItem, index) => (
          <Box
            key={`${alertItem.sensorName}-${alertItem.timestamp}-${index}`}
            sx={{
              p: 1.2,
              border: "1px solid",
              borderRadius: 2,
              ...severityStyle(alertItem.severity),
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
              <Typography sx={{ fontWeight: 700, textTransform: "capitalize" }}>
                {alertItem.sensorName.replace("_", " ")}
              </Typography>
              <Chip
                size="small"
                label={`${alertItem.severity.toUpperCase()} • Risk ${alertItem.failureRiskPercent ?? 0}%`}
                color={alertItem.severity === "critical" ? "error" : "warning"}
              />
            </Box>
            <Typography variant="body2">
              Value: {alertItem.currentValue} | Threshold: {alertItem.threshold}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {alertItem.aiExplanation}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {new Date(alertItem.timestamp).toLocaleString()}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Paper>
  );
}

