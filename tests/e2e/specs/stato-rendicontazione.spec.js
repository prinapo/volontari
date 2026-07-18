import { test, expect } from '../helpers/console.js'
import { loginAs } from '../helpers/login.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }
import { apiLogin } from '../helpers/api.js'
import { findByPattern } from '../helpers/cleanup.js'
import { pulisciIds } from '../helpers/setup-atomico.js'
import { VerificaPage } from '../pages/VerificaPage.js'
import { createFamigliaViaUI, createProgettoViaUI, setupGiustificativiConStato } from '../helpers/setup-ui.js'

test.describe('StatoRendicontazione', () => {
  test.describe.configure({ timeout: 120000 })

  let ids

  test.beforeAll(async () => {
    await apiLogin(auth.admin.email, auth.admin.password)
  })

  test.afterAll(async () => {
    const leftovers = await findByPattern(['TEST_'])
    if (leftovers.length > 0) {
      console.log('[SR] findByPattern found leftover records after all cleanup:', JSON.stringify(leftovers, null, 2))
    }
  })

  test.beforeEach(() => {
    ids = { famiglia: null, progetto: null, giustificativi: [] }
  })

  test.afterEach(async () => {
    await pulisciIds(ids)
  })

  async function creaScenario(page, giustificativi) {
    const prefix = `TEST_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    await loginAs(page, 'manager', auth)
    const fam = await createFamigliaViaUI(page, { nomeFamiglia: prefix })
    ids.famiglia = fam.id_famiglia

    ids.progetto = await createProgettoViaUI(
      page,
      {
        famigliaNome: prefix,
        Cognome_Beneficiario: prefix,
        Nome_Beneficiario: prefix + 'Test',
        AnnoBando: new Date().getFullYear(),
        Allocato: 5000,
        Data_Inizio_Progetto: '2026-01-01',
        Data_Fine_Progetto: '2026-12-31'
      },
      auth
    )

    if (giustificativi.length > 0) {
      await setupGiustificativiConStato(page, {
        prefix,
        giustificativi: giustificativi.map(g => ({
          ...g,
          descrizione: `${prefix}_${g.stato}_${Date.now()}`
        })),
        auth,
        ids
      })
    }
    return prefix
  }

  async function checkStatoRiga(page, prefix, expectedText, expectedClass) {
    const vp = new VerificaPage(page)
    await vp.goto()
    await vp.waitForTable()
    const viewport = await page.viewportSize()
    const isMobile = viewport && viewport.width < 600
    if (isMobile) {
      // Try search first (force fill)
      await vp.searchFamiglia(prefix)
      await page.waitForLoadState("networkidle").catch(() => {})
      const items = page.locator('.verifica-table .q-expansion-item')
      const count = await items.count()
      for (let i = 0; i < count; i++) {
        const text = await items.nth(i).innerText()
        if (text.includes(prefix)) {
          const statoBadge = items.nth(i).locator('.q-badge', { hasText: expectedText }).first()
          if ((await statoBadge.count()) > 0) {
            const badgeText = await statoBadge.innerText()
            expect(badgeText?.trim()).toBe(expectedText)
            if (expectedClass) {
              await expect(statoBadge).toHaveClass(expectedClass)
            }
            return
          }
        }
      }
      throw new Error(`Progetto con prefisso ${prefix} non trovato su mobile (badge ${expectedText} non trovato tra ${count} items)`)
    }
    await vp.searchFamiglia(prefix)
    const text = await vp.getStatoRiga(0)
    expect(text?.trim()).toBe(expectedText)
    const badge = vp.rows.first().locator('.q-badge').first()
    if (expectedClass) {
      await expect(badge).toHaveClass(expectedClass)
    }
  }

  test('SR-03: Nessun giustificativo → Non ricevuta (grey) @smoke', async ({ page }) => {
    const prefix = await creaScenario(page, [])
    await loginAs(page, 'manager', auth)
    await checkStatoRiga(page, prefix, 'Non ricevuta', /bg-grey/)
  })

  test('SR-04: Solo draft → Non ricevuta (grey) @smoke', async ({ page }) => {
    const prefix = await creaScenario(page, [{ stato: 'draft', importo: '50.00' }])
    await loginAs(page, 'manager', auth)
    await checkStatoRiga(page, prefix, 'Non ricevuta', /bg-grey/)
  })

  test('SR-05: Tutti verificati → Pronto (green) @smoke', async ({ page }) => {
    const prefix = await creaScenario(page, [{ stato: 'verificato', importo: '50.00' }])
    await loginAs(page, 'manager', auth)
    await checkStatoRiga(page, prefix, 'Pronto', /bg-positive/)
  })

  test('SR-06: Almeno un inviato → Da verificare (orange) @smoke', async ({ page }) => {
    test.setTimeout(180000)
    const prefix = await creaScenario(page, [{ stato: 'inviato', importo: '50.00' }])
    await loginAs(page, 'manager', auth)
    await checkStatoRiga(page, prefix, 'Da verificare', /bg-orange/)
  })

  test('SR-07: Draft + verificato → Da completare (warning) @smoke', async ({ page }) => {
    test.setTimeout(180000)
    const prefix = await creaScenario(page, [
      { stato: 'draft', importo: '30.00' },
      { stato: 'verificato', importo: '70.00' }
    ])
    await loginAs(page, 'manager', auth)
    await checkStatoRiga(page, prefix, 'Da completare', /bg-warning/)
  })

  test('SR-08: Solo rifiutato → Non ricevuta (grey) @smoke', async ({ page }) => {
    const prefix = await creaScenario(page, [{ stato: 'rifiutato', importo: '50.00' }])
    await loginAs(page, 'manager', auth)
    await checkStatoRiga(page, prefix, 'Non ricevuta', /bg-grey/)
  })

  test('SR-09: Verificato + rifiutato → Da completare (warning) @smoke', async ({ page }) => {
    const prefix = await creaScenario(page, [
      { stato: 'verificato', importo: '30.00' },
      { stato: 'rifiutato', importo: '70.00' }
    ])
    await loginAs(page, 'manager', auth)
    await checkStatoRiga(page, prefix, 'Da completare', /bg-warning/)
  })

  test('SR-10: Draft + rifiutato → Non ricevuta (grey) @smoke', async ({ page }) => {
    const prefix = await creaScenario(page, [
      { stato: 'draft', importo: '30.00' },
      { stato: 'rifiutato', importo: '70.00' }
    ])
    await loginAs(page, 'manager', auth)
    await checkStatoRiga(page, prefix, 'Non ricevuta', /bg-grey/)
  })

  test('SR-FLOW-01: Flusso completo invia→verifica→chiudi @e2e', async ({ page }) => {
    test.setTimeout(180000)
    const ts = Date.now()
    const prefix = `TEST_FLOW_${ts}`
    const idsFlow = { famiglia: null, progetto: null, giustificativi: [] }

    // Setup: famiglia via UI + progetto via UI + giustificativo in stato 'inviato'
    await loginAs(page, 'manager', auth)
    const fam = await createFamigliaViaUI(page, { nomeFamiglia: prefix })
    idsFlow.famiglia = fam.id_famiglia

    idsFlow.progetto = await createProgettoViaUI(
      page,
      {
        famigliaNome: prefix,
        Cognome_Beneficiario: prefix,
        Nome_Beneficiario: prefix + 'Flow',
        AnnoBando: new Date().getFullYear(),
        Allocato: 5000,
        Data_Inizio_Progetto: '2026-01-01',
        Data_Fine_Progetto: '2026-12-31'
      },
      auth
    )

    await setupGiustificativiConStato(page, {
      prefix,
      giustificativi: [{ stato: 'inviato', importo: '75.00', descrizione: `${prefix}_inviato_${ts}` }],
      auth,
      ids: idsFlow
    })

    const vp = new VerificaPage(page)

    // 1. Verificatore: vede "Da verificare" sul badge
    await loginAs(page, 'manager', auth)
    await vp.goto()
    await vp.waitForTable()
    await vp.searchFamiglia(prefix)
    expect((await vp.getStatoRiga(0))?.trim()).toBe('Da verificare')
    let badge = vp.rows.first().locator('.q-badge', { hasText: 'Da verificare' }).first()
    if ((await badge.count()) === 0) badge = vp.rows.first().locator('.q-badge').first()
    await expect(badge).toHaveClass(/bg-orange/)

    // 2. Verificatore: espande e clicca Verifica
    await vp.expandRow(0)
    const verifyBtn = page.locator('[data-testid="btn-verify"]').first()
    if (await verifyBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await verifyBtn.click()
      await page.waitForLoadState("networkidle").catch(() => {})
    }

    // 3. Verificatore: vede "Pronto" dopo verifica
    await vp.goto()
    await vp.waitForTable()
    await vp.searchFamiglia(prefix)
    expect((await vp.getStatoRiga(0))?.trim()).toBe('Pronto')
    badge = vp.rows.first().locator('.q-badge', { hasText: 'Pronto' }).first()
    if ((await badge.count()) === 0) badge = vp.rows.first().locator('.q-badge').first()
    await expect(badge).toHaveClass(/bg-positive/)

    // Cleanup via pulisciIds
    await pulisciIds(idsFlow)
  })
})
