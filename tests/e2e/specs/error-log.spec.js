import { test, expect } from '../helpers/console.js'
import { loginAs } from '../helpers/login.js'
import { SubmitPage } from '../pages/SubmitPage.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }
import path from 'path'
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const FIXTURE_PDF = path.resolve(__dirname, '..', 'fixtures', 'test-file-pdf.pdf')

test.describe('Error Log', () => {
  test('EL-01: Tab Errori in AdminPage è accessibile @smoke', async ({ page }) => {
    test.setTimeout(30000)
    await loginAs(page, 'admin', auth)
    await page.goto('/admin')
    await page.waitForTimeout(2000)

    const erroriTab = page.locator('.q-tab').filter({ hasText: 'Errori' })
    await expect(erroriTab).toBeVisible({ timeout: 5000 })
    await erroriTab.click()
    await page.waitForTimeout(500)

    await expect(page.locator('.q-table')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('th:has-text("Livello")')).toBeVisible()
    await expect(page.locator('th:has-text("Data")')).toBeVisible()
  })

  test('EL-02: Errore 400 da SubmitPage viene registrato e visibile in Admin @regression', async ({ page }) => {
    test.setTimeout(60000)

    await loginAs(page, 'admin', auth)

    // 1. Crea errore via SubmitPage (IBAN > 255 caratteri)
    const submitPage = new SubmitPage(page)
    await submitPage.goto()
    await page.waitForTimeout(1500)

    await submitPage.fillForm({
      nome_richiedente: 'Test Errore',
      cognome_richiedente: 'AutoTest',
      email: `test_el02_${Date.now()}@test.com`,
      telefono: '1234567890',
      iban: 'X'.repeat(300),
      intestatario: 'Test Intestatario',
      nome_beneficiario: 'Mario',
      cognome_beneficiario: 'Rossi'
    })

    await submitPage.clickAddGiustificativo()
    await page.waitForTimeout(500)
    await submitPage.fillGiustificativo(0, {
      descrizione: 'Test errore 400',
      importo: 100
    })
    await page.waitForTimeout(500)

    await submitPage.clickSubmit()
    await page.waitForTimeout(3000)

    // 2. Vai in Admin → Errori
    await page.goto('/admin')
    await page.waitForTimeout(2000)

    const erroriTab = page.locator('.q-tab:has-text("Errori")')
    await expect(erroriTab).toBeVisible({ timeout: 5000 })
    await erroriTab.click()
    await page.waitForTimeout(1000)

    await expect(page.locator('.q-table')).toBeVisible({ timeout: 5000 })
    const errorRow = page.locator('.q-table tbody tr').filter({ hasText: '400' }).first()
    await expect(errorRow).toBeVisible({ timeout: 10000 })
    const rowText = await errorRow.innerText()
    expect(rowText).toMatch(/InviiGiustificativiNoLogin|400/)
  })
})
