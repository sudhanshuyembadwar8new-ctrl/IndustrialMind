import { Alert, Box, Chip, Grid, Paper, Skeleton, Typography } from "@mui/material";
import SensorChart from "./SensorChart";

const SENSOR_CONFIG = {
  temperature: { unit: "°C", normalRange: [68, 82], warningRange: [60, 90] },
  pressure: { unit: "bar", normalRange: [18, 24], warningRange: [15, 27] },
  vibration: { unit: "mm/s", normalRange: [1, 4], warningRange: [0.5, 6] },
  motor_rpm: { unit: "rpm", normalRange: [1450, 1650], warningRange: [1350, 1750] },
};

/**
 * Resolves status chip color for current socket state.
 * @param {string} status
 * @returns {string}
 */
function statusColor(status) {
  if (status === "connected") {
    return "#22c55e";
  }
  if (status === "reconnecting" || status === "connecting") {
    return "#f59e0b";
  }
  return "#ff4444";
}

/**
 * Renders live IndustrialMind 2x2 sensor dashboard.
 * @param {{ chartData: Array<Record<string, any>>, connectionStatus: string, lastUpdated: string | null, error: string | null }} props
 * @returns {JSX.Element}
 */
export default function Dashboard({ chartData, connectionStatus, lastUpdated, error }) {
  const hasData = chartData.length > 0;
  const reconnecting = connectionStatus !== "connected";

  return (
    <Box sx={{ p: 3, position: "relative" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h4">Industrial Sensor Grid</Typography>
        <Chip
          label={`${connectionStatus.toUpperCase()}${lastUpdated ? ` • ${new Date(lastUpdated).toLocaleTimeString()}` : ""}`}
          sx={{
            color: statusColor(connectionStatus),
            border: `1px solid ${statusColor(connectionStatus)}66`,
            backgroundColor: `${statusColor(connectionStatus)}1A`,
            fontWeight: 700,
          }}
        />
      </Box>

      {error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {error} Reconnecting...
        </Alert>
      )}

      <Grid container spacing={2}>
        {Object.entries(SENSOR_CONFIG).map(([sensorName, cfg]) => (
          <Grid key={sensorName} item xs={12} md={6}>
            <Paper
              sx={{
                p: 2,
                height: 360,
                background: "rgba(22,27,34,0.8)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 16px 40px rgba(0,0,0,0.25)",
              }}
            >
              {!hasData && reconnecting ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Skeleton variant="text" width={180} height={44} />
                  <Skeleton variant="text" width={120} height={58} />
                  <Skeleton variant="rectangular" height={220} />
                </Box>
              ) : (
                <SensorChart
                  sensorName={sensorName}
                  data={chartData}
                  unit={cfg.unit}
                  normalRange={cfg.normalRange}
                  warningRange={cfg.warningRange}
                />
              )}
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

