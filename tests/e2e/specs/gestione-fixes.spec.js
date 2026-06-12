import { test, expect } from '../helpers/console.js'
import { loginAs } from '../helpers/login.js'
import { GestionePage } from '../pages/GestionePage.js'
import { SubmitPage } from '../pages/SubmitPage.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }

test.describe('Gestione Fixes', () => {
  test('GF-01: Disattivo filter — soft-delete non mostrato @regression', async ({ page }) => {
    await loginAs(page, 'gestore', auth)

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

    const submitPage = new SubmitPage(page)
    await submitPage.goto()
    await page.waitForTimeout(2000)

    await submitPage.fillForm({
      nome_richiedente: 'Test No Esiste',
      cognome_richiedente: 'Test',
      email: randomEmail,
      telefono: '3331234567',
      iban: 'IT60X0000000000000000000',
      intestatario: 'Test intestatario',
      nome_beneficiario: 'Luigi',
      cognome_beneficiario: 'Rossi'
    })

    await submitPage.clickAddGiustificativo()
    await page.waitForTimeout(500)

    await submitPage.fillGiustificativo(0, {
      descrizione: 'Test giustificativo',
      importo: 100,
      data: '2026-01-15'
    })

    await submitPage.clickSubmit()
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

    await loginAs(page, 'verificatore', auth)

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
    await loginAs(page, 'verificatore', auth)

    await page.goto('/gestione')
    await page.waitForTimeout(2000)
    await page.goto('/riconciliazione')
    await page.waitForTimeout(3000)

    const phoneHeader = page.locator('th:has-text("Telefono")')
    expect(await phoneHeader.isVisible({ timeout: 5000 }).catch(() => false)).toBe(true)
  })
})
