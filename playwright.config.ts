import * as path from 'path';
import { defineConfig, devices } from '@playwright/test';

import dotenv from 'dotenv';

/**
 * Load .env for local overrides (PLAYWRIGHT_BASE_URL, optional PLAYWRIGHT_HTML_REPORT_DIR).
 * Staging credentials for B2C are read again in staging-b2c.setup.ts inside workers.
 */
dotenv.config({ path: path.resolve(__dirname, '.env') });

/** When set to "staging", use stage base URL, separate report/output dirs, and auth setup project. */
const isStaging = process.env.PLAYWRIGHT_ENV === 'staging';

const baseURL = isStaging
  ? process.env.PLAYWRIGHT_BASE_URL ?? 'https://stage.app.tg.org.au/'
  : process.env.PLAYWRIGHT_BASE_URL ?? 'https://test.app.tg.org.au/';

const stagingStorageState =
  isStaging ? { storageState: 'playwright/.auth/staging.json' as const } : {};

const reportFolder =
  process.env.PLAYWRIGHT_HTML_REPORT_DIR ??
  (isStaging ? 'playwright-report-staging' : 'playwright-report');

const resultsFolder = isStaging ? 'test-results-staging' : 'test-results';

/** Setup file must not run as a normal test in browser projects (only via dependencies). */
const testIgnoreSetup = '**/staging-b2c.setup.ts';

/**
 * Playwright config: https://playwright.dev/docs/test-configuration
 * - staging: setup-staging runs first and writes playwright/.auth/staging.json
 * - trace: retain-on-failure locally for easier debugging; CI uses on-first-retry
 */
export default defineConfig({
  testDir: './tests',
  outputDir: resultsFolder,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { outputFolder: reportFolder, open: 'never' }]],
  timeout: 60000,

  use: {
    baseURL,
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure',
    // Local: keep trace on failure for debugging; CI: trace only on retry to save space
    trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure',
  },

  projects: [
    ...(isStaging
      ? [
          {
            name: 'setup-staging',
            testMatch: /staging-b2c\.setup\.ts/,
            timeout: 180_000,
            use: {
              baseURL,
            },
          },
        ]
      : []),
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], ...stagingStorageState },
      dependencies: isStaging ? (['setup-staging'] as const) : [],
      testIgnore: testIgnoreSetup,
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'], ...stagingStorageState },
      dependencies: isStaging ? (['setup-staging'] as const) : [],
      testIgnore: testIgnoreSetup,
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'], ...stagingStorageState },
      dependencies: isStaging ? (['setup-staging'] as const) : [],
      testIgnore: testIgnoreSetup,
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'], ...stagingStorageState },
      dependencies: isStaging ? (['setup-staging'] as const) : [],
      testIgnore: testIgnoreSetup,
    },
  ],
});
