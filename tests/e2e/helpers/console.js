import { test as base, expect } from '@playwright/test'

const EXPECTED_API_ERRORS = [
  '/auth/login',       // 401 — intentional wrong credentials (A-03)
  '/auth/password/reset',  // 422/401 — intentional bad token (RP-04, RP-10)
  '/items/email',       // 403 — role lacks read access to email collection
  '/items/Famiglie_Contatti',  // 403 — role lacks read access to Famiglie_Contatti
  'favicon.ico'         // 404 — missing favicon
]

const EXPECTED_CONSOLE_ERROR_PATTERNS = [
  /^Errore caricamento email (volontari|genitori) AxiosError: Request failed with status code 403/,
  /^Failed to load resource:.*404/
]

export const test = base.extend({
  page: async ({ page }, use) => {
    const logs = []
    const errors = []
    const warnings = []
    const pendingExpectedErrors = []

    page.on('console', (msg) => {
      const text = msg.text()
      const isFailedResource = text.includes('Failed to load resource')
      const isExpected = isFailedResource && pendingExpectedErrors.length > 0
      if (isExpected) {
        pendingExpectedErrors.pop()
      }
      const isExpectedError = EXPECTED_CONSOLE_ERROR_PATTERNS.some(p => p.test(text))
      if (msg.type() === 'error' && !isExpected && !isExpectedError) {
        errors.push(text)
        console.log('[BROWSER ERROR]', text)
      } else if (msg.type() === 'warning' && !isExpected) {
        warnings.push(text)
        console.log('[BROWSER WARN]', text)
      } else if (msg.type() === 'log') {
        logs.push(text)
        console.log('[BROWSER LOG]', text)
      } else {
        logs.push(text)
      }
    })

    page.on('pageerror', (err) => {
      errors.push(err.message)
      console.log('[BROWSER UNCAUGHT]', err.message)
    })

    page.on('response', (response) => {
      if (response.status() >= 400) {
        const url = response.url()
        if (EXPECTED_API_ERRORS.some(e => url.includes(e))) {
          pendingExpectedErrors.push(response.status())
        }
        console.log(`[API ${response.status()}] ${url}`)
      }
    })

    await use(page)

    if (errors.length > 0) {
      console.log(`\n=== CONSOLE ERRORS (${errors.length}) ===`)
      errors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`))
      expect(errors).toHaveLength(0)
    }
  }
})

export { expect }
