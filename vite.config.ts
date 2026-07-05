import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173, host: true },
  build: {
    rollupOptions: {
      output: {
        // Keep vendor libs in their own chunks so the app shell stays light
        // and supabase-js / react-router cache independently of app code.
        manualChunks: {
          supabase: ["@supabase/supabase-js"],
          router: ["react-router-dom"],
        },
      },
    },
  },
});
