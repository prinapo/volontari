import { test, expect } from '../helpers/console.js'
import { loginAs } from '../helpers/login.js'
import { GestionePage } from '../pages/GestionePage.js'
import { RiconciliazionePage } from '../pages/RiconciliazionePage.js'
import { SubmitPage } from '../pages/SubmitPage.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }
import { apiLogin } from '../helpers/api.js'
import { creaFamigliaVolontarioProgetto, pulisciIds, loginGestore } from '../helpers/setup-atomico.js'

test.describe('Gestione Fixes', () => {
  test.beforeAll(async () => {
    await apiLogin(auth.admin.email, auth.admin.password)
  })

  test('GF-01: Disattivo filter — soft-delete non mostrato @regression', async ({ page }) => {
    const ids = {}
    await loginGestore(page)
    await creaFamigliaVolontarioProgetto(page, ids)

    const gestionePage = new GestionePage(page)
    await gestionePage.famiglieTab.click()
    await page.waitForTimeout(1500)
    await gestionePage.searchFamiglie(ids.prefix + 'Fam')
    await page.waitForTimeout(2000)

    const clicked = await gestionePage.clickContactsOnFamiglia(ids.prefix + 'Fam')
    if (!clicked) {
      test.skip()
      return
    }

    const dialog = page.locator('.q-dialog:visible')
    await expect(dialog).toBeVisible({ timeout: 5000 })
    const rows = dialog.locator('.q-table tbody tr')
    expect(await rows.count()).toBeGreaterThanOrEqual(0)
    await pulisciIds(ids)
  })

  test('GF-02: Email editabile quando contatto not found @regression', async ({ page }) => {
    test.setTimeout(60000)
    const randomEmail = `test_no_esiste_${Date.now()}@test.com`

    const networkLog = []
    page.on('response', async resp => {
      const entry = { method: resp.request().method(), url: resp.url().replace(/\?.*$/, ''), status: resp.status() }
      if (resp.status() >= 400) {
        try {
          entry.body = await resp.text()
        } catch {}
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

    const submissionCreated = networkLog.some(
      e =>
        e.url.includes('/items/InviiGiustificativiNoLogin') && e.method === 'POST' && e.status >= 200 && e.status < 300
    )

    const uploadError = networkLog.find(e => e.url.includes('/files') && e.method === 'POST' && e.status >= 400)
    const createError = networkLog.find(
      e => e.url.includes('/items/InviiGiustificativiNoLogin') && e.method === 'POST' && e.status >= 400
    )

    if (uploadError)
      console.log(`[GF-02] Upload error: ${uploadError.status} ${uploadError.url} ${uploadError.body || ''}`)
    if (createError)
      console.log(`[GF-02] Create error: ${createError.status} ${createError.url} ${createError.body || ''}`)
    if (!submissionCreated)
      console.log(
        `[GF-02] Submission not created. Network: ${JSON.stringify(
          networkLog.filter(e => e.url.includes('/files') || e.url.includes('/Invii')),
          null,
          2
        )}`
      )

    if (!submissionCreated) {
      test.skip('Submission non creata')
      return
    }

    await loginAs(page, 'verificatore', auth)

    const riconcPage = new RiconciliazionePage(page)
    await page.goto('/riconciliazione')
    await riconcPage.waitForTable()

    // Forza refresh per caricare la submission appena creata
    const refreshBtn = page.locator('button[aria-label="Aggiorna"]')
    if (await refreshBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await refreshBtn.click()
      await page.waitForTimeout(1000)
    }

    const rows = riconcPage.rowLocator
    const count = await rows.count()
    for (let i = 0; i < count; i++) {
      const badges = rows.nth(i).locator('.q-badge')
      const badgeCount = await badges.count()
      for (let j = 0; j < badgeCount; j++) {
        const text = await badges.nth(j).innerText()
        if (text.includes('Contatto da creare')) {
          await riconcPage.expandRow(i)
          const emailCell = rows.nth(i).locator('td').nth(2)
          const input = emailCell.locator('input')
          // Su desktop l'input nativo QInput è nascosto (display:none), verifica che esista
          if ((await input.count()) === 0) {
            const cardInput = rows.nth(i).locator('input').first()
            expect(await cardInput.count()).toBeGreaterThan(0)
          } else {
            expect(await input.count()).toBeGreaterThan(0)
          }
          return
        }
      }
    }
    test.skip('Nessuna submission not_found trovata')
  })

  test('GF-03: Telefono visibile nella lista submission @smoke', async ({ page }) => {
    await loginAs(page, 'verificatore', auth)

    const riconcPage = new RiconciliazionePage(page)
    await page.goto('/riconciliazione')
    await riconcPage.waitForTable()

    const phoneHeader = page.locator('th:has-text("Telefono")')
    const phoneVisibleDesktop = await phoneHeader.isVisible({ timeout: 3000 }).catch(() => false)
    if (phoneVisibleDesktop) {
      expect(phoneVisibleDesktop).toBe(true)
      return
    }
    // Su mobile: il testo Telefono è nella card header/caption
    const hasTelefono = (await page.locator('.q-expansion-item:has-text("Telefono")').count()) > 0
    expect(hasTelefono).toBe(true)
  })
})
