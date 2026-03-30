import { createTheme } from "@mui/material/styles";

/**
 * Builds the IndustrialMind dark MUI theme.
 * @returns {import("@mui/material/styles").Theme}
 */
export const darkIndustrialTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#ff6b35" },
    secondary: { main: "#00d4ff" },
    error: { main: "#ff4444" },
    background: {
      default: "#0d1117",
      paper: "#161b22",
    },
  },
  typography: {
    fontFamily: "Inter, 'JetBrains Mono', sans-serif",
    h4: {
      fontWeight: 700,
      letterSpacing: "0.02em",
    },
    body2: {
      fontFamily: "'JetBrains Mono', Inter, monospace",
    },
  },
  shape: {
    borderRadius: 14,
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: "1px solid rgba(255,255,255,0.08)",
        },
      },
    },
  },
});

