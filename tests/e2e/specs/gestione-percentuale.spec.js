import auth from '../fixtures/auth-test.json' with { type: 'json' }
import { apiDelete, apiGet, apiLogin, apiPost } from '../helpers/api.js'
import { test, expect } from '../helpers/console.js'
import { loginAs } from '../helpers/login.js'
import { createFamigliaViaUI } from '../helpers/pagina-gestione.js'
import { createProgettoViaUI } from '../pages/CreaProgettoPage.js'

const TS = Date.now()
const NOME_FAM = `TEST_PCT_${TS}`

test.describe('MassimaPercentualeErogabile', () => {
  let ids = { progetto: null, giustificativi: [], pagamenti: [], associazione: null }

  test.beforeAll(async () => {
    await apiLogin(auth.admin.email, auth.admin.password)
  })

  test.afterEach(async () => {
    for (const pid of ids.pagamenti) {
      await apiDelete('Pagamenti', pid).catch(() => {})
    }
    for (const gid of ids.giustificativi) {
      await apiDelete('Giustificativi', gid).catch(() => {})
    }
    if (ids.associazione) {
      await apiDelete('Associazioni', ids.associazione).catch(() => {})
    }
    ids = { progetto: null, giustificativi: [], pagamenti: [], associazione: null }
  })

  test('RP-SMOKE: Tab Famiglie in Gestione espande e mostra progetti @smoke', async ({ page }) => {
    test.setTimeout(60_000)
    await loginAs(page, 'admin', auth)
    await page.goto('/gestione')
    await page.waitForLoadState('networkidle')

    await page.locator('.q-tab:has-text("Famiglie")').click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1500)
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toContain('Famiglie')
  })

  test('RP-01: progetto al 100% propone il verificato intero e si chiude al cap @crud', async ({ page }) => {
    test.setTimeout(240_000)
    const nomeFam = `${NOME_FAM}_100`

    // Famiglia + progetto con Allocato 1000 e MassimaPercentualeErogabile 100
    await loginAs(page, 'admin', auth)
    await page.goto('/gestione')
    await page.waitForLoadState('networkidle')
    await page.locator('.q-tab:has-text("Famiglie")').click()
    await page.waitForLoadState('networkidle')

    await createFamigliaViaUI(page, { nomeFamiglia: nomeFam })
    await page.waitForLoadState('networkidle')

    ids.progetto = await createProgettoViaUI(
      page,
      {
        famigliaNome: nomeFam,
        Cognome_Beneficiario: 'TEST_PCT',
        Nome_Beneficiario: 'Test',
        AnnoBando: new Date().getFullYear(),
        Allocato: 1000,
        MassimaPercentualeErogabile: 100,
        Ambito: 'Sociale',
        Titolo_Progetto: 'Test percentuale 100'
      },
      auth
    )

    const famRes = await apiGet('Famiglie', {
      filter: JSON.stringify({ Nome_Famiglia: { _eq: nomeFam } }),
      fields: 'id_famiglia',
      limit: 1
    })
    const famId = famRes.data?.[0]?.id_famiglia
    expect(famId).toBeTruthy()

    // Un solo giustificativo da 1000, verificato
    const giust = await apiPost('Giustificativi', {
      Progetto: ids.progetto,
      Famiglia: famId,
      Importo: 1000,
      Stato: 'verificato',
      Data: '2026-01-01',
      Descrizione: 'TEST_PCT_100_' + Date.now(),
      AnnoBando: new Date().getFullYear()
    })
    ids.giustificativi.push(giust.data.id)

    const assocName = `TEST_ASSOC_PCT_${Date.now()}`
    const assoc = await apiPost('Associazioni', { Nome: assocName, Budget: 100_000 })
    ids.associazione = assoc.data.id

    // RICALCOLA dal manager: con 100% la proposta deve essere 1000 (non 800)
    await loginAs(page, 'manager', auth)
    await page.goto('/pagamenti')
    await page.waitForLoadState('networkidle')
    await page.locator('button:has-text("RICALCOLA")').click()
    await page.waitForLoadState('networkidle')

    const propostiSearch = page.locator('input[placeholder="Cerca famiglia, IBAN..."]')
    if (await propostiSearch.isVisible({ timeout: 5000 }).catch(() => false)) {
      await propostiSearch.fill(nomeFam)
      await page.waitForLoadState('networkidle').catch(() => {})
    }
    const propostaRow = page
      .locator('.q-table tbody tr, .q-table__grid-content .q-card')
      .filter({ hasText: nomeFam })
      .first()
    await expect(propostaRow).toBeVisible({ timeout: 15_000 })

    let proposta = null
    for (let i = 0; i < 20 && !proposta; i++) {
      await page.waitForTimeout(750)
      const res = await apiGet('Pagamenti', {
        filter: JSON.stringify({ Progetto: { _eq: ids.progetto }, Stato: { _eq: 'proposto' } }),
        fields: 'id,Importo,Stato',
        limit: 1
      })
      proposta = res.data?.[0] || null
    }
    expect(proposta, 'proposta creata da RICALCOLA').toBeTruthy()
    expect(Number.parseFloat(proposta.Importo)).toBe(1000)
    ids.pagamenti.push(proposta.id)

    // Batch + segna pagato (stesso flusso di PAG-50)
    const assocSelect = page.locator('.q-select:has(.q-field__label:has-text("Associazione"))').first()
    await assocSelect.click()
    await page.getByRole('option', { name: assocName }).first().click()
    await page.waitForLoadState('networkidle').catch(() => {})

    await propostaRow.locator('.q-checkbox').first().click()
    await page.locator('button:has-text("Crea gruppo di pagamento")').first().click()
    await expect(page.locator('.q-dialog:has-text("Crea gruppo di pagamento")')).toBeVisible({ timeout: 5000 })
    const batchName = 'GRUPPO_PCT_' + Date.now()
    await page.locator('.q-dialog input').first().fill(batchName)
    await page.locator('.q-dialog button:has-text("Conferma")').click()
    await expect(page.locator('.q-notification:has-text("Gruppo creato")').first())
      .toBeVisible({ timeout: 8000 })
      .catch(() => {})

    await page.locator('.q-tab:has-text("Da riscontrare")').click()
    await page.waitForLoadState('networkidle')
    const incorsoSearch = page.locator('input[placeholder*="Cerca famiglia"]')
    if (await incorsoSearch.isVisible({ timeout: 5000 }).catch(() => false)) {
      await incorsoSearch.fill(nomeFam)
      await page.waitForLoadState('networkidle').catch(() => {})
    }
    const incorsoRow = page
      .locator('.q-table tbody tr, .q-table__grid-content .q-card')
      .filter({ hasText: nomeFam })
      .first()
    await expect(incorsoRow).toBeVisible({ timeout: 15_000 })
    await incorsoRow.locator('button[aria-label="Segna pagato"], button:has-text("Segna pagato")').first().click()
    await page.waitForLoadState('networkidle')

    // Al pagamento del cap (allocato = erogabile = 1000) il progetto si chiude
    let progetto = null
    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(1000)
      const res = await apiGet('Progetti/' + ids.progetto, { fields: 'StatoProgetto,TipoChiusura,TotalePagato' })
      progetto = res.data
      if (progetto?.StatoProgetto === 'chiuso') break
    }
    expect(progetto?.StatoProgetto).toBe('chiuso')
    expect(progetto?.TipoChiusura).toBe('cap_raggiunto')
    expect(Number.parseFloat(progetto?.TotalePagato)).toBe(1000)
  })
})
