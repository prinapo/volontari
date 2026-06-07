import { test, expect } from '../helpers/console.js'
import { LoginPage } from '../pages/LoginPage.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }

const testUser = auth.volontario

test.describe('Authentication', () => {
  let loginPage

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page)
  })

  test('A-01: Login con credenziali valide @smoke', async ({ page }) => {
    await loginPage.goto()
    await loginPage.login(testUser.email, testUser.password)
    await expect(page).toHaveURL(/\/famiglie/)
    const token = await page.evaluate(() => localStorage.getItem('access_token'))
    expect(token).toBeTruthy()
  })

  test('A-02: Logout pulisce sessione e blocca accesso diretto @smoke', async ({ page }) => {
    await loginPage.goto()
    await loginPage.login(testUser.email, testUser.password)
    await expect(page).toHaveURL(/\/famiglie/)

    await page.locator('.q-btn-dropdown').click()
    await page.locator('text=Esci').click()
    await expect(page).toHaveURL(/\/login/)

    const token = await page.evaluate(() => localStorage.getItem('access_token'))
    expect(token).toBeNull()

    await page.goto('/famiglie')
    await expect(page).toHaveURL(/\/login/)
  })

  test('A-03: Login fallito mostra errore @regression', async ({ page }) => {
    await loginPage.goto()
    await loginPage.login(testUser.email, 'wrong_password')
    await expect(page).toHaveURL(/\/login/)
    await expect(page.locator('.text-negative')).toBeVisible({ timeout: 5000 })
  })

  test('A-04: Privazione token forza redirect a login @regression', async ({ page }) => {
    await loginPage.goto()
    await loginPage.login(testUser.email, testUser.password)
    await expect(page).toHaveURL(/\/famiglie/)

    // Rimuovi token e ricarica — il sistema deve reindirizzare a login
    await page.evaluate(() => localStorage.removeItem('access_token'))
    await page.reload()
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })
})

test.describe('Pagine Pubbliche', () => {
  test('SP-01: SubmitPage si carica senza errori console @smoke', async ({ page }) => {
    await page.goto('/submit')
    await expect(page.locator('.submit-page')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=Invio giustificativi')).toBeVisible()
  })
})
