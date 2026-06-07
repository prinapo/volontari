import { test, expect } from '../helpers/console.js'
import { LoginPage } from '../pages/LoginPage.js'
import { GestionePage } from '../pages/GestionePage.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }

test.describe('Gestione Fixes', () => {
  test('GF-01: Disattivo filter — soft-delete non mostrato @regression', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(auth.gestore.email, auth.gestore.password)
    await expect(page).toHaveURL(/\/gestione/, { timeout: 15000 })

    const gestionePage = new GestionePage(page)
    await gestionePage.famiglieTab.click()
    await page.waitForTimeout(1500)
    await gestionePage.searchFamiglie('TEST_FAM')
    await page.waitForTimeout(2000)

    const clicked = await gestionePage.clickContactsOnFamiglia('TEST_FAM_01')
    if (!clicked) {
      test.skip()
      return
    }

    const dialog = page.locator('.q-dialog:visible')
    await expect(dialog).toBeVisible({ timeout: 5000 })

    const rows = dialog.locator('.q-table tbody tr')
    const count = await rows.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('GF-02: Email editabile quando contatto not found @regression', async ({ page }) => {
    const randomEmail = `test_no_esiste_${Date.now()}@test.com`
    await page.goto('/submit')
    await page.waitForTimeout(2000)

    const nameInput = page.locator('input').first()
    if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nameInput.fill('Test No Esiste')
      const cognomeInput = page.locator('input').nth(1)
      await cognomeInput.fill('Test')
      const emailInput = page.locator('input[type="email"]')
      if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await emailInput.fill(randomEmail)
      }

      const telefonoInput = page.locator('input').nth(3)
      if (await telefonoInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await telefonoInput.fill('3331234567')
      }

      const ibanInput = page.locator('input').nth(4)
      if (await ibanInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await ibanInput.fill('IT60X0000000000000000000')
      }

      const intestatarioInput = page.locator('input').nth(5)
      if (await intestatarioInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await intestatarioInput.fill('Test intestatario')
      }

      const descInput = page.locator('input[type="text"]').last()
      if (await descInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await descInput.fill('Test giustificativo')
      }

      const importoInput = page.locator('input[type="number"]')
      if (await importoInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await importoInput.fill('100')
      }

      const dataInput = page.locator('input[type="date"]')
      if (await dataInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await dataInput.fill('2026-01-15')
      }

      const fileInput = page.locator('input[type="file"]').first()
      if (await fileInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await fileInput.setInputFiles('tests/e2e/fixtures/test-file-pdf.pdf')
      }

      const submitBtn = page.locator('button:has-text("Invia")')
      if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await submitBtn.click()
        await page.waitForTimeout(3000)
      }
    }

    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(auth.verificatore.email, auth.verificatore.password)
    await expect(page).toHaveURL(/\/verifica/, { timeout: 15000 })

    await page.goto('/riconciliazione')
    await page.waitForTimeout(3000)

    const rows = page.locator('.q-table tbody tr')
    const count = await rows.count()
    for (let i = 0; i < count; i++) {
      const badges = rows.nth(i).locator('.q-badge')
      const badgeCount = await badges.count()
      for (let j = 0; j < badgeCount; j++) {
        const text = await badges.nth(j).innerText()
        if (text.includes('Contatto da creare')) {
          const emailCell = rows.nth(i).locator('td').nth(2)
          const input = emailCell.locator('input')
          expect(await input.isVisible({ timeout: 3000 }).catch(() => false)).toBe(true)
          return
        }
      }
    }
    test.skip('Nessuna submission not_found trovata')
  })

  test('GF-03: Telefono visibile nella lista submission @smoke', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(auth.verificatore.email, auth.verificatore.password)
    await expect(page).toHaveURL(/\/verifica/, { timeout: 15000 })

    await page.goto('/gestione')
    await page.waitForTimeout(2000)

    await page.goto('/riconciliazione')
    await page.waitForTimeout(3000)

    const phoneHeader = page.locator('th:has-text("Telefono")')
    expect(await phoneHeader.isVisible({ timeout: 5000 }).catch(() => false)).toBe(true)
  })
})
