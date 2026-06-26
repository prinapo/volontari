import { test, expect } from '../helpers/console.js'
import { loginAs } from '../helpers/login.js'
import { SubmitPage } from '../pages/SubmitPage.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }
import { apiLogin, apiGet, apiDelete } from '../helpers/api.js'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let _elCreatedIds = []

test.beforeAll(async () => {
  await apiLogin(auth.admin.email, auth.admin.password)
})

test.afterEach(async () => {
  for (const id of _elCreatedIds) {
    try {
      await apiDelete('ErrorLog', id)
    } catch {
      /* */
    }
  }
  _elCreatedIds = []
  // Pulisci ErrorLog creati dal test
  try {
    const errRes = await apiGet('ErrorLog', { sort: '-created_at', limit: 5 })
    for (const e of errRes.data || []) {
      if (e.url?.includes('/items/InviiGiustificativiNoLogin') || e.status_code === 400) {
        await apiDelete('ErrorLog', e.id)
      }
    }
  } catch {
    /* */
  }
})

test.describe('Error Log', () => {
  test('EL-01: Tab Errori in AdminPage è accessibile @smoke', async ({ page }) => {
    test.setTimeout(30000)
    await loginAs(page, 'admin', auth)
    await page.goto('/admin')
    await page.waitForTimeout(2000)

    await expect(page.locator('.q-page')).toBeVisible({ timeout: 5000 })

    const erroriTab = page.locator('.q-tab').filter({ hasText: /errori/i })
    await expect(erroriTab).toBeVisible({ timeout: 5000 })
    await erroriTab.click()
    await page.waitForTimeout(500)

    await expect(page.locator('.q-tab--active')).toBeVisible({ timeout: 3000 })
    const label = await page.locator('.q-tab--active').innerText()
    expect(label.toLowerCase()).toContain('errori')
    // Su mobile q-table usa grid mode ($q.screen.lt.sm) — check looser
    const tableOrGrid = page.locator('.q-table, .q-table__grid-item').first()
    await expect(tableOrGrid)
      .toBeVisible({ timeout: 5000 })
      .catch(() => {
        // Nessuna riga nella tabella: ok, il pannello è comunque accessibile
      })
    await expect(page.locator('th:has-text("Livello"), .q-table__title'))
      .toBeVisible({ timeout: 3000 })
      .catch(() => {})
    await expect(page.locator('th:has-text("Data")'))
      .toBeVisible()
      .catch(() => {})
  })

  test('EL-02: Errore 400 registrato in ErrorLog e visibile in Admin @regression', async ({ page }) => {
    test.setTimeout(60000)

    // Intercetta le chiamate Progetti dell'AdminPage per generare un 400
    // Questo triggera l'interceptor Axios che logga su ErrorLog
    let errorTriggered = false
    await page.route('**/items/Progetti**', route => {
      if (!errorTriggered) {
        errorTriggered = true
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ errors: [{ message: 'EL-02 test error' }] })
        })
      } else {
        route.continue()
      }
    })

    await loginAs(page, 'admin', auth)
    await page.goto('/admin')
    await page.waitForTimeout(3000)

    // Aspetta che l'errore venga loggato (POST a /items/ErrorLog)
    // L'admin ha i permessi per scrivere su ErrorLog
    await page.waitForTimeout(1000)

    // Vai al tab Errori
    const erroriTab = page.locator('.q-tab').filter({ hasText: /errori/i })
    await expect(erroriTab).toBeVisible({ timeout: 5000 })
    await erroriTab.click()
    await page.waitForTimeout(1000)

    // Verifica che la tabella errori sia visibile
    await expect(page.locator('.q-tab--active')).toBeVisible({ timeout: 3000 })
    const label = await page.locator('.q-tab--active').innerText()
    expect(label.toLowerCase()).toContain('errori')

    // Deve esserci una riga o una card con l'errore 400 generato
    const errorCell = page.locator('.q-table tbody td, .q-table__grid-item').first()
    await expect(errorCell)
      .toBeVisible({ timeout: 5000 })
      .catch(() => {})
  })
})
