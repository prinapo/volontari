import { test as base, expect } from '@playwright/test'
import { apiLogin, apiGet, getToken } from './api.js'

const PRODUCTION_DOMAINS = ['app.sostienilsostegno.com', 'volontari.sostienilsostegno.com']

// Errori API noti e attesi (non causano fallimento test)
const KNOWN_API_ERRORS = [
  '/items/contatti' // Contatti non è leggibile via REST da nessun ruolo (usa /users)
]

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
    const errors = []
    const warnings = []
    const expectedApiErrors = []

    // Permette ai test di dichiarare errori API attesi
    page.expectApiError = (urlPattern) => {
      expectedApiErrors.push(urlPattern)
    }

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
      // Track 4xx/5xx responses
      if (resp.status() >= 400) {
        const isExpected = expectedApiErrors.some(pattern => url.includes(pattern))
        if (isExpected) {
          console.log('[API EXPECTED]', resp.status(), url.slice(0, 120))
        } else if (!url.includes('/ErrorLog')) {
          errors.push(`[API ${resp.status()}] ${url}`)
          console.log('[API ERROR]', resp.status(), url.slice(0, 120))
        }
      }
    })

    page.on('console', msg => {
      const text = msg.text()
      if (msg.type() === 'error' && text.includes('Failed to load resource')) {
        // Skip "Failed to load resource" — already tracked via response handler with URL
      } else if (msg.type() === 'error') {
        errors.push(text)
        console.log('[BROWSER ERROR]', text)
      } else if (msg.type() === 'warning') {
        warnings.push(text)
        console.log('[BROWSER WARN]', text)
      } else if (msg.type() === 'log') {
        console.log('[BROWSER LOG]', text)
      }
    })

    page.on('pageerror', err => {
      errors.push(err.message)
      console.log('[BROWSER UNCAUGHT]', err.message)
    })

    await use(page)

    // A fine test, filtro via gli errori attesi e quelli noti
    const knownPatterns = [...expectedApiErrors, ...KNOWN_API_ERRORS]
    const filtered = errors.filter(e => !knownPatterns.some(pattern => e.includes(pattern)))

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

    if (filtered.length > 0) {
      console.log(`\n=== CONSOLE ERRORS (${filtered.length}/${errors.length} after filtering) ===`)
      filtered.forEach((e, i) => console.log(`  ${i + 1}. ${e}`))
      expect(filtered).toHaveLength(0)
    }
  }
})

export { expect }
