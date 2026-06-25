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
    await expect(page.locator('.q-table')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('th:has-text("Livello")')).toBeVisible()
    await expect(page.locator('th:has-text("Data")')).toBeVisible()
  })

  test('EL-02: Errore 400 da submit anonimo registrato in ErrorLog e visibile in Admin @regression', async ({
    page
  }) => {
    test.setTimeout(90000)
    test.skip('Triggerare 400 da anonimo su Directus locale — comportamento imprevedibile')
  })
})
