import { test as base, expect } from '@playwright/test'
import { apiLogin, apiGet, getToken } from './api.js'

const PRODUCTION_DOMAINS = ['sostienilsostegno.com', 'app.sostienilsostegno']

const EXPECTED_API_ERRORS = [
  '/auth/login', // 401 — intentional wrong credentials (A-03)
  '/auth/password/request', // 400 — local Directus without SMTP (RP-10)
  '/auth/password/reset', // 422/401 — intentional bad token (RP-04, RP-10)
  '/items/Progetti', // 500 — intentional API error test (EH-01)
  '/items/Giustificativi', // 403 — GestoreVerifica senza permessi CREATE (RC-05)
  '/items/Pagamenti', // 403 — Verificatore senza permessi Pagamenti
  '/items/ErrorLog', // 403 — vari ruoli senza permessi ErrorLog (cascade da altri 403)
  '/items/Famiglie_Contatti', // 403 — GestoreVerifica in riconciliazione flow
  '/items/Associazioni', // 403 — Verificatore senza permessi Associazioni
  '/items/BatchPagamenti', // 403 — Verificatore senza permessi BatchPagamenti
  '/items/Famiglie/', // 400 — IBAN test non valido DB-V4 (progetti orfani senza famiglia)
  '/items/email' // 403 — PATCH campi email_address/Priority da utente non admin
]

const EXPECTED_CONSOLE_ERROR_PATTERNS = []

async function countErrorLog() {
  try {
    const res = await apiGet('ErrorLog', { 'aggregate[count]': 'id' })
    return res.data?.[0]?.count?.id ?? -1
  } catch {
    return -1
  }
}

export const test = base.extend({
  page: async ({ page }, use) => {
    const logs = []
    const errors = []
    const warnings = []
    const pendingExpectedErrors = []

    // Init admin API for ErrorLog tracking
    let elBefore = -1
    try {
      if (!getToken()) await apiLogin('fake.admin@fake.com', 'FakeAdmin_2026!!')
      elBefore = await countErrorLog()
    } catch {}

    // Runtime guard: detect API calls going to production
    page.on('response', resp => {
      const url = resp.url()
      const isProduction = PRODUCTION_DOMAINS.some(d => url.includes(d))
      if (isProduction) {
        errors.push(`[PRODUCTION GUARD] API call to production domain: ${url}`)
        console.error(`\n❌ RUNTIME GUARD: API call to PRODUCTION detected!\n   URL: ${url}\n`)
      }
    })

    page.on('console', msg => {
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

    page.on('pageerror', err => {
      errors.push(err.message)
      console.log('[BROWSER UNCAUGHT]', err.message)
    })

    page.on('response', response => {
      if (response.status() >= 400) {
        const url = response.url()
        if (EXPECTED_API_ERRORS.some(e => url.includes(e))) {
          pendingExpectedErrors.push(response.status())
        }
        console.log(`[API ${response.status()}] ${url}`)
      }
    })

    await use(page)

    // Check for new ErrorLog entries created by this test
    if (elBefore >= 0) {
      try {
        const elAfter = await countErrorLog()
        if (elAfter > elBefore) {
          const newEntries = await apiGet('ErrorLog', {
            sort: '-id',
            limit: elAfter - elBefore,
            fields: 'id,message,method,url,status,level'
          })
          for (const e of newEntries.data || []) {
            const msg = (e.message || '').slice(0, 200)
            console.log(`[ERRORLOG] [${e.level}] #${e.id} ${e.method} ${e.status} — ${msg}`)
          }
        }
      } catch {}
    }

    if (errors.length > 0) {
      console.log(`\n=== CONSOLE ERRORS (${errors.length}) ===`)
      errors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`))
      expect(errors).toHaveLength(0)
    }
  }
})

export { expect }
