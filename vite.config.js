import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    // Use a fixed port that won't collide with other Vite projects.
    // This must match `src-tauri/tauri.conf.json` build.devPath.
    port: 5174,
    strictPort: true,
    host: "127.0.0.1",
  },
});
