import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "https://chatbot-backend-h6oj.onrender.com",
        changeOrigin: true,
        timeout: 600000,
        proxyTimeout: 600000,
      },
      "/docs": {
        target: "https://chatbot-backend-h6oj.onrender.com",
        changeOrigin: true,
      },
      "/redoc": {
        target: "https://chatbot-backend-h6oj.onrender.com",
        changeOrigin: true,
      },
      "/openapi.json": {
        target: "https://chatbot-backend-h6oj.onrender.com",
        changeOrigin: true,
      },
    },
  },
});
