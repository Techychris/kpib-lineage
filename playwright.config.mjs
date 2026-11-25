import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.js',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: 'iphone-se-portrait',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 375, height: 667 },
        hasTouch: true,
        isMobile: true,
      },
    },
    {
      name: 'iphone-15-pro-max',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 430, height: 932 },
        hasTouch: true,
        isMobile: true,
      },
    },
    {
      name: 'ipad-air-landscape',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1180, height: 720 },
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: 'node e2e/server.js',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 15000,
  },
});
