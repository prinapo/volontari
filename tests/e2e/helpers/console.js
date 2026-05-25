import { test as base } from '@playwright/test'

export const test = base.extend({
  page: async ({ page }, use) => {
    const logs = []
    const errors = []
    const warnings = []

    page.on('console', (msg) => {
      const text = msg.text()
      if (msg.type() === 'error') {
        errors.push(text)
        console.log('[BROWSER ERROR]', text)
      } else if (msg.type() === 'warning') {
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
        console.log(`[API ${response.status()}] ${response.url()}`)
      }
    })

    await use(page)

    if (errors.length > 0) {
      console.log(`\n=== CONSOLE ERRORS (${errors.length}) ===`)
      errors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`))
    }
  }
})

export { expect } from '@playwright/test'
