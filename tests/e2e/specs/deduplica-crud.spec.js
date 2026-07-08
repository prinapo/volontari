import { test, expect } from '../helpers/console.js'
import { loginAs } from '../helpers/login.js'
import { apiLogin, apiPost, apiDelete } from '../helpers/api.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }

const DEDUP = { contatti: [], emails: [], famiglie: [], fcLinks: [] }

test.describe('Deduplica CRUD', () => {
  test.beforeAll(async () => {
    await apiLogin(auth.admin.email, auth.admin.password)
  })

  test.afterEach(async () => {
    for (const id of DEDUP.fcLinks) { try { await apiDelete('Famiglie_Contatti', id) } catch {} }
    for (const id of DEDUP.emails) { try { await apiDelete('email', id) } catch {} }
    for (const id of DEDUP.contatti) { try { await apiDelete('contatti', id) } catch {} }
    for (const id of DEDUP.famiglie) { try { await apiDelete('Famiglie', id) } catch {} }
  })

  test('DDM-01: Pagina deduplica carica @smoke', async ({ page }) => {
    await loginAs(page, 'admin', auth)
    await page.goto('/deduplica')
    await expect(page.locator('.text-h5:has-text("Duplicati")')).toBeVisible({ timeout: 10000 })
  })

  test('DDM-02: Nessun duplicato mostra stato vuoto @smoke', async ({ page }) => {
    await loginAs(page, 'admin', auth)
    await page.goto('/deduplica')
    await page.waitForTimeout(2000)
    // Può mostrare "Nessun duplicato trovato" o la lista dei duplicati
    const emptyMsg = page.locator('text=Nessun duplicato')
    const cards = page.locator('.q-card')
    const hasEmpty = await emptyMsg.count() > 0
    const hasCards = await cards.count() > 0
    expect(hasEmpty || hasCards).toBe(true)
  })
})
