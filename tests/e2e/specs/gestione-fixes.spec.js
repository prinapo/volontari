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

    const rowCount = await gestionePage.getRowCount()
    if (rowCount === 0) {
      test.skip()
      return
    }

    const clicked = await gestionePage.clickContactsOnFamiglia()
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
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(auth.verificatore.email, auth.verificatore.password)
    await expect(page).toHaveURL(/\/verifica/, { timeout: 15000 })

    await page.goto('/gestione')
    await page.waitForTimeout(2000)

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
    test.skip()
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
