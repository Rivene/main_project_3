import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite"; 
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      "/api": {
        target: process.env.VITE_API_BASE || "http://127.0.0.1:4000",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ""),
      },
    },
  },
});