import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": {
        target: process.env.VITE_BACKEND_URL ?? "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("@radix-ui")) return "vendor-radix";
          if (id.includes("/react/") || id.includes("/react-dom/") || id.includes("/scheduler/")) {
            return "vendor-react";
          }
          if (
            id.includes("/date-fns/") ||
            id.includes("/sonner/") ||
            id.includes("/vaul/") ||
            id.includes("/clsx/") ||
            id.includes("/nanoid/") ||
            id.includes("/class-variance-authority/") ||
            id.includes("/tailwind-merge/")
          ) {
            return "vendor-utils";
          }
        },
      },
    },
  },
});
