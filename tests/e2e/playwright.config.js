import { defineConfig, devices } from '@playwright/test'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  globalSetup: resolve(__dirname, 'global-setup.mjs'),
  globalTeardown: resolve(__dirname, 'global-teardown.mjs'),
  testDir: './specs',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 1,
  reporter: [['list'], [resolve(__dirname, 'helpers/results-reporter.cjs')]],
  use: {
    baseURL: 'http://localhost:9000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    permissions: ['clipboard-read', 'clipboard-write'],
    video: 'retry-with-video'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'mobile',
      use: {
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
        userAgent: 'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36'
      }
    }
  ],
  webServer: {
    command: 'npx quasar dev -p 9000',
    port: 9000,
    timeout: 60000,
    reuseExistingServer: true
  }
})
