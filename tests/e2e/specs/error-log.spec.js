import { test, expect } from '../helpers/console.js'
import { loginAs } from '../helpers/login.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }

test.describe('Error Log', () => {
  test('EL-01: Tab Errori in AdminPage è accessibile @smoke', async ({ page }) => {
    test.setTimeout(30000)
    await loginAs(page, 'admin', auth)
    await page.goto('/admin')
    await page.waitForTimeout(2000)

    // Verifica che la pagina admin sia caricata
    await expect(page.locator('.q-page')).toBeVisible({ timeout: 5000 })

    // Verifica che il tab Errori sia visibile e cliccabile
    const erroriTab = page.locator('.q-tab').filter({ hasText: /errori/i })
    await expect(erroriTab).toBeVisible({ timeout: 5000 })
    await erroriTab.click()
    await page.waitForTimeout(500)

    // Verifica che il tab Errori sia attivo e la tabella visibile
    await expect(page.locator('.q-tab--active')).toBeVisible({ timeout: 3000 })
    const label = await page.locator('.q-tab--active').innerText()
    expect(label.toLowerCase()).toContain('errori')
    await expect(page.locator('.q-table')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('th:has-text("Livello")')).toBeVisible()
    await expect(page.locator('th:has-text("Data")')).toBeVisible()
  })
})
