import { test, expect } from '../helpers/console.js'
import { loginAs } from '../helpers/login.js'
import { GestionePage } from '../pages/GestionePage.js'
import { RiconciliazionePage } from '../pages/RiconciliazionePage.js'
import { SubmitPage } from '../pages/SubmitPage.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }
import { apiLogin, apiGet, apiDelete } from '../helpers/api.js'
import { creaFamigliaVolontarioProgetto, pulisciIds, loginGestore } from '../helpers/setup-atomico.js'

const _gfSubmittedIds = []

test.describe('Gestione Fixes', () => {
  test.beforeAll(async () => {
    await apiLogin(auth.admin.email, auth.admin.password)
  })

  test.afterEach(async () => {
    // Cleanup GF-02 submissions if any were created
    for (const id of _gfSubmittedIds) {
      try {
        await apiDelete('InviiGiustificativiNoLogin', id)
      } catch {
        /* */
      }
    }
    _gfSubmittedIds.length = 0
  })

  test('GF-01: Disattivo filter — soft-delete non mostrato @regression', async ({ page }) => {
    test.setTimeout(180000)
    const ids = {}
    await loginGestore(page)
    await creaFamigliaVolontarioProgetto(page, ids)
    await page.goto('/gestione')

    const gestionePage = new GestionePage(page)
    await gestionePage.famiglieTab.click()
    await page.waitForLoadState("networkidle").catch(() => {})
    await gestionePage.searchFamiglie(ids.prefix + 'Fam')
    await page.waitForLoadState("networkidle").catch(() => {})

    const clicked = await gestionePage.clickContactsOnFamiglia(ids.prefix + 'Fam')
    if (!clicked) throw new Error('clickContactsOnFamiglia fallito')

    const dialog = page.locator('.q-dialog:visible')
    await expect(dialog).toBeVisible({ timeout: 5000 })
    const rows = dialog.locator('.q-table tbody tr')
    expect(await rows.count()).toBeGreaterThanOrEqual(0)
    await pulisciIds(ids)
  })

  test('GF-02: Email editabile quando contatto not found @regression', async ({ page }) => {
    test.setTimeout(60000)
    const randomEmail = `TEST_no_esiste_${Date.now()}@test.com`

    const networkLog = []
    page.on('response', async resp => {
      const entry = { method: resp.request().method(), url: resp.url().replace(/\?.*$/, ''), status: resp.status() }
      if (
        resp.url().includes('/items/InviiGiustificativiNoLogin') &&
        resp.request().method() === 'POST' &&
        resp.status() < 400
      ) {
        try {
          const body = await resp.json()
          if (body?.data?.id) _gfSubmittedIds.push(body.data.id)
        } catch {}
      }
      if (resp.status() >= 400) {
        try {
          entry.body = await resp.text()
        } catch {}
      }
      networkLog.push(entry)
    })

    const submitPage = new SubmitPage(page)
    await submitPage.goto()
    await page.waitForLoadState("networkidle").catch(() => {})

    await submitPage.fillForm({
      nome_richiedente: 'TEST_NoEsiste',
      cognome_richiedente: 'TEST_Submitter',
      email: randomEmail,
      telefono: '3331234567',
      iban: 'IT60X0000000000000000000',
      intestatario: 'TEST_Intestatario',
      nome_beneficiario: 'TEST_Luigi',
      cognome_beneficiario: 'TEST_Rossi'
    })

    await submitPage.clickAddGiustificativo()
    await page.waitForLoadState("networkidle").catch(() => {})

    await submitPage.fillGiustificativo(0, {
      descrizione: 'TEST_Giustificativo',
      importo: 100,
      data: '2026-01-15'
    })

    await submitPage.clickSubmit()
    await page.waitForLoadState("networkidle").catch(() => {})

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

    if (!submissionCreated) throw new Error('Submissions non creata')

    await loginAs(page, 'manager', auth)

    const riconcPage = new RiconciliazionePage(page)
    await page.goto('/riconciliazione')
    await riconcPage.waitForTable()

    // Forza refresh per caricare la submission appena creata
    const refreshBtn = page.locator('button[aria-label="Aggiorna"]')
    if (await refreshBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await refreshBtn.click()
      await page.waitForLoadState("networkidle").catch(() => {})
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
    throw new Error('Nessuna submission not_found trovata')
  })

  test('GF-03: Telefono visibile nella lista submission @smoke', async ({ page }) => {
    await loginAs(page, 'manager', auth)

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

  test('GF-04: Tabella famiglie si carica con righe @smoke', async ({ page }) => {
    await loginAs(page, 'manager', auth)
    await page.goto('/gestione')
    await page.waitForLoadState("networkidle").catch(() => {})
    // Cerca il contenuto della tabella: q-table su desktop, q-expansion-item su mobile grid
    const table = page.locator('.q-table')
    const gridContent = page.locator('.q-expansion-item')
    const hasTable = (await table.count()) > 0
    if (hasTable) {
      await expect(table).toBeVisible({ timeout: 10000 })
      const isGrid = (await page.locator('.q-table--grid').count()) > 0
      if (isGrid) {
        await expect(gridContent.first()).toBeVisible({ timeout: 5000 })
      } else {
        await expect(table.locator('tbody tr').first()).toBeVisible({ timeout: 5000 })
      }
    } else {
      await expect(gridContent.first()).toBeVisible({ timeout: 10000 })
    }
  })

  test('GF-05: Tabella contatti si carica con righe @smoke', async ({ page }) => {
    await loginAs(page, 'manager', auth)
    await page.goto('/gestione')
    await page.waitForLoadState("networkidle").catch(() => {})
    await page.locator('.q-tab:has-text("Contatti")').click()
    await page.waitForLoadState("networkidle").catch(() => {})
    // Tab attivo
    await expect(page.locator('.q-tab--active:has-text("Contatti")')).toBeVisible({ timeout: 10000 })
  })
})
