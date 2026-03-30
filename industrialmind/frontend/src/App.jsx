import { useMemo } from "react";
import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";
import {
  Alert,
  Box,
  CssBaseline,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  ThemeProvider,
  Typography,
} from "@mui/material";

import AlertsPanel from "./components/AlertsPanel/AlertsPanel";
import ChatPanel from "./components/ChatPanel/ChatPanel";
import Dashboard from "./components/Dashboard/Dashboard";
import ObservabilityBar from "./components/ObservabilityBar/ObservabilityBar";
import RAGUploader from "./components/RAGUploader/RAGUploader";
import { useSensorStream } from "./hooks/useSensorStream";
import { darkIndustrialTheme } from "./theme/darkIndustrial";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/" },
  { label: "Chat", path: "/chat" },
  { label: "RAG Upload", path: "/rag" },
  { label: "Observability", path: "/observability" },
];

/**
 * Sidebar navigation shell.
 * @returns {JSX.Element}
 */
function Sidebar() {
  return (
    <Box
      sx={{
        width: 250,
        borderRight: "1px solid rgba(255,255,255,0.08)",
        background: "linear-gradient(180deg, rgba(22,27,34,0.95), rgba(13,17,23,0.95))",
        p: 2,
      }}
    >
      <Typography variant="h5" sx={{ mb: 2, color: "primary.main", fontWeight: 800 }}>
        IndustrialMind
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        AI Industrial IoT Brain
      </Typography>
      <List disablePadding>
        {NAV_ITEMS.map((item) => (
          <ListItemButton
            key={item.path}
            component={NavLink}
            to={item.path}
            sx={{
              borderRadius: 2,
              mb: 0.7,
              "&.active": {
                background: "rgba(255,107,53,0.2)",
                border: "1px solid rgba(255,107,53,0.5)",
              },
            }}
          >
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
}

/**
 * Dashboard page with live charts and alerts.
 * @param {{ stream: ReturnType<typeof useSensorStream> }} props
 * @returns {JSX.Element}
 */
function DashboardPage({ stream }) {
  return (
    <Box sx={{ p: 2 }}>
      <Dashboard
        chartData={stream.chartData}
        connectionStatus={stream.connectionStatus}
        lastUpdated={stream.lastUpdated}
        error={stream.error}
      />
      <Box sx={{ p: 3, pt: 1 }}>
        <AlertsPanel anomalies={stream.anomalies} />
      </Box>
    </Box>
  );
}

/**
 * Minimal observability route content.
 * @returns {JSX.Element}
 */
function ObservabilityPage() {
  return (
    <Box sx={{ p: 3 }}>
      <Paper
        sx={{
          p: 3,
          background: "rgba(22,27,34,0.78)",
          border: "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(8px)",
        }}
      >
        <Typography variant="h4" sx={{ mb: 1 }}>
          Observability Overview
        </Typography>
        <Alert severity="info">
          Live Groq/Ollama health, latency, provider usage, and daily request count are shown in the top bar and refresh automatically.
        </Alert>
      </Paper>
    </Box>
  );
}

/**
 * Root app with sidebar routes and shared top observability bar.
 * @returns {JSX.Element}
 */
export default function App() {
  const stream = useSensorStream();
  const backgroundStyle = useMemo(
    () => ({
      minHeight: "100vh",
      background:
        "radial-gradient(circle at 20% 0%, rgba(0,212,255,0.08), transparent 30%), radial-gradient(circle at 80% 10%, rgba(255,107,53,0.12), transparent 34%), #0d1117",
    }),
    [],
  );

  return (
    <ThemeProvider theme={darkIndustrialTheme}>
      <CssBaseline />
      <BrowserRouter>
        <Box sx={backgroundStyle}>
          <Box sx={{ display: "flex", minHeight: "100vh" }}>
            <Sidebar />
            <Box sx={{ flex: 1, overflow: "hidden" }}>
              <ObservabilityBar />
              <Box sx={{ overflowY: "auto", height: "calc(100vh - 58px)" }}>
                <Routes>
                  <Route path="/" element={<DashboardPage stream={stream} />} />
                  <Route path="/chat" element={<ChatPanel />} />
                  <Route path="/rag" element={<RAGUploader />} />
                  <Route path="/observability" element={<ObservabilityPage />} />
                </Routes>
              </Box>
            </Box>
          </Box>
        </Box>
      </BrowserRouter>
    </ThemeProvider>
  );
}

