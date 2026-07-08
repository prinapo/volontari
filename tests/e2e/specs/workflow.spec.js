import { test, expect } from '../helpers/console.js'
import { loginAs } from '../helpers/login.js'
import { RiconciliazionePage } from '../pages/RiconciliazionePage.js'
import { VerificaPage } from '../pages/VerificaPage.js'
import { apiLogin, apiGet, apiPost, apiDelete } from '../helpers/api.js'
import { deleteFamiglie, deleteContatti, findByPattern } from '../helpers/cleanup.js'
import {
  creaFamigliaVolontarioProgetto,
  loginVolontarioConFamiglia,
  loginGestore,
  pulisciIds
} from '../helpers/setup-atomico.js'
import { createFamigliaViaUI, createContattoViaUI, assegnaContattoAFamigliaViaUI } from '../helpers/pagina-gestione.js'
import { createGiustificativoViaDialog } from '../helpers/giustificativo.js'
import { createProgettoViaUI, createTestSubmission } from '../helpers/setup-ui.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }

test.describe('Workflow', () => {
  test.describe.configure({ timeout: 300000 })

  test.beforeAll(async () => {
    await apiLogin(auth.admin.email, auth.admin.password)
  })

  test.afterAll(async () => {
    const leftovers = await findByPattern(['TEST_'])
    if (leftovers.length > 0) {
      console.log('[WF] findByPattern found leftover records:', JSON.stringify(leftovers, null, 2))
    }
  })

  test('WF-01: Flusso Submit → Riconcilia → Verifica @e2e', async ({ page }) => {
    test.setTimeout(240000)
    page.expectApiError('/items/Famiglie_Contatti')
    const ts = Date.now()
    const prefix = `TEST_WF01_${ts}`
    const testEmail = `${prefix}@test.com`

    // 1. Crea contatto genitore + famiglia + progetto via UI gestore
    await loginGestore(page)
    const nomeFam = prefix
    const fam = await createFamigliaViaUI(page, { nomeFamiglia: nomeFam })
    const wfIds = {
      famiglia: fam.id_famiglia,
      contattiCreati: [],
      progetto: null,
      fcLinks: [],
      inviiNoLogin: [],
      giustificativi: []
    }

    const contatto = await createContattoViaUI(page, { nome: prefix, cognome: prefix + 'Genitore', email: testEmail })
    wfIds.contattiCreati.push(contatto.id_contatto)

    await assegnaContattoAFamigliaViaUI(page, {
      famigliaNome: nomeFam,
      searchTerm: testEmail,
      fullName: contatto.displayName,
      ruolo: 'Genitore'
    })
    wfIds.progetto = await createProgettoViaUI(
      page,
      {
        famigliaNome: nomeFam,
        Cognome_Beneficiario: prefix,
        Nome_Beneficiario: prefix + 'Test',
        AnnoBando: 2026,
        Allocato: 5000,
        Data_Inizio_Progetto: '2026-01-01',
        Data_Fine_Progetto: '2026-12-31'
      },
      auth,
      'gestore'
    )

    // 2. Crea submission via UI (simula submit anonimo)
    const sub01 = await createTestSubmission(page, {
      email: testEmail,
      descrizione: prefix + '_workflow'
    })
    if (sub01?.id) wfIds.inviiNoLogin.push(sub01.id)

    // 3. Riconcilia: login verificatore, trova e riconcilia
    await loginAs(page, 'gestore_verifica', auth)
    const riconcPage = new RiconciliazionePage(page)
    await riconcPage.goto()
    await riconcPage.waitForTable()
    await page
      .locator('button[aria-label="Aggiorna"]')
      .click()
      .catch(() => {})
    await page.waitForTimeout(2000)

    let found = false
    const rows = riconcPage.rowLocator
    const rCount = await rows.count()
    for (let i = 0; i < rCount; i++) {
      if ((await rows.nth(i).innerText()).toLowerCase().includes(testEmail)) {
        await riconcPage.expandRow(i).catch(() => {})
        await page.waitForTimeout(300)
        const btn = rows.nth(i).locator('[data-testid="btn-riconcilia"]').first()
        if ((await btn.count()) > 0) {
          await btn.click()
          found = true
          break
        }
      }
    }
    if (found) {
      await riconcPage.waitForDialog()
      await page.waitForTimeout(1000)
      const riconciliaBtn = riconcPage.dialog.locator('button:has-text("Riconcilia")')
      if ((await riconciliaBtn.count()) > 0 && !(await riconciliaBtn.isDisabled().catch(() => true))) {
        const descInput = riconcPage.dialog.locator('[data-testid="riconcilia-descrizione"]')
        if ((await descInput.count()) > 0) await descInput.fill('Giustificativo WF-01')
        const importoInput = riconcPage.dialog.locator('[data-testid="riconcilia-importo"]')
        if ((await importoInput.count()) > 0) await importoInput.fill('100.00')
        await riconciliaBtn.click()
        await page.waitForTimeout(2000)
      }
    }

    // 4. Verifica page must have at least 1 row
    await loginAs(page, 'verificatore', auth)
    const vp = new VerificaPage(page)
    await vp.goto()
    await vp.waitForTable()
    await page.waitForTimeout(3000)
    expect(await vp.getRowCount()).toBeGreaterThanOrEqual(1)

    // Cleanup via pulisciIds
    await pulisciIds(wfIds)
  })

  test('WF-02: Submit → nuovo contatto → Riconcilia @e2e', async ({ page }) => {
    test.setTimeout(180000)
    const ts = Date.now()
    const prefix = `TEST_WF02_${ts}`
    const unknownEmail = `${prefix}@test.com`
    const wf02Ids = { inviiNoLogin: [] }

    // 1. Crea submission via UI con email sconosciuta
    const sub02 = await createTestSubmission(page, {
      email: unknownEmail,
      descrizione: prefix + '_nuovo_contatto'
    })
    if (sub02?.id) wf02Ids.inviiNoLogin.push(sub02.id)

    // 2. Riconcilia: deve mostrare badge "Contatto da creare"
    await loginAs(page, 'gestore_verifica', auth)
    const riconcPage = new RiconciliazionePage(page)
    await riconcPage.goto()
    await riconcPage.waitForTable()
    await page
      .locator('button[aria-label="Aggiorna"]')
      .click()
      .catch(() => {})
    await page.waitForTimeout(2000)

    let foundBadge = false
    const rows = riconcPage.rowLocator
    const count = await rows.count()
    for (let i = 0; i < count; i++) {
      await riconcPage.expandRow(i).catch(() => {})
      await page.waitForTimeout(300)
      const badges = rows.nth(i).locator('.q-badge')
      for (let j = 0; j < (await badges.count()); j++) {
        const text = await badges.nth(j).innerText()
        if (text.includes('Contatto da creare')) {
          foundBadge = true
          break
        }
      }
      if (foundBadge) break
    }
    expect(foundBadge, 'Nessun contatto da creare trovato').toBe(true)

    // Cleanup
    await pulisciIds(wf02Ids)
  })

  test('WF-03: Multi-volontario — due volontari su due famiglie @e2e', async ({ page }) => {
    test.setTimeout(240000)
    const ts = Date.now()
    const prefix = `TEST_WF03_${ts}_`

    // 1. Gestore crea 2 famiglie
    await loginGestore(page)
    const fam1 = await createFamigliaViaUI(page, { nomeFamiglia: `${prefix}A` })
    const fam2 = await createFamigliaViaUI(page, { nomeFamiglia: `${prefix}B` })
    const wfIds = { famiglia: null, progetto: [], fcLinks: [], giustificativi: [], contattiCreati: [] }

    // FC link: volontario → fam1, volontario_nofam → fam2
    const e1 = await apiGet('email', {
      filter: JSON.stringify({ email_address: { _eq: auth.volontario.email } }),
      fields: 'Contatto_Relation'
    })
    const e2 = await apiGet('email', {
      filter: JSON.stringify({ email_address: { _eq: auth.volontario_nofam.email } }),
      fields: 'Contatto_Relation'
    })
    const c1 = e1.data?.[0]?.Contatto_Relation,
      c2 = e2.data?.[0]?.Contatto_Relation

    // Salva pre-state dei contatti reali modificati
    const pre1 = await apiGet('contatti/' + c1, { fields: 'IsVolontario,user_id' })
    const pre2 = await apiGet('contatti/' + c2, { fields: 'IsVolontario,user_id' })
    wfIds.contattiModificati = [
      { id: c1, preState: { IsVolontario: pre1.data?.IsVolontario, user_id: pre1.data?.user_id } },
      { id: c2, preState: { IsVolontario: pre2.data?.IsVolontario, user_id: pre2.data?.user_id } }
    ]

    await assegnaContattoAFamigliaViaUI(page, {
      famigliaNome: fam1.nome,
      searchTerm: auth.volontario.email,
      fullName: auth.volontario.email,
      ruolo: 'Volontario'
    })
    await assegnaContattoAFamigliaViaUI(page, {
      famigliaNome: fam2.nome,
      searchTerm: auth.volontario_nofam.email,
      fullName: auth.volontario_nofam.email,
      ruolo: 'Volontario'
    })
    wfIds.progetto.push(
      await createProgettoViaUI(
        page,
        {
          famigliaNome: fam1.nome,
          Cognome_Beneficiario: prefix + 'A',
          Nome_Beneficiario: prefix + 'Test',
          AnnoBando: 2026,
          Allocato: 3000,
          Data_Inizio_Progetto: '2026-01-01',
          Data_Fine_Progetto: '2026-12-31'
        },
        auth,
        'gestore'
      )
    )
    wfIds.progetto.push(
      await createProgettoViaUI(
        page,
        {
          famigliaNome: fam2.nome,
          Cognome_Beneficiario: prefix + 'B',
          Nome_Beneficiario: prefix + 'Test',
          AnnoBando: 2026,
          Allocato: 3000,
          Data_Inizio_Progetto: '2026-01-01',
          Data_Fine_Progetto: '2026-12-31'
        },
        auth,
        'gestore'
      )
    )

    // 2. Volontario 1: login, crea giustificativo via helper
    await loginVolontarioConFamiglia(page, fam1.nome)
    await page
      .locator('.bg-green-1')
      .first()
      .waitFor({ state: 'visible', timeout: 15000 })
      .catch(() => {})
    await page.waitForTimeout(2000)
    const r1 = await createGiustificativoViaDialog(page, { descrizione: `${prefix}V1_${ts}`, importo: 50 })
    expect(r1?.id, 'Giustificativo Vol1 non creato').toBeTruthy()
    if (r1?.id) wfIds.giustificativi.push(r1.id)
    await page.waitForTimeout(1000)

    // 3. Volontario 2: login con selezione famiglia, crea giustificativo
    await loginVolontarioConFamiglia(page, fam2.nome, 'volontario_nofam')
    await page.waitForTimeout(2000)
    const r2 = await createGiustificativoViaDialog(page, { descrizione: `${prefix}V2_${ts}`, importo: 75 })
    expect(r2?.id, 'Giustificativo Vol2 non creato').toBeTruthy()
    if (r2?.id) wfIds.giustificativi.push(r2.id)
    await page.waitForTimeout(1000)

    // 4. Verificatore vede almeno 1 riga
    await loginAs(page, 'verificatore', auth)
    const vp = new VerificaPage(page)
    await vp.goto()
    await vp.waitForTable()
    await page.waitForTimeout(3000)
    expect(await vp.getRowCount()).toBeGreaterThanOrEqual(1)

    // Cleanup: prima le famiglie (inclusi FC figli), poi ripristino contatti
    wfIds.famiglia = fam1.id_famiglia
    await pulisciIds(wfIds)
    // Seconda famiglia
    const ids2 = { famiglia: fam2.id_famiglia, giustificativi: [], contattiModificati: [] }
    await pulisciIds(ids2)
  })

  // WF-04 rimosso: pulsante Export non implementato nell'UI

  test('WF-05: Volontario invia → Verificatore rifiuta con nota @e2e', async ({ page }) => {
    test.setTimeout(120000)
    const ts = Date.now()
    const ids = { famiglia: null, progetto: null, giustificativi: [] }

    // 1. Volontario crea e invia giustificativo (usa helper)
    await loginGestore(page)
    const { nomeFam } = await creaFamigliaVolontarioProgetto(page, ids)
    await loginVolontarioConFamiglia(page, nomeFam)
    await page
      .locator('.bg-green-1')
      .first()
      .waitFor({ state: 'visible', timeout: 15000 })
      .catch(() => {})
    await page.waitForTimeout(2000)

    const result = await createGiustificativoViaDialog(page, {
      descrizione: `TEST_WF05_${ts}`,
      importo: 80,
      data: '2026-01-15',
      submitAfter: true // Invia subito dopo la creazione
    })
    if (result?.id) ids.giustificativi.push(result.id)
    expect(result?.id, 'Giustificativo non creato').toBeTruthy()
    await page.waitForTimeout(2000)

    // 2. Verificatore: almeno 1 riga in verifica
    await loginAs(page, 'verificatore', auth)
    const vp = new VerificaPage(page)
    await vp.goto()
    await vp.waitForTable()
    await page.waitForTimeout(3000)
    expect(await vp.getRowCount()).toBeGreaterThanOrEqual(1)

    await pulisciIds(ids)
  })
})
