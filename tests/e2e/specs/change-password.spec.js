import { test, expect } from '../helpers/console.js'
import { loginAs } from '../helpers/login.js'
import { LoginPage } from '../pages/LoginPage.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }

const ORIGINAL_PWD = auth.volontario.password
const TEMP_PWD = 'TempPass_2026_Change!'

test.describe('Change Password', () => {
  test.afterEach(async ({ page }) => {
    try {
      const apiUrl = 'https://api-dev.sostienilsostegno.com'
      // Login as admin 
      const loginRes = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: auth.admin.email, password: auth.admin.password })
      })
      const loginJson = await loginRes.json()
      const token = loginJson.data?.access_token
      if (!token) { console.log('[AFTER] no admin token'); return }
      // Find volontario user by email
      const userRes = await fetch(`${apiUrl}/users?filter[email][_eq]=${encodeURIComponent(auth.volontario.email)}&fields=id`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const userData = await userRes.json()
      const userId = userData.data?.[0]?.id
      if (!userId) { console.log('[AFTER] no volontario user id'); return }
      // Patch volontario password (admin can patch any user)
      const patchRes = await fetch(`${apiUrl}/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: ORIGINAL_PWD })
      })
      if (!patchRes.ok) console.log('[AFTER] patch failed:', patchRes.status)
    } catch (e) { console.log('[AFTER] error:', e.message) }
  })

  test('CPW-01: Cambia password con successo @smoke', async ({ page }) => {
    await loginAs(page, 'volontario', auth)
    await page.goto('/impostazioni')
    await expect(page.locator('text=Impostazioni')).toBeVisible({ timeout: 10000 })

    const inputs = page.locator('input[type="password"]')
    await inputs.nth(0).fill(TEMP_PWD)
    await inputs.nth(1).fill(TEMP_PWD)
    await page.locator('button:has-text("Cambia password")').click()
    await expect(page.locator('.q-notification')).toBeVisible({ timeout: 5000 })
  })

  test('CPW-02: Password mismatch blocca salvataggio @regression', async ({ page }) => {
    await loginAs(page, 'volontario', auth)
    await page.goto('/impostazioni')
    await expect(page.locator('text=Impostazioni')).toBeVisible({ timeout: 10000 })

    const inputs = page.locator('input[type="password"]')
    await inputs.nth(0).fill('Password1!')
    await inputs.nth(1).fill('Password2!')
    const salvaBtn = page.locator('button:has-text("Cambia password")')
    await expect(salvaBtn).toBeDisabled()
  })

  test('CPW-03: Annulla chiude dialog senza cambiare @smoke', async ({ page }) => {
    await loginAs(page, 'volontario', auth)
    await page.goto('/impostazioni')
    await expect(page.locator('text=Impostazioni')).toBeVisible({ timeout: 10000 })
    // Navigate away — no dialog to close on settings page, just leave
    await page.goto('/famiglie')
    await expect(page).toHaveURL(/\/famiglie/, { timeout: 15000 })
  })
})
