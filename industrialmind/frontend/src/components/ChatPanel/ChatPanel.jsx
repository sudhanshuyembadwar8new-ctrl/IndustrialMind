import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControlLabel,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

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
 * Appends text with a typewriter effect.
 * @param {string} text
 * @param {(next: string) => void} onTick
 * @returns {Promise<void>}
 */
function typewriter(text, onTick) {
  return new Promise((resolve) => {
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      onTick(text.slice(0, index));
      if (index >= text.length) {
        window.clearInterval(timer);
        resolve();
      }
    }, 14);
  });
}

/**
 * Floating chat panel for AI Q&A over live telemetry.
 * @returns {JSX.Element}
 */
export default function ChatPanel() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [includeSensorContext, setIncludeSensorContext] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const listRef = useRef(null);
  const apiBaseUrl = useMemo(() => resolveApiBaseUrl(), []);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  /**
   * Sends user input to backend chat endpoint.
   * @returns {Promise<void>}
   */
  async function handleSend() {
    const message = input.trim();
    if (!message || loading) {
      return;
    }

    setLoading(true);
    setError(null);
    setInput("");

    const userMessage = { role: "user", content: message };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const conversationHistory = messages.map((item) => ({
        role: item.role,
        content: item.content,
      }));

      const response = await fetch(`${apiBaseUrl}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          conversation_history: conversationHistory,
          include_sensor_context: includeSensorContext,
        }),
      });

      if (!response.ok) {
        throw new Error(`Chat request failed (${response.status})`);
      }

      const payload = await response.json();
      const assistantDraft = {
        role: "assistant",
        content: "",
        provider: payload.provider,
        latency_ms: payload.latency_ms,
      };
      setMessages((prev) => [...prev, assistantDraft]);

      await typewriter(payload.response, (streamedText) => {
        setMessages((prev) => {
          const copy = [...prev];
          const lastIndex = copy.length - 1;
          if (lastIndex >= 0 && copy[lastIndex].role === "assistant") {
            copy[lastIndex] = { ...copy[lastIndex], content: streamedText };
          }
          return copy;
        });
      });
    } catch (requestError) {
      setError("Chat service unavailable. Reconnecting...");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box sx={{ p: 3, minHeight: "calc(100vh - 84px)", position: "relative" }}>
      <Paper
        sx={{
          position: { xs: "relative", lg: "absolute" },
          right: 24,
          top: 24,
          bottom: 24,
          width: { xs: "100%", lg: 460 },
          p: 2,
          display: "flex",
          flexDirection: "column",
          background: "rgba(22,27,34,0.82)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 20px 45px rgba(0,0,0,0.35)",
        }}
      >
        <Typography variant="h5" sx={{ mb: 1 }}>
          AI Copilot Chat
        </Typography>

        <FormControlLabel
          control={
            <Checkbox
              checked={includeSensorContext}
              onChange={(event) => setIncludeSensorContext(event.target.checked)}
            />
          }
          label="Include live sensor context"
          sx={{ mb: 1 }}
        />

        {error && (
          <Alert severity="warning" sx={{ mb: 1 }}>
            {error}
          </Alert>
        )}

        <Stack ref={listRef} spacing={1} sx={{ flex: 1, overflowY: "auto", pr: 1, mb: 2 }}>
          {messages.length === 0 && (
            <Alert severity="info">Ask about sensor behavior, anomalies, or maintenance recommendations.</Alert>
          )}
          {messages.map((msg, index) => (
            <Box
              key={`${msg.role}-${index}`}
              sx={{
                alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "88%",
                p: 1.2,
                borderRadius: 2,
                backgroundColor: msg.role === "user" ? "rgba(0,212,255,0.2)" : "rgba(255,107,53,0.16)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              <Typography sx={{ whiteSpace: "pre-wrap" }}>{msg.content || (loading ? "..." : "")}</Typography>
              {msg.role === "assistant" && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
                  <Chip
                    size="small"
                    label={(msg.provider ?? "unknown").toUpperCase()}
                    color={msg.provider === "groq" ? "primary" : "secondary"}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {msg.latency_ms ?? "--"} ms
                  </Typography>
                </Box>
              )}
            </Box>
          ))}
        </Stack>

        <Stack direction="row" spacing={1}>
          <TextField
            fullWidth
            size="small"
            placeholder="Ask IndustrialMind..."
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleSend();
              }
            }}
            disabled={loading}
          />
          <Button variant="contained" onClick={handleSend} disabled={loading || !input.trim()}>
            {loading ? <CircularProgress size={20} color="inherit" /> : "Send"}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}

