import { defineConfig } from '@playwright/test';
import * as path from 'node:path';
import { DESKTOP_VIEWPORT, MOBILE_VIEWPORT } from './src/viewports';

// Resolve absolute paths relative to this config, works in both CJS + ESM.
const CONFIG_DIR =
  typeof __dirname !== 'undefined' ? __dirname : process.cwd();

const BASE_URL = process.env['SCREENSHOT_BASE_URL'] ?? 'http://localhost:3000';
const START_DEV_SERVER = process.env['SCREENSHOT_NO_SERVER'] !== '1';

export default defineConfig({
  testDir: './src',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false, // preserve deterministic ordering for regression diffs
  retries: process.env['CI'] ? 2 : 1,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'results.xml' }],
  ],
  outputDir: 'test-results',

  use: {
    baseURL: BASE_URL,
    actionTimeout: 8_000,
    navigationTimeout: 20_000,
    ignoreHTTPSErrors: true,
    trace: 'retain-on-failure',
    video: 'off',
    screenshot: 'off',
    locale: 'tr-TR',
    timezoneId: 'Europe/Istanbul',
    colorScheme: 'light',
    reducedMotion: 'reduce',
  },

  projects: [
    {
      name: 'capture-desktop',
      testMatch: /capture\.spec\.ts$/,
      use: {
        viewport: DESKTOP_VIEWPORT,
        deviceScaleFactor: 2,
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      },
    },
    {
      name: 'capture-mobile',
      testMatch: /capture\.spec\.ts$/,
      use: {
        viewport: MOBILE_VIEWPORT,
        deviceScaleFactor: 2,
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'regression',
      testMatch: /regression\.spec\.ts$/,
      use: {
        viewport: DESKTOP_VIEWPORT,
        deviceScaleFactor: 1,
      },
      snapshotDir: path.resolve(CONFIG_DIR, 'baselines'),
    },
    {
      name: 'verify',
      testMatch: /verify\.spec\.ts$/,
      use: {
        viewport: DESKTOP_VIEWPORT,
        deviceScaleFactor: 1,
      },
    },
  ],

  webServer: START_DEV_SERVER
    ? {
        command: 'pnpm --filter @upcore/web dev',
        cwd: path.resolve(CONFIG_DIR, '../..'),
        url: BASE_URL,
        reuseExistingServer: true,
        timeout: 180_000,
        env: {
          ...process.env,
          NODE_ENV: 'development',
          NEXT_PUBLIC_E2E_BYPASS_AUTH: '1',
        },
      }
    : undefined,
});
