import { defineConfig, devices } from "@playwright/test";

const e2ePort = process.env.E2E_PORT ?? "3100";
const e2eBaseUrl = process.env.BASE_URL ?? `http://localhost:${e2ePort}`;

/**
 * Upcore V1 — Playwright E2E Test Configuration
 *
 * Projects:
 *   - chromium: Desktop Chrome
 *   - firefox: Desktop Firefox
 *   - mobile-chrome: Mobile Chrome (Pixel 7)
 *
 * Run:
 *   pnpm exec playwright test
 *   pnpm exec playwright test --project=chromium
 *   pnpm exec playwright test tests/auth.spec.ts
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["html", { open: "never" }], ["github"]]
    : [["html", { open: "on-failure" }]],
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: e2eBaseUrl,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
    locale: "tr-TR",
    timezoneId: "Europe/Istanbul",
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  projects: [
    // --- Smoke checks that do not require auth bootstrap ---
    {
      name: "smoke-chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
    // --- Setup: authenticate once, share state across tests ---
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    // --- Desktop Chrome ---
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/.auth/user.json",
      },
      dependencies: ["setup"],
    },
    // --- Desktop Firefox ---
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        storageState: "tests/.auth/user.json",
      },
      dependencies: ["setup"],
    },
    // --- Mobile Chrome (Pixel 7) ---
    {
      name: "mobile-chrome",
      use: {
        ...devices["Pixel 7"],
        storageState: "tests/.auth/user.json",
      },
      dependencies: ["setup"],
    },
  ],
  webServer:
    process.env.CI && process.env.E2E_WEB_SERVER !== "1"
      ? undefined
      : {
          command: `pnpm --filter @upcore/web exec next dev --port ${e2ePort}`,
          url: e2eBaseUrl,
          reuseExistingServer: true,
          timeout: 120_000,
        },
});
