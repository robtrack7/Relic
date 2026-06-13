import { defineConfig, devices } from "@playwright/test";

const port = process.env.PLAYWRIGHT_PORT ?? "3001";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;
const nextBin = process.platform === "win32" ? ".\\node_modules\\.bin\\next.cmd" : "./node_modules/.bin/next";

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "../../output/playwright",
  timeout: 30_000,
  use: {
    baseURL,
    trace: "on-first-retry"
  },
  webServer: {
    command: `${nextBin} dev --hostname 127.0.0.1 --port ${port}`,
    reuseExistingServer: true,
    timeout: 120_000,
    url: baseURL
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } }
  ]
});
