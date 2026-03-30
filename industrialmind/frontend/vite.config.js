import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Returns backend proxy target for local development.
 * @returns {string}
 */
function getApiTarget() {
  return process.env.VITE_API_BASE_URL || "http://localhost:8000";
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/chat": getApiTarget(),
      "/rag": getApiTarget(),
      "/health": getApiTarget(),
      "/metrics": getApiTarget(),
      "/sensors": getApiTarget(),
      "/ws": {
        target: getApiTarget(),
        ws: true,
      },
    },
  },
});

