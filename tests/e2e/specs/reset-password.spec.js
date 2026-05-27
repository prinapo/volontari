import { test, expect } from '../helpers/console.js'
import { LoginPage } from '../pages/LoginPage.js'
import auth from '../fixtures/auth-email.json' with { type: 'json' }
import { waitForResetLink } from '../helpers/email.js'

const TEMP_PWD = 'TempPwdRound1!'

test.describe('ResetPasswordPage — UI', () => {
  test('RP-01: Nessun token mostra link non valido @smoke', async ({ page }) => {
    await page.goto('/reset-password')
    await expect(page.locator('text=Link non valido')).toBeVisible()
    await expect(page.locator('text=Torna al login')).toBeVisible()
  })

  test('RP-02: Token valido submit con password matching mostra successo @smoke', async ({ page }) => {
    await page.route('**/auth/password/reset', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    })
    await page.goto('/reset-password?token=fake-token')
    await expect(page.locator('.text-h6:text-is("Reimposta password")')).toBeVisible()
    const inputs = page.locator('input[type="password"]')
    await inputs.nth(0).fill(TEMP_PWD)
    await inputs.nth(1).fill(TEMP_PWD)
    await page.locator('button:has-text("Reimposta password")').click()
    await expect(page.locator('.text-h6:text-is("Password aggiornata")')).toBeVisible({ timeout: 5000 })
  })

  test('RP-03: Password mismatch mostra errore @regression', async ({ page }) => {
    await page.goto('/reset-password?token=fake-token')
    const inputs = page.locator('input[type="password"]')
    await inputs.nth(0).fill('PasswordUno!')
    await inputs.nth(1).fill('PasswordDue!')
    await page.locator('button:has-text("Reimposta password")').click()
    await expect(page.locator('text=Le password non coincidono')).toBeVisible()
  })

  test('RP-04: Errore API mostra messaggio errore @regression', async ({ page }) => {
    await page.route('**/auth/password/reset', async route => {
      await route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({ errors: [{ message: 'Token non valido o scaduto' }] })
      })
    })
    await page.goto('/reset-password?token=expired-token')
    const inputs = page.locator('input[type="password"]')
    await inputs.nth(0).fill(TEMP_PWD)
    await inputs.nth(1).fill(TEMP_PWD)
    await page.locator('button:has-text("Reimposta password")').click()
    await expect(page.locator('text=Token non valido o scaduto')).toBeVisible({ timeout: 5000 })
  })

  test('RP-05: Dopo successo reindirizza a login @smoke', async ({ page }) => {
    await page.route('**/auth/password/reset', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    })
    await page.goto('/reset-password?token=fake-token')
    const inputs = page.locator('input[type="password"]')
    await inputs.nth(0).fill(TEMP_PWD)
    await inputs.nth(1).fill(TEMP_PWD)
    await page.locator('button:has-text("Reimposta password")').click()
    await expect(page.locator('.text-h6:text-is("Password aggiornata")')).toBeVisible({ timeout: 5000 })
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 })
  })
})

test.describe('ResetPasswordPage — Full E2E', () => {
  test('RP-10: Reset password reale via email e ripristino @e2e', async ({ page }) => {
    // 1. Forgot password — richiedi reset
    await page.goto('/login')
    await page.locator('button:has-text("Password dimenticata")').click()
    await expect(page.locator('.q-dialog')).toBeVisible({ timeout: 3000 })
    await page.locator('.q-dialog input').fill(auth.email)
    await page.locator('.q-dialog button:has-text("Invia link")').click()
    await expect(page.locator('.q-notification')).toBeVisible({ timeout: 5000 })
    await page.waitForTimeout(1000)

    // 2. Intercetta email via IMAP ed estrai il token
    const resetLink = await waitForResetLink(30000)
    const token = new URL(resetLink).searchParams.get('token')

    // 3. Reset password
    await page.goto(`/reset-password?token=${token}`)
    await expect(page.locator('.text-h6:text-is("Reimposta password")')).toBeVisible()
    const inputs = page.locator('input[type="password"]')
    await inputs.nth(0).fill(TEMP_PWD)
    await inputs.nth(1).fill(TEMP_PWD)
    await page.locator('button:has-text("Reimposta password")').click()
    await expect(page.locator('.text-h6:text-is("Password aggiornata")')).toBeVisible({ timeout: 5000 })
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 })

    // 4. Login con nuova password
    const loginPage = new LoginPage(page)
    await loginPage.login(auth.email, TEMP_PWD)
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 })

    // 5. Logout e richiedi secondo reset
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
    await page.goto('/login')
    await page.locator('button:has-text("Password dimenticata")').click()
    await expect(page.locator('.q-dialog')).toBeVisible({ timeout: 3000 })
    await page.locator('.q-dialog input').fill(auth.email)
    await page.locator('.q-dialog button:has-text("Invia link")').click()
    await expect(page.locator('.q-notification')).toBeVisible({ timeout: 5000 })
    await page.waitForTimeout(1000)

    // 6. Intercetta seconda email
    const secondLink = await waitForResetLink(30000)
    const token2 = new URL(secondLink).searchParams.get('token')

    // 7. Ripristina password originale
    await page.goto(`/reset-password?token=${token2}`)
    await expect(page.locator('.text-h6:text-is("Reimposta password")')).toBeVisible()
    const inputs2 = page.locator('input[type="password"]')
    await inputs2.nth(0).fill(auth.password)
    await inputs2.nth(1).fill(auth.password)
    await page.locator('button:has-text("Reimposta password")').click()
    await expect(page.locator('.text-h6:text-is("Password aggiornata")')).toBeVisible({ timeout: 5000 })
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 })

    // 8. Login con password originale
    await loginPage.login(auth.email, auth.password)
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 })
  })
})
