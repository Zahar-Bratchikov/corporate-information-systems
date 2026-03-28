import { defineConfig, devices } from '@playwright/test'

const webBase = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    ...devices['Desktop Chrome'],
    baseURL: webBase,
    trace: 'on-first-retry',
  },
  webServer: process.env.PLAYWRIGHT_SKIP_WEB_SERVER
    ? undefined
    : {
        command: 'npm run dev',
        url: webBase,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
  projects: [
    {
      name: 'api',
      testMatch: /api\/.*\.spec\.ts$/,
      use: {
        baseURL: process.env.API_BASE_URL ?? 'http://127.0.0.1:8080',
      },
    },
    {
      name: 'ui',
      testMatch: /ui\/.*\.spec\.ts$/,
      dependencies: [],
      use: {
        baseURL: webBase,
      },
    },
  ],
})
