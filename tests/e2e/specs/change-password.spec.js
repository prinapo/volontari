import { test, expect } from '../helpers/console.js'
import { loginAs } from '../helpers/login.js'
import { LoginPage } from '../pages/LoginPage.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }

const ORIGINAL_PWD = auth.volontario.password
const TEMP_PWD = 'TempPass_2026_Change!'

test.describe('Change Password', () => {
  test.afterEach(async () => {
    // Ripristina la password originale via API
    const { apiLogin } = await import('../helpers/api.js')
    await apiLogin(auth.admin.email, auth.admin.password)
    const { apiPatch } = await import('../helpers/api.js')
    await apiPatch('/users/me', { password: ORIGINAL_PWD }).catch(() => {})
  })

  test('CPW-01: Cambia password con successo @smoke', async ({ page }) => {
    page.expectApiError('/users/me')
    await loginAs(page, 'volontario', auth)
    await expect(page).toHaveURL(/\/famiglie/, { timeout: 15000 })

    await page.locator('.q-btn-dropdown').click()
    await page.locator('text=Cambia password').click()
    await expect(page.locator('.q-dialog')).toBeVisible({ timeout: 3000 })

    const inputs = page.locator('.q-dialog input[type="password"]')
    await inputs.nth(0).fill(TEMP_PWD)
    await inputs.nth(1).fill(TEMP_PWD)
    await page.locator('.q-dialog button:has-text("Salva")').click()
    await expect(page.locator('.q-notification')).toBeVisible({ timeout: 5000 })
  })

  test('CPW-02: Password mismatch blocca salvataggio @regression', async ({ page }) => {
    await loginAs(page, 'volontario', auth)
    await expect(page).toHaveURL(/\/famiglie/, { timeout: 15000 })

    await page.locator('.q-btn-dropdown').click()
    await page.locator('text=Cambia password').click()
    await expect(page.locator('.q-dialog')).toBeVisible({ timeout: 3000 })

    const inputs = page.locator('.q-dialog input[type="password"]')
    await inputs.nth(0).fill('Password1!')
    await inputs.nth(1).fill('Password2!')
    const salvaBtn = page.locator('.q-dialog button:has-text("Salva")')
    await expect(salvaBtn).toBeDisabled()
  })

  test('CPW-03: Annulla chiude dialog senza cambiare @smoke', async ({ page }) => {
    await loginAs(page, 'volontario', auth)
    await expect(page).toHaveURL(/\/famiglie/, { timeout: 15000 })

    await page.locator('.q-btn-dropdown').click()
    await page.locator('text=Cambia password').click()
    await expect(page.locator('.q-dialog')).toBeVisible({ timeout: 3000 })
    await page.locator('.q-dialog button:has-text("Annulla")').click()
    await expect(page.locator('.q-dialog')).not.toBeVisible({ timeout: 3000 })
  })
})
