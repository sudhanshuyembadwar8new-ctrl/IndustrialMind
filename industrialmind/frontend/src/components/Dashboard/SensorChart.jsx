import { Box, Chip, Typography } from "@mui/material";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const SEVERITY_COLORS = {
  normal: "#ff6b35",
  warning: "#ffd166",
  critical: "#ff4444",
};

/**
 * Formats an ISO timestamp for compact chart axis display.
 * @param {string} isoTime
 * @returns {string}
 */
function formatTime(isoTime) {
  if (!isoTime) {
    return "--";
  }
  return new Date(isoTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

/**
 * Renders one live sensor chart with severity-aware color and range overlays.
 * @param {{ sensorName: string, data: Array<Record<string, any>>, unit: string, normalRange: [number, number], warningRange: [number, number] }} props
 * @returns {JSX.Element}
 */
export default function SensorChart({ sensorName, data, unit, normalRange, warningRange }) {
  const series = data
    .map((point) => ({
      time: formatTime(point.timestamp),
      value: point[sensorName],
      severity: point[`${sensorName}_severity`] ?? "normal",
    }))
    .filter((point) => typeof point.value === "number");

  const latest = series[series.length - 1];
  const severity = latest?.severity ?? "normal";
  const lineColor = SEVERITY_COLORS[severity] ?? SEVERITY_COLORS.normal;

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", gap: 1 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h6" sx={{ textTransform: "capitalize", fontWeight: 700 }}>
          {sensorName.replace("_", " ")}
        </Typography>
        <Chip
          size="small"
          label={severity.toUpperCase()}
          sx={{
            backgroundColor: `${lineColor}20`,
            color: lineColor,
            border: `1px solid ${lineColor}66`,
            fontWeight: 700,
          }}
        />
      </Box>

      <Typography variant="h4" sx={{ color: lineColor, lineHeight: 1 }}>
        {latest ? `${latest.value.toFixed(2)} ${unit}` : "--"}
      </Typography>

      <Box sx={{ flex: 1, minHeight: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series}>
            <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="time" tick={{ fill: "#9aa4b2", fontSize: 11 }} minTickGap={26} />
            <YAxis tick={{ fill: "#9aa4b2", fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                background: "rgba(22,27,34,0.9)",
                border: "1px solid rgba(255,255,255,0.15)",
                backdropFilter: "blur(10px)",
              }}
            />
            <ReferenceArea y1={warningRange[0]} y2={normalRange[0]} fill="#ffd16622" />
            <ReferenceArea y1={normalRange[1]} y2={warningRange[1]} fill="#ffd16622" />
            <Line
              type="monotone"
              dataKey="value"
              stroke={lineColor}
              strokeWidth={3}
              dot={false}
              isAnimationActive
              animationDuration={500}
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
}

