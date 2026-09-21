import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test as base, expect } from '@playwright/test'
import { apiLogin, apiGet, getToken } from './api.js'

const PRODUCTION_DOMAINS = ['app.sostienilsostegno.com', 'volontari.sostienilsostegno.com']

const __dirname = dirname(fileURLToPath(import.meta.url))
const API_ERRORS_FILE = resolve(__dirname, '..', '..', '..', 'test-results', 'api-errors.json')

// Errori API noti e attesi (non causano fallimento test).
// NB: tenere questa lista VUOTA per default. Ogni voce maschera errori potenzialmente veri:
// se serve tollerare un errore, dichiararlo esplicitamente nel test con `page.expectApiError()`.
const KNOWN_API_ERRORS = []

function recordApiErrors(testInfo, entries) {
  if (entries.length === 0) return
  try {
    mkdirSync(dirname(API_ERRORS_FILE), { recursive: true })
    const existing = existsSync(API_ERRORS_FILE) ? JSON.parse(readFileSync(API_ERRORS_FILE, 'utf8')) : []
    existing.push({
      test: testInfo.title,
      file: testInfo.file.split(/[/\\]/).pop(),
      project: testInfo.project.name,
      errors: entries
    })
    writeFileSync(API_ERRORS_FILE, JSON.stringify(existing, null, 2), 'utf8')
  } catch {
    // best-effort: non far fallire il test per il reporting
  }
}

async function countErrorLog() {
  try {
    const res = await apiGet('ErrorLog', { 'aggregate[count]': 'id' })
    return res.data?.[0]?.count?.id ?? -1
  } catch {
    return -1
  }
}

export const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    const errors = []
    const warnings = []
    const expectedApiErrors = []
    const api4xx = []

    // Permette ai test di dichiarare errori API attesi
    page.expectApiError = urlPattern => {
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
      // Track 4xx/5xx responses (registra SEMPRE, per il report per-test)
      if (resp.status() >= 400) {
        const method = resp.request().method()
        const cleanUrl = url.replace(/\?_t=\d+/, '')
        const isExpected = expectedApiErrors.some(pattern => url.includes(pattern))
        const isKnown = KNOWN_API_ERRORS.some(pattern => url.includes(pattern))
        const hasAuth = Boolean(resp.request().headers()['authorization'])
        api4xx.push({
          status: resp.status(),
          method,
          url: cleanUrl,
          expected: isExpected,
          known: isKnown,
          hasAuth,
          page: page.url()
        })
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

    // Persisti TUTTI i 4xx/5xx osservati, con attribuzione al test corrente
    recordApiErrors(testInfo, api4xx)

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

export { expect } from '@playwright/test'
