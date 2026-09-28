import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: {
    // Plotly is one large module by design; split it so the shell paints first.
    rollupOptions: {
      output: {
        manualChunks: (id) => (id.includes("plotly.js") ? "plotly" : undefined),
      },
    },
    chunkSizeWarningLimit: 5000,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["src/test-setup.ts"],
  },
});
