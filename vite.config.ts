import { defineConfig } from "vite";
import { nitro } from "nitro/vite";
import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ command }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  // Nitro 3 defaults serverDir to false, which skips server/routes entirely.
  plugins: [nitro({ serverDir: "./server", preset: command === "build" ? "vercel" : "node-server" }), dyadComponentTagger(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
