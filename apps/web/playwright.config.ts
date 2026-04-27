import { defineConfig, devices } from '@playwright/test';

// Kurulum:
//   pnpm add -D @playwright/test
//   npx playwright install --with-deps chromium firefox
// Çalıştırma (local):
//   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_... pnpm exec playwright test
// CI:
//   .github/workflows/e2e.yml tarafından tetiklenir.

const BASE = process.env['E2E_BASE_URL'] || 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 2 : undefined,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'playwright-results.xml' }],
  ],
  use: {
    baseURL: BASE,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
    },
    {
      name: 'mobile',
      dependencies: ['setup'],
      use: {
        ...devices['Pixel 7'],
        storageState: 'e2e/.auth/user.json',
      },
    },
  ],
  webServer: process.env['E2E_NO_SERVER']
    ? undefined
    : {
        command: 'pnpm dev',
        url: BASE,
        reuseExistingServer: !process.env['CI'],
        timeout: 120_000,
      },
});
