import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  globalSetup: resolve(__dirname, 'global-setup.mjs'),
  globalTeardown: resolve(__dirname, 'global-teardown.mjs'),
  testDir: './specs',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  // Retry locale opt-in (E2E_RETRIES=1) per i run lunghi: il dev server Vite può
  // avere hiccup transitori (dynamic import). In CI è già 1. Default locale 0 per
  // non mascherare i flake durante lo sviluppo: quando un test viene ritentato
  // Playwright lo marca "flaky" nel reporter, quindi resta visibile.
  retries: process.env.CI ? 1 : Number(process.env.E2E_RETRIES || 0),
  workers: process.env.CI ? 2 : 1,
  reporter: [['list'], [resolve(__dirname, 'helpers/results-reporter.cjs')]],
  use: {
    baseURL: 'https://development.sostienilsostegno.com',
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
        ...devices['Pixel 5'],
        browserName: 'chromium'
      }
    }
  ],
  webServer: {
    command: 'npx quasar dev -p 9000',
    port: 9000,
    timeout: 60_000,
    reuseExistingServer: true
  }
})
