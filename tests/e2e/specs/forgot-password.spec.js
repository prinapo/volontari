import { test, expect } from '../helpers/console.js'
import { LoginPage } from '../pages/LoginPage.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }

test.describe('Forgot Password', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
  })

  test('FPW-01: Richiedi reset password mostra notifica @smoke', async ({ page }) => {
    await page.locator('button:has-text("Password dimenticata")').click()
    await expect(page.locator('.q-dialog')).toBeVisible({ timeout: 3000 })

    await page.locator('.q-dialog input').fill(auth.volontario.email)
    await page.locator('.q-dialog button:has-text("Invia link")').click()
    await expect(page.locator('.q-notification')).toBeVisible({ timeout: 5000 })
  })

  test('FPW-02: Annulla chiude dialog @smoke', async ({ page }) => {
    await page.locator('button:has-text("Password dimenticata")').click()
    await expect(page.locator('.q-dialog')).toBeVisible({ timeout: 3000 })

    await page.locator('.q-dialog button:has-text("Annulla")').click()
    await expect(page.locator('.q-dialog')).not.toBeVisible({ timeout: 3000 })
  })
})
