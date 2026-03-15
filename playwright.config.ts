import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 35000,
  retries: 0,
  workers: 1,
  reporter: [
    ['list'],
    ['json', { outputFile: './e2e-results.json' }],
  ],
  use: {
    baseURL: 'http://192.168.56.1:3099',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
