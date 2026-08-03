import { defineConfig, devices } from '@playwright/test';

/* global process */

const PORT = Number(process.env.E2E_FRONTEND_PORT || 4173);
const baseURL = process.env.E2E_BASE_URL || `http://127.0.0.1:${PORT}`;
const reportDir = process.env.PLAYWRIGHT_REPORT_DIR || 'playwright-report';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [
        ['list'],
        ['junit', { outputFile: 'test-results/playwright-junit.xml' }],
        ['html', { outputFolder: reportDir, open: 'never' }],
      ]
    : [
        ['list'],
        ['html', { outputFolder: reportDir, open: 'never' }],
      ],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 20_000,
  },
  webServer: process.env.E2E_SKIP_WEBSERVER
    ? undefined
    : {
        command: `npm run preview -- --host 127.0.0.1 --port ${PORT}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
