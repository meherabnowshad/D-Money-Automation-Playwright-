import { defineConfig, devices } from '@playwright/test';

// Automatically load environment variables from .env file
if (process.loadEnvFile) {
  try {
    process.loadEnvFile('.env');
  } catch {}
}

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 360000,
  reporter: [
    ['list'],
    ['html', { open: 'never' }]
  ],
  use: {
    baseURL: 'https://dmoneyportal.roadtocareer.net',
    trace: 'on-first-retry',
    storageState: 'auth.json',
    video: 'on',
    screenshot: 'only-on-failure',
    actionTimeout: 30000,
    navigationTimeout: 60000,
    launchOptions: {
      // 1-second delay between actions for headed viewing
      slowMo: process.env.SLOWMO !== undefined ? Number(process.env.SLOWMO) : 1000,
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
});
