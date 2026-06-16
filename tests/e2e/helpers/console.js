import { test as base, expect } from '@playwright/test'

const PRODUCTION_DOMAINS = ['sostienilsostegno.com', 'app.sostienilsostegno']

const EXPECTED_API_ERRORS = [
  '/auth/login',       // 401 — intentional wrong credentials (A-03)
  '/auth/password/request',  // 400 — local Directus without SMTP (RP-10)
  '/auth/password/reset',  // 422/401 — intentional bad token (RP-04, RP-10)
  '/items/Progetti',   // 500 — intentional API error test (EH-01)
  '/items/Giustificativi', // 403 — GestoreVerifica senza permessi scrittura (RC-05)
  '/items/Famiglie_Contatti', // 403 — GestoreVerifica senza permessi su soft-delete
]

const EXPECTED_CONSOLE_ERROR_PATTERNS = [
]

export const test = base.extend({
  page: async ({ page }, use) => {
    const logs = []
    const errors = []
    const warnings = []
    const pendingExpectedErrors = []

    // Runtime guard: detect API calls going to production
    page.on('response', (resp) => {
      const url = resp.url()
      const isProduction = PRODUCTION_DOMAINS.some(d => url.includes(d))
      if (isProduction) {
        errors.push(`[PRODUCTION GUARD] API call to production domain: ${url}`)
        console.error(`\n❌ RUNTIME GUARD: API call to PRODUCTION detected!\n   URL: ${url}\n`)
      }
    })

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
