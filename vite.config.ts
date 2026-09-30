import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// MotionOS is a 100% client-side app: no server, no API routes.
// Camera frames never leave the browser.
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // MediaPipe ships its own wasm loader; pre-bundling it is unnecessary.
    exclude: ["@mediapipe/tasks-vision"],
  },
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 1500,
  },
  server: {
    host: true,
  },
});
