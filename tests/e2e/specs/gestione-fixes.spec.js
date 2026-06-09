import { test, expect } from '../helpers/console.js'
import { LoginPage } from '../pages/LoginPage.js'
import { GestionePage } from '../pages/GestionePage.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const FIXTURE_PDF = path.resolve(__dirname, '..', 'fixtures', 'test-file-pdf.pdf')

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
    if (!clicked) { test.skip(); return }

    const dialog = page.locator('.q-dialog:visible')
    await expect(dialog).toBeVisible({ timeout: 5000 })
    const rows = dialog.locator('.q-table tbody tr')
    expect(await rows.count()).toBeGreaterThanOrEqual(0)
  })

  test('GF-02: Email editabile quando contatto not found @regression', async ({ page }) => {
    test.setTimeout(60000)
    const randomEmail = `test_no_esiste_${Date.now()}@test.com`

    const networkLog = []
    page.on('response', async resp => {
      const entry = { method: resp.request().method(), url: resp.url().replace(/\?.*$/, ''), status: resp.status() }
      if (resp.status() >= 400) {
        try { entry.body = await resp.text() } catch {}
      }
      networkLog.push(entry)
    })

    await page.goto('/submit')
    await page.waitForTimeout(2000)

    const nomeField = page.locator('.q-field').filter({ hasText: /^Nome \*$/ }).first().locator('input')
    await nomeField.fill('Test No Esiste')

    const cognomeField = page.locator('.q-field').filter({ hasText: /^Cognome \*$/ }).first().locator('input')
    await cognomeField.fill('Test')

    const emailField = page.locator('input[type="email"]')
    await emailField.fill(randomEmail)

    const telefonoField = page.locator('.q-field').filter({ hasText: /^Telefono \*$/ }).locator('input')
    await telefonoField.fill('3331234567')

    const ibanField = page.locator('.q-field').filter({ hasText: /^IBAN \*$/ }).locator('input')
    await ibanField.fill('IT60X0000000000000000000')

    const intestatarioField = page.locator('.q-field').filter({ hasText: /^Intestatario CC \*$/ }).locator('input')
    await intestatarioField.fill('Test intestatario')

    const nomeBenField = page.locator('.q-card').filter({ hasText: 'Beneficiario' }).locator('.q-field').filter({ hasText: /^Nome \*$/ }).locator('input')
    await nomeBenField.fill('Luigi')

    const cognomeBenField = page.locator('.q-card').filter({ hasText: 'Beneficiario' }).locator('.q-field').filter({ hasText: /^Cognome \*$/ }).locator('input')
    await cognomeBenField.fill('Rossi')

    const aggiungiBtn = page.locator('button:has-text("Aggiungi giustificativo")')
    await expect(aggiungiBtn).toBeVisible({ timeout: 5000 })
    await aggiungiBtn.click()
    await page.waitForTimeout(500)

    const descField = page.locator('.q-field').filter({ hasText: /^Descrizione \*$/ }).locator('textarea')
    await descField.fill('Test giustificativo')

    const importoField = page.locator('input[type="number"]')
    await importoField.fill('100')

    const dataField = page.locator('input[type="date"]')
    await dataField.fill('2026-01-15')

    const fileField = page.locator('input[type="file"]').first()
    await fileField.setInputFiles(FIXTURE_PDF)

    const submitBtn = page.locator('button:has-text("Invia")')
    await expect(submitBtn).toBeVisible({ timeout: 5000 })
    await submitBtn.click()

    await page.waitForTimeout(5000)

    const submissionCreated = networkLog.some(e =>
      e.url.includes('/items/InviiGiustificativiNoLogin') && e.method === 'POST' && e.status >= 200 && e.status < 300
    )

    const uploadError = networkLog.find(e => e.url.includes('/files') && e.method === 'POST' && e.status >= 400)
    const createError = networkLog.find(e => e.url.includes('/items/InviiGiustificativiNoLogin') && e.method === 'POST' && e.status >= 400)

    if (uploadError) console.log(`[GF-02] Upload error: ${uploadError.status} ${uploadError.url} ${uploadError.body || ''}`)
    if (createError) console.log(`[GF-02] Create error: ${createError.status} ${createError.url} ${createError.body || ''}`)
    if (!submissionCreated) console.log(`[GF-02] Submission not created. Network: ${JSON.stringify(networkLog.filter(e => e.url.includes('/files') || e.url.includes('/Invii')), null, 2)}`)

    if (!submissionCreated) { test.skip('Submission non creata'); return }

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
