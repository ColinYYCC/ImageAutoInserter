import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir: './tests/e2e-electron',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  timeout: 120000,
  expect: {
    timeout: 10000,
  },
  use: {
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'electron-chromium',
      use: {
        browserName: 'chromium',
        channel: 'electron',
      },
    },
  ],
  webServer: {
    command: 'npm run build && npx electron .',
    port: 9222,
    timeout: 300000,
    reuseExistingServer: false,
  },
});
