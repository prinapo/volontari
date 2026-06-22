import { test, expect } from '../helpers/console.js'
import { loginAs } from '../helpers/login.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }

test.describe('Gestione Pagamenti', () => {

  test('PAG-01: Login gestore e pagina gestione carica @smoke', async ({ page }) => {
    test.setTimeout(30000)
    await loginAs(page, 'gestore', auth)
    await expect(page.locator('.q-tab:has-text("Contatti")')).toBeVisible({ timeout: 10000 })
    console.log('[PAG-01] Login e pagina gestione OK')
  })

  test('PAG-02: Verificatore vede pagina verifica @smoke', async ({ page }) => {
    test.setTimeout(30000)
    await loginAs(page, 'verificatore', auth)
    await page.goto('/verifica')
    await expect(page.locator('.verifica-table')).toBeVisible({ timeout: 15000 })
    console.log('[PAG-02] Pagina verifica OK')
  })

  test('PAG-06: Tab Pagamenti in VerificaPage è visibile @smoke', async ({ page }) => {
    test.setTimeout(30000)
    await loginAs(page, 'verificatore', auth)
    await page.goto('/verifica')
    await expect(page.locator('.verifica-table')).toBeVisible({ timeout: 15000 })
    const pagTab = page.locator('.q-tab:has-text("Pagamenti")')
    await expect(pagTab).toBeVisible({ timeout: 5000 })
    console.log('[PAG-06] Tab Pagamenti visibile')
  })

  test('PAG-10: Admin vede tab Errori in AdminPage @smoke', async ({ page }) => {
    test.setTimeout(30000)
    await loginAs(page, 'admin', auth)
    await page.goto('/admin')
    await page.waitForTimeout(2000)

    const erroriTab = page.locator('.q-tab').filter({ hasText: /errori/i })
    await expect(erroriTab).toBeVisible({ timeout: 5000 })
    await erroriTab.click()
    await page.waitForTimeout(500)

    await expect(page.locator('.q-tab--active')).toBeVisible({ timeout: 3000 })
    const label = await page.locator('.q-tab--active').innerText()
    expect(label.toLowerCase()).toContain('errori')
    console.log('[PAG-10] AdminPage e tab Errori OK')
  })

  test('PAG-17: Volontario vede pagina famiglie @smoke', async ({ page }) => {
    test.setTimeout(30000)
    await loginAs(page, 'volontario', auth)
    // Su mobile o multi-famiglia, il contenuto può variare
    const content = page.locator('.text-h6, .q-select:has(.q-field__label:has-text("Seleziona famiglia"))').first()
    await expect(content).toBeVisible({ timeout: 10000 })
    console.log('[PAG-17] Pagina famiglie OK')
  })
})
