import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  retries: 1,
  use: {
    baseURL: 'http://127.0.0.1:3117',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 3117 --strictPort',
    url: 'http://127.0.0.1:3117',
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
    { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'] } },
  ],
})
