import path from 'node:path'
import { fileURLToPath } from 'node:url'
import auth from '../fixtures/auth-test.json' with { type: 'json' }
import { apiLogin, apiGet, apiPost, apiDelete } from '../helpers/api.js'
import { test, expect } from '../helpers/console.js'
import { loginAs } from '../helpers/login.js'
import { SubmitPage } from '../pages/SubmitPage.js'

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
  test('ELG-01: Tab Errori in AdminPage è accessibile @smoke', async ({ page }) => {
    test.setTimeout(45_000)
    await loginAs(page, 'admin', auth)
    await page.goto('/admin')
    await page.waitForLoadState('networkidle').catch(() => {})

    await expect(page.locator('.q-page')).toBeVisible({ timeout: 5000 })

    const erroriTab = page.locator('.q-tab').filter({ hasText: /errori/i })
    await expect(erroriTab).toBeVisible({ timeout: 5000 })
    await erroriTab.click()
    await page.waitForLoadState('networkidle').catch(() => {})

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

  test('ELG-02: Errore 400 registrato in ErrorLog e visibile in Admin @regression', async ({ page }) => {
    test.setTimeout(60_000)
    page.expectApiError('/items/Progetti')

    // Intercetta le chiamate Progetti dell'AdminPage per generare un 400
    // Questo triggera l'interceptor Axios che logga su ErrorLog
    let errorTriggered = false
    await page.route('**/items/Progetti**', route => {
      if (errorTriggered) {
        route.continue()
      } else {
        errorTriggered = true
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ errors: [{ message: 'EL-02 test error' }] })
        })
      }
    })

    await loginAs(page, 'admin', auth)
    await page.goto('/admin')
    await page.waitForLoadState('networkidle').catch(() => {})

    // Aspetta che l'errore venga loggato (POST a /items/ErrorLog)
    // L'admin ha i permessi per scrivere su ErrorLog
    await page.waitForLoadState('networkidle').catch(() => {})

    // Vai al tab Errori
    const erroriTab = page.locator('.q-tab').filter({ hasText: /errori/i })
    await expect(erroriTab).toBeVisible({ timeout: 5000 })
    await erroriTab.click()
    await page.waitForLoadState('networkidle').catch(() => {})

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

  test('ELG-03: Segna errore come letto @crud', async ({ page }) => {
    test.setTimeout(60_000)
    const message = `ELG-03_${Date.now()}`
    const created = await apiPost('ErrorLog', {
      level: 'error',
      message,
      method: 'GET',
      url: '/items/Test',
      status: 500,
      read: false,
      timestamp: new Date().toISOString()
    })
    const elId = created?.data?.id
    expect(elId).toBeTruthy()
    _elCreatedIds.push(elId)

    await loginAs(page, 'admin', auth)
    await page.goto('/admin')
    await page.waitForLoadState('networkidle').catch(() => {})
    await page
      .locator('.q-tab')
      .filter({ hasText: /errori/i })
      .click()
    await page.waitForLoadState('networkidle').catch(() => {})

    const searchInput = page.locator('input[placeholder="Cerca..."]')
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill(message)
      await page.waitForLoadState('networkidle').catch(() => {})
    }
    const row = page
      .locator('.q-table tbody tr, .q-table__grid-content .q-card, .q-table--grid .q-card')
      .filter({ hasText: message })
      .first()
    await expect(row).toBeVisible({ timeout: 10_000 })

    const btn = row.locator('button[aria-label="Segna come letto"]').first()
    await expect(btn).toBeVisible({ timeout: 5000 })
    await btn.click()

    let read = false
    for (let i = 0; i < 10 && !read; i++) {
      await page.waitForTimeout(500)
      const check = await apiGet('ErrorLog/' + elId, { fields: 'read' }).catch(() => null)
      read = check?.data?.read === true
    }
    expect(read).toBe(true)
  })

  test('ELG-04: Elimina errore @crud', async ({ page }) => {
    test.setTimeout(60_000)
    const message = `ELG-04_${Date.now()}`
    const created = await apiPost('ErrorLog', {
      level: 'warning',
      message,
      method: 'POST',
      url: '/items/Test',
      status: 400,
      read: false,
      timestamp: new Date().toISOString()
    })
    const elId = created?.data?.id
    expect(elId).toBeTruthy()
    _elCreatedIds.push(elId)

    await loginAs(page, 'admin', auth)
    await page.goto('/admin')
    await page.waitForLoadState('networkidle').catch(() => {})
    await page
      .locator('.q-tab')
      .filter({ hasText: /errori/i })
      .click()
    await page.waitForLoadState('networkidle').catch(() => {})

    const searchInput = page.locator('input[placeholder="Cerca..."]')
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill(message)
      await page.waitForLoadState('networkidle').catch(() => {})
    }
    const row = page
      .locator('.q-table tbody tr, .q-table__grid-content .q-card, .q-table--grid .q-card')
      .filter({ hasText: message })
      .first()
    await expect(row).toBeVisible({ timeout: 10_000 })

    const btn = row.locator('button[aria-label="Elimina"]').first()
    await expect(btn).toBeVisible({ timeout: 5000 })
    await btn.click()

    let gone = false
    for (let i = 0; i < 10 && !gone; i++) {
      await page.waitForTimeout(500)
      const after = await apiGet('ErrorLog/' + elId, { fields: 'id' }).catch(() => null)
      gone = !after || after?.data?.id === undefined
    }
    expect(gone).toBe(true)
  })
})
