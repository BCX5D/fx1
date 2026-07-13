import { defineConfig } from "vitest/config";

/**
 * Minimal standalone Vitest config, deliberately NOT sharing vite.config.ts.
 * The app's Vite config wires the React and Tailwind plugins for the browser
 * build; the tests here are plain TypeScript unit tests (Lemon Squeezy webhook
 * signature verification, free-tier limit math) with no JSX and no CSS, so
 * pulling in those plugins would only add startup cost and surface area for
 * no benefit.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
