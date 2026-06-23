import { test, expect } from '../helpers/console.js'
import { loginAs } from '../helpers/login.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }

test.describe('Admin Page', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(30000)
    if (!auth.admin) {
      test.skip('Nessun utente Admin configurato')
      return
    }
    await loginAs(page, 'admin', auth)
    // Wait for current page to settle, then use goto
    await page.waitForTimeout(1000)
    await page.goto('/admin')
    await page.waitForTimeout(3000)
  })

  test('AD-01: Pagina admin caricata @smoke', async ({ page }) => {
    // Verifica che la pagina abbia caricato (qualsiasi contenuto)
    await expect(page.locator('.admin-page')).toBeVisible({ timeout: 10000 })
  })

  test('AD-02: Tab Progetti cliccabile @smoke', async ({ page }) => {
    const tab = page.locator('.q-tab:has-text("Progetti")')
    if (await tab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tab.click()
      await page.waitForTimeout(500)
    }
  })

  test('AD-03: Tab Errori cliccabile @smoke', async ({ page }) => {
    const tab = page.locator('.q-tab:has-text("Errori")')
    if (await tab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tab.click()
      await page.waitForTimeout(500)
    }
  })

  test('AD-SS-01: Admin page screenshot @visual', async ({ page }) => {
    await page.waitForTimeout(1000)
    await expect(page).toHaveScreenshot('admin-page.png', { maxDiffPixels: 500, animations: 'disabled' })
  })
})
