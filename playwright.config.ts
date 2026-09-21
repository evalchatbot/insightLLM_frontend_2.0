import { defineConfig, devices } from "@playwright/test";

/**
 * E2E tests run against a production build served by `next start`.
 * Build first with `npm run build:e2e` (fake env, see tests/e2e/test-env.cjs),
 * then run `npm run test:e2e` (CI runs the same two commands).
 */
const PORT = 3100;
// Use "localhost" and let Next bind all interfaces: Next proxies some middleware
// rewrites to http://localhost:<port>, which fails if the server only listens on 127.0.0.1
// while localhost resolves to ::1.
const baseURL = `http://localhost:${PORT}`;
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "tests/e2e",
  outputDir: "test-results/playwright",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : undefined,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["junit", { outputFile: "test-results/playwright-junit.xml" }],
  ],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `node tests/e2e/test-env.cjs start --port ${PORT}`,
    url: baseURL,
    // Always start our own server so tests never hit a dev server with real keys.
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
