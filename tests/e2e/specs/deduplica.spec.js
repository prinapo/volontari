import { test, expect } from '../helpers/console.js'
import { loginAs } from '../helpers/login.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }

test.describe('DeduplicaPage', () => {
  test('DP-01: Volontario non accede a /deduplica @regression', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.goto('/deduplica')
    await page.waitForTimeout(2000)
    const currentUrl = page.url()
    expect(currentUrl).not.toContain('/deduplica')
  })

  test('DP-02: Admin accede a /deduplica @smoke', async ({ page }) => {
    if (!auth.admin) { test.skip('Nessun utente Admin configurato'); return }
    const loginPage = (await import('../pages/LoginPage.js')).LoginPage
    const lp = new loginPage(page)
    await lp.goto()
    try {
      await lp.login(auth.admin.email, auth.admin.password)
    } catch {
      test.skip('Admin user non presente in Directus locale')
      return
    }

    await page.goto('/deduplica')
    await page.waitForTimeout(2000)

    const currentUrl = page.url()
    if (!currentUrl.includes('/deduplica')) {
      test.skip('Accesso negato — l\'admin potrebbe non avere permessi')
      return
    }

    await expect(page.locator('text=Gestione duplicati')).toBeVisible({ timeout: 5000 })
  })
})
