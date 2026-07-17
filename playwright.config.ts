import { defineConfig, devices } from "@playwright/test";

// Focused end-to-end configuration for the Moti AI prototype.
//
// The AI Route Handlers are always intercepted with deterministic fixtures in the
// specs (see tests/e2e/*), so no test ever reaches the real Gemini API — the dev
// server can run with or without a key. The suite is deliberately small and
// role-based rather than a large brittle selector suite.

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "line" : [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
