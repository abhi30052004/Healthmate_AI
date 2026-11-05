/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": "/src",
      "motion/react": "framer-motion",
      "motion": "framer-motion",
    },
  },
  server: { port: 5173 },
  test: {
    environment: "jsdom",
    globals: true,
    exclude: ["_legacy/**", "node_modules/**", "dist/**"],
  },
});
