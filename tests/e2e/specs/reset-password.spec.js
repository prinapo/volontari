import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test, expect } from '../helpers/console.js'
import { waitForResetLink } from '../helpers/email.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const AUTH_EMAIL_PATH = resolve(__dirname, '..', 'fixtures', 'auth-email.json')
const hasAuthEmail = existsSync(AUTH_EMAIL_PATH)
const authEmailFixture = hasAuthEmail ? JSON.parse(readFileSync(AUTH_EMAIL_PATH, 'utf8')) : null

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
    page.expectApiError('/auth/password/reset')
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
  test('RP-10: Reset password reale via email @e2e', async ({ page }) => {
    test.setTimeout(180_000)
    if (!hasAuthEmail || !authEmailFixture?.email) {
      test.skip('auth-email.json non trovato')
      return
    }

    const startTime = new Date()

    // 1. Richiedi reset password
    await page.goto('/login')
    await page.locator('button:has-text("Password dimenticata")').click()
    await expect(page.locator('.q-dialog')).toBeVisible({ timeout: 3000 })
    await page.locator('.q-dialog input').fill(authEmailFixture.email)
    await page.locator('.q-dialog button:has-text("Invia link")').click()
    await expect(page.locator('.q-notification')).toBeVisible({ timeout: 5000 })
    await page.waitForLoadState('networkidle').catch(() => {})

    // 2. Aspetta email via IMAP ed estrai URL col token
    let resetUrl
    try {
      resetUrl = await waitForResetLink(120_000, startTime)
    } catch {
      test.skip('Email di reset non ricevuta')
      return
    }
    const token = new URL(resetUrl).searchParams.get('token')

    // 4. Reimposta password nella nostra app
    await page.goto(`/reset-password?token=${token}`)
    await expect(page.locator('.text-h6:text-is("Reimposta password")')).toBeVisible()
    const inputs = page.locator('input[type="password"]')
    await inputs.nth(0).fill(TEMP_PWD)
    await inputs.nth(1).fill(TEMP_PWD)
    await page.locator('button:has-text("Reimposta password")').click()
    await expect(page.locator('.text-h6:text-is("Password aggiornata")')).toBeVisible({ timeout: 5000 })
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 })

    // 5. Login con nuova password per verificare
    await page.locator('[data-testid="login-email"]').fill(authEmailFixture.email)
    await page.locator('[data-testid="login-password"]').fill(TEMP_PWD)
    await page.locator('[data-testid="login-submit"]').click()
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 })
  })
})
