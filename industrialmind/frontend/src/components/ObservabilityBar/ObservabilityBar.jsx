import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Chip, LinearProgress, Stack, Typography } from "@mui/material";

/**
 * Resolves API base URL from environment with browser fallback.
 * @returns {string}
 */
function resolveApiBaseUrl() {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  return `${window.location.protocol}//${window.location.hostname}:8000`;
}

/**
 * Dot status indicator component.
 * @param {{ ok: boolean }} props
 * @returns {JSX.Element}
 */
function StatusDot({ ok }) {
  return (
    <Box
      sx={{
        width: 10,
        height: 10,
        borderRadius: "50%",
        backgroundColor: ok ? "#22c55e" : "#ff4444",
        boxShadow: ok ? "0 0 10px rgba(34,197,94,0.6)" : "0 0 10px rgba(255,68,68,0.6)",
      }}
    />
  );
}

/**
 * Slim top observability bar with provider health and LLM usage metrics.
 * @returns {JSX.Element}
 */
export default function ObservabilityBar() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [health, setHealth] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const apiBaseUrl = useMemo(() => resolveApiBaseUrl(), []);

  useEffect(() => {
    let active = true;

    /**
     * Loads health and metrics in parallel.
     * @returns {Promise<void>}
     */
    async function fetchData() {
      try {
        const [healthResponse, metricsResponse] = await Promise.all([
          fetch(`${apiBaseUrl}/health`),
          fetch(`${apiBaseUrl}/metrics`),
        ]);

        if (!healthResponse.ok || !metricsResponse.ok) {
          throw new Error("Observability endpoints unavailable");
        }

        const [healthPayload, metricsPayload] = await Promise.all([healthResponse.json(), metricsResponse.json()]);
        if (!active) {
          return;
        }
        setHealth(healthPayload);
        setMetrics(metricsPayload);
        setError(null);
      } catch (fetchError) {
        if (!active) {
          return;
        }
        setError("Observability offline. Reconnecting...");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchData();
    const timer = window.setInterval(fetchData, 10000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [apiBaseUrl]);

  return (
    <Box
      sx={{
        px: 2,
        py: 1,
        borderBottom: "1px solid rgba(255,255,255,0.1)",
        background: "linear-gradient(90deg, rgba(13,17,23,0.9), rgba(22,27,34,0.95))",
      }}
    >
      {loading && <LinearProgress sx={{ mb: 1 }} />}

      {error && (
        <Alert severity="warning" sx={{ mb: 1 }}>
          {error}
        </Alert>
      )}

      <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "flex-start", md: "center" }}>
        <Stack direction="row" spacing={0.8} alignItems="center">
          <StatusDot ok={Boolean(health?.components?.groq?.reachable)} />
          <Typography variant="body2">Groq</Typography>
        </Stack>
        <Stack direction="row" spacing={0.8} alignItems="center">
          <StatusDot ok={Boolean(health?.components?.ollama?.reachable)} />
          <Typography variant="body2">Ollama</Typography>
        </Stack>
        <Chip
          size="small"
          label={`Last Latency: ${metrics?.last_latency_ms ?? "--"} ms`}
          color="primary"
          variant="outlined"
        />
        <Chip
          size="small"
          label={`Provider: ${(metrics?.active_provider ?? "unknown").toUpperCase()}`}
          color="secondary"
          variant="outlined"
        />
        <Typography variant="body2">Requests Today: {metrics?.total_requests_today ?? 0}</Typography>
      </Stack>
    </Box>
  );
}

