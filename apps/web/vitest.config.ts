import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url))
    }
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    // Checks the world's database is reachable and migrated once, so an
    // unstarted Supabase stack reads as one clear instruction rather than
    // eighteen connection failures.
    globalSetup: ["./tests/global-setup.ts"]
  }
});
