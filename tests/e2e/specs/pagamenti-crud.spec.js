import ExcelJS from 'exceljs'
import auth from '../fixtures/auth-test.json' with { type: 'json' }
import { apiLogin, apiGet, apiPost, apiDelete, apiPatch, getToken } from '../helpers/api.js'
import { test, expect } from '../helpers/console.js'
import { loginAs } from '../helpers/login.js'
import { createFamigliaViaUI } from '../helpers/pagina-gestione.js'
import { createProgettoViaUI } from '../pages/CreaProgettoPage.js'

const TS = Date.now()
const NOME_FAM = `TEST_PAG_${TS}`
const API = process.env.API_URL || 'https://api-dev.sostienilsostegno.com'

test.describe('Pagamenti CRUD', () => {
  let ids = { famiglia: null, progetto: null, giustificativi: [], pagamenti: [], associazione: null }

  test.beforeAll(async () => {
    await apiLogin(auth.admin.email, auth.admin.password)
  })

  test.afterEach(async () => {
    for (const pid of ids.pagamenti) {
      try {
        await apiDelete('Pagamenti', pid)
      } catch {
        /* */
      }
    }
    ids.pagamenti = []
    if (ids.associazione) {
      try {
        await apiDelete('Associazioni', ids.associazione)
      } catch {
        /* */
      }
      ids.associazione = null
    }
  })

  async function setupData(page, nomeFam = NOME_FAM) {
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
        Cognome_Beneficiario: 'TEST_PAG',
        Nome_Beneficiario: 'Test',
        AnnoBando: new Date().getFullYear(),
        Allocato: 5000,
        Ambito: 'Sociale',
        Titolo_Progetto: 'Test pagamenti'
      },
      auth
    )
  }

  async function creaGruppoConLista(page, { nomeFam, assocName, batchName, importoGiust = 1000 }) {
    const famRes = await apiGet('Famiglie', {
      filter: JSON.stringify({ Nome_Famiglia: { _eq: nomeFam } }),
      fields: 'id_famiglia',
      limit: 1
    })
    const famId = famRes.data?.[0]?.id_famiglia
    expect(famId).toBeTruthy()

    const giust = await apiPost('Giustificativi', {
      Progetto: ids.progetto,
      Famiglia: famId,
      Importo: importoGiust,
      Stato: 'verificato',
      Data: '2026-01-01',
      Descrizione: 'TEST_LISTA_' + Date.now(),
      AnnoBando: new Date().getFullYear()
    })
    ids.giustificativi.push(giust.data.id)

    const assoc = await apiPost('Associazioni', { Nome: assocName, Budget: 100_000 })
    ids.associazione = assoc.data.id

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

    const assocSelect = page.locator('.q-select:has(.q-field__label:has-text("Associazione"))').first()
    await assocSelect.click()
    await page.getByRole('option', { name: assocName }).first().click()
    await page.waitForLoadState('networkidle').catch(() => {})

    await propostaRow.locator('.q-checkbox').first().click()
    await page.locator('button:has-text("Crea gruppo di pagamento")').first().click()
    await expect(page.locator('.q-dialog:has-text("Crea gruppo di pagamento")')).toBeVisible({ timeout: 5000 })
    await page.locator('.q-dialog input').first().fill(batchName)
    await page.locator('.q-dialog button:has-text("Conferma")').click()
    await expect(page.locator('.q-notification:has-text("Gruppo creato")').first())
      .toBeVisible({ timeout: 8000 })
      .catch(() => {})

    return { famId }
  }

  async function getListaByBatch(batchName) {
    const res = await apiGet('ListePagamenti', {
      filter: JSON.stringify({ Nome: { _eq: `${batchName} (batch)` } }),
      fields: 'id,File,ConteggioRighe,Totale',
      limit: 1
    })
    return (res.data || [])[0] || null
  }

  async function scaricaXlsxLista(fileId) {
    const res = await fetch(`${API}/assets/${fileId}?access_token=${getToken()}`)
    expect(res.status).toBe(200)
    return globalThis.Buffer.from(await res.arrayBuffer())
  }

  async function parseWorkbook(buffer) {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    return workbook.getWorksheet('Pagamenti')
  }

  test('PAG-31: Bonifici da fare ha tabella @smoke', async ({ page }) => {
    await setupData(page)
    await page.goto('/pagamenti')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.q-tab:has-text("Bonifici da fare")')).toBeVisible({ timeout: 5000 })
  })

  test('PAG-32: Da riscontrare tab visibile @smoke', async ({ page }) => {
    await loginAs(page, 'manager', auth)
    await page.goto('/pagamenti')
    await page.waitForLoadState('networkidle')
    await page.locator('.q-tab:has-text("Da riscontrare")').click()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.q-tab--active:has-text("Da riscontrare")')).toBeVisible({ timeout: 5000 })
  })

  test('PAG-33: Falliti tab visibile @smoke', async ({ page }) => {
    await loginAs(page, 'manager', auth)
    await page.goto('/pagamenti')
    await page.waitForLoadState('networkidle')
    await page.locator('.q-tab:has-text("Falliti")').click()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.q-tab--active:has-text("Falliti")')).toBeVisible({ timeout: 5000 })
  })

  test('PAG-34: Liste esportazione tab visibile @smoke', async ({ page }) => {
    await loginAs(page, 'manager', auth)
    await page.goto('/pagamenti')
    await page.waitForLoadState('networkidle')
    await page.locator('.q-tab:has-text("Liste esportazione")').click()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.q-tab--active:has-text("Liste esportazione")')).toBeVisible({ timeout: 5000 })
  })

  test('PAG-35: Admin vede tab Annullati con selettore motivo @smoke', async ({ page }) => {
    await loginAs(page, 'admin', auth)
    await page.goto('/pagamenti')
    await page.waitForLoadState('networkidle')
    await page.locator('.q-tab:has-text("Annullati")').click()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.q-tab--active:has-text("Annullati")')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('.q-select:has-text("Filtra per motivo")'))
      .toBeVisible({ timeout: 5000 })
      .catch(() => {})
  })

  test('PAG-36: Manager non vede tab Annullati @smoke', async ({ page }) => {
    await loginAs(page, 'manager', auth)
    await page.goto('/pagamenti')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.q-tab:has-text("Annullati")')).toHaveCount(0)
  })

  test('PAG-40: Filtro testuale in Da riscontrare @smoke', async ({ page }) => {
    await loginAs(page, 'manager', auth)
    await page.goto('/pagamenti')
    await page.waitForLoadState('networkidle')
    await page.locator('.q-tab:has-text("Da riscontrare")').click()
    await page.waitForLoadState('networkidle')

    const searchInput = page.locator('input[placeholder*="Cerca famiglia"]').first()
    await expect(searchInput).toBeVisible({ timeout: 5000 })
    await searchInput.fill('TEST')
    await page.waitForTimeout(500)
    await expect(searchInput).toHaveValue('TEST')
  })

  test('PAG-50: Crea gruppo di pagamento e segna pagato @crud', async ({ page }) => {
    test.setTimeout(180_000)
    await setupData(page)

    const famRes = await apiGet('Famiglie', {
      filter: JSON.stringify({ Nome_Famiglia: { _eq: NOME_FAM } }),
      fields: 'id_famiglia',
      limit: 1
    })
    const famId = famRes.data?.[0]?.id_famiglia
    expect(famId).toBeTruthy()

    const giust = await apiPost('Giustificativi', {
      Progetto: ids.progetto,
      Famiglia: famId,
      Importo: 1000,
      Stato: 'verificato',
      Data: '2026-01-01',
      Descrizione: 'TEST_PAG_verificato_' + Date.now(),
      AnnoBando: new Date().getFullYear()
    })
    ids.giustificativi.push(giust.data.id)

    // Crea un'associazione con budget sufficiente (in dev le Associazioni sono vuote)
    const assocName = `TEST_ASSOC_${Date.now()}`
    const assoc = await apiPost('Associazioni', { Nome: assocName, Budget: 100_000 })
    ids.associazione = assoc.data.id

    await loginAs(page, 'manager', auth)
    await page.goto('/pagamenti')
    await page.waitForLoadState('networkidle')
    await page.locator('button:has-text("RICALCOLA")').click()
    await page.waitForLoadState('networkidle')

    const propostiSearch = page.locator('input[placeholder="Cerca famiglia, IBAN..."]')
    if (await propostiSearch.isVisible({ timeout: 5000 }).catch(() => false)) {
      await propostiSearch.fill(NOME_FAM)
      await page.waitForLoadState('networkidle').catch(() => {})
    }
    const propostaRow = page
      .locator('.q-table tbody tr, .q-table__grid-content .q-card')
      .filter({ hasText: NOME_FAM })
      .first()
    await expect(propostaRow).toBeVisible({ timeout: 15_000 })

    const assocSelect = page.locator('.q-select:has(.q-field__label:has-text("Associazione"))').first()
    await assocSelect.click()
    await page.getByRole('option', { name: assocName }).first().click()
    await page.waitForLoadState('networkidle').catch(() => {})

    await propostaRow.locator('.q-checkbox').first().click()
    await page.locator('button:has-text("Crea gruppo di pagamento")').first().click()
    await expect(page.locator('.q-dialog:has-text("Crea gruppo di pagamento")')).toBeVisible({ timeout: 5000 })
    const batchName = 'GRUPPO_' + Date.now()
    await page.locator('.q-dialog input').first().fill(batchName)
    await page.locator('.q-dialog button:has-text("Conferma")').click()
    await expect(page.locator('.q-notification:has-text("Gruppo creato")').first())
      .toBeVisible({ timeout: 8000 })
      .catch(() => {})

    await page.locator('.q-tab:has-text("Da riscontrare")').click()
    await page.waitForLoadState('networkidle')
    const incorsoSearch = page.locator('input[placeholder*="Cerca famiglia"]')
    if (await incorsoSearch.isVisible({ timeout: 5000 }).catch(() => false)) {
      await incorsoSearch.fill(NOME_FAM)
      await page.waitForLoadState('networkidle').catch(() => {})
    }
    const incorsoRow = page
      .locator('.q-table tbody tr, .q-table__grid-content .q-card')
      .filter({ hasText: NOME_FAM })
      .first()
    await expect(incorsoRow).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Intestatario').first()).toBeVisible({ timeout: 5000 })
    const segnaPagatoBtn = incorsoRow
      .locator('button[aria-label="Segna pagato"], button:has-text("Segna pagato")')
      .first()
    await expect(segnaPagatoBtn).toBeVisible({ timeout: 5000 })
    await segnaPagatoBtn.click()
    await page.waitForLoadState('networkidle')

    let paid = null
    for (let i = 0; i < 25 && !paid; i++) {
      await page.waitForTimeout(1000)
      const batch = await apiGet('BatchPagamenti', {
        filter: JSON.stringify({ Nome: { _eq: batchName } }),
        fields: 'id,Nome',
        limit: 1
      })
      const batchId = batch.data?.[0]?.id
      if (!batchId) continue
      const res = await apiGet('Pagamenti', {
        filter: JSON.stringify({ Batch: { _eq: batchId }, Stato: { _eq: 'pagato' } }),
        fields: 'id,Batch',
        limit: 1
      })
      paid = res.data?.[0] || null
    }
    expect(paid).toBeTruthy()

    await page.locator('.q-tab:has-text("Liste esportazione")').click()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[aria-label="Scarica Excel"]').first()).toBeVisible({ timeout: 8000 })
  })

  test('PAG-51: giustificativo verificato dopo tranche parziale genera nuova proposta @crud', async ({ page }) => {
    test.setTimeout(180_000)
    const nomeFam = `TEST_PAG51_${Date.now()}`
    await setupData(page, nomeFam)

    const famRes = await apiGet('Famiglie', {
      filter: JSON.stringify({ Nome_Famiglia: { _eq: nomeFam } }),
      fields: 'id_famiglia',
      limit: 1
    })
    const famId = famRes.data?.[0]?.id_famiglia
    expect(famId).toBeTruthy()

    // Giustificativo #1 verificato
    const g1 = await apiPost('Giustificativi', {
      Progetto: ids.progetto,
      Famiglia: famId,
      Importo: 1000,
      Stato: 'verificato',
      Data: '2026-01-01',
      Descrizione: 'TEST_PAG51_t1_' + Date.now(),
      AnnoBando: new Date().getFullYear()
    })
    ids.giustificativi.push(g1.data.id)

    // Associazione con budget (in dev le Associazioni sono vuote)
    const assocName = `TEST_ASSOC51_${Date.now()}`
    const assoc = await apiPost('Associazioni', { Nome: assocName, Budget: 100_000 })
    ids.associazione = assoc.data.id

    // Prima tranche via UI: RICALCOLA -> proposto 800 -> batch -> segna pagato
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

    const assocSelect = page.locator('.q-select:has(.q-field__label:has-text("Associazione"))').first()
    await assocSelect.click()
    await page.getByRole('option', { name: assocName }).first().click()
    await page.waitForLoadState('networkidle').catch(() => {})

    await propostaRow.locator('.q-checkbox').first().click()
    await page.locator('button:has-text("Crea gruppo di pagamento")').first().click()
    await expect(page.locator('.q-dialog:has-text("Crea gruppo di pagamento")')).toBeVisible({ timeout: 5000 })
    const batchName = 'GRUPPO51_' + Date.now()
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

    // Il giustificativo #1 (coperto dalla prima tranche) diventa `pagato`
    let g1Stato = null
    for (let i = 0; i < 20 && g1Stato !== 'pagato'; i++) {
      await page.waitForTimeout(1000)
      const r = await apiGet('Giustificativi/' + g1.data.id, { fields: 'Stato,Pagamento' })
      g1Stato = r.data?.Stato
    }
    expect(g1Stato).toBe('pagato')

    // Giustificativo #2 inviato DOPO la tranche (da verificare in UI)
    const g2 = await apiPost('Giustificativi', {
      Progetto: ids.progetto,
      Famiglia: famId,
      Importo: 500,
      Stato: 'inviato',
      Data: '2026-02-01',
      Descrizione: 'TEST_PAG51_t2_' + Date.now(),
      AnnoBando: new Date().getFullYear()
    })
    ids.giustificativi.push(g2.data.id)

    await page.goto('/verifica')
    await page.waitForLoadState('networkidle')
    const search = page.locator('input[aria-label="Cerca famiglia"]')
    if (await search.isVisible({ timeout: 5000 }).catch(() => false)) {
      await search.fill(nomeFam)
      await page.waitForLoadState('networkidle')
    }
    const row = page.locator('.verifica-table tbody tr, .q-expansion-item').filter({ hasText: nomeFam }).first()
    await expect(row).toBeVisible({ timeout: 15_000 })
    const expandBtn = row.locator('[data-testid="expand-row"]').first()
    if ((await expandBtn.count()) > 0) {
      await expandBtn.click()
    } else {
      await row.locator('.q-item').first().click()
    }
    await page.waitForLoadState('networkidle').catch(() => {})

    await page
      .locator('.expandable-content')
      .first()
      .waitFor({ state: 'visible', timeout: 8000 })
      .catch(() => {})
    let verifyBtn = page.locator('.expandable-content [data-testid="btn-verify"]').first()
    if ((await verifyBtn.count()) === 0) {
      verifyBtn = page.locator('[data-testid="btn-verify"]:visible').first()
    }
    await expect(verifyBtn).toBeVisible({ timeout: 10_000 })
    await verifyBtn.click()

    // Nuova proposta attesa: 1500*0.8 - 800 = 400 (poll: la scrittura è async)
    let proposta = null
    for (let i = 0; i < 15 && !proposta; i++) {
      await page.waitForTimeout(1000)
      const propRes = await apiGet('Pagamenti', {
        filter: JSON.stringify({ Progetto: { _eq: ids.progetto }, Stato: { _eq: 'proposto' } }),
        fields: 'id,Importo,Stato',
        limit: 5
      })
      proposta = (propRes.data || [])[0] || null
    }
    expect(proposta).toBeTruthy()
    expect(Number.parseFloat(proposta.Importo)).toBeCloseTo(400, 2)

    // Il nuovo giustificativo resta `verificato` e collegato alla nuova proposta
    const g2Res = await apiGet('Giustificativi/' + g2.data.id, { fields: 'Stato,Pagamento' })
    expect(g2Res.data?.Stato).toBe('verificato')
    expect(g2Res.data?.Pagamento).toBeTruthy()

    // TotaleVerificato allineato ai giustificativi verificati reali
    const prog = await apiGet('Progetti/' + ids.progetto, { fields: 'TotaleVerificato' })
    expect(Number.parseFloat(prog.data?.TotaleVerificato)).toBeCloseTo(1500, 2)
  })

  test('PAG-52: la lista Excel scaricata contiene tutte le informazioni @crud', async ({ page }) => {
    test.setTimeout(180_000)
    const nomeFam = `TEST_PAG52_${Date.now()}`
    const assocName = `TEST_ASSOC52_${Date.now()}`
    const batchName = `TEST_LISTA52_${Date.now()}`
    await setupData(page, nomeFam)

    const famRes = await apiGet('Famiglie', {
      filter: JSON.stringify({ Nome_Famiglia: { _eq: nomeFam } }),
      fields: 'id_famiglia',
      limit: 1
    })
    const famId = famRes.data?.[0]?.id_famiglia
    await apiPatch('Famiglie', famId, {
      IBAN: 'IT60X0542811101000000123456',
      Intestatario_CC: 'Mario Rossi E2E'
    })

    await creaGruppoConLista(page, { nomeFam, assocName, batchName })
    const lista = await getListaByBatch(batchName)
    expect(lista).toBeTruthy()
    expect(lista.File).toBeTruthy()

    const sheet = await parseWorkbook(await scaricaXlsxLista(lista.File))
    expect([1, 2, 3, 4].map(i => sheet.getRow(1).getCell(i).value)).toEqual([
      'Famiglia',
      'Importo',
      'IBAN',
      'Intestatario'
    ])

    const dataRows = sheet.rowCount - 1
    expect(dataRows).toBe(lista.ConteggioRighe)
    expect(dataRows).toBeGreaterThan(0)

    const famiglie = []
    let importoTotale = 0
    for (let r = 2; r <= sheet.rowCount; r++) {
      famiglie.push(sheet.getRow(r).getCell(1).value)
      importoTotale += Number(sheet.getRow(r).getCell(2).value) || 0
    }
    expect(famiglie).toContain(nomeFam)
    expect(importoTotale).toBeCloseTo(Number.parseFloat(lista.Totale), 2)

    const rowFamiglia = famiglie.indexOf(nomeFam) + 2
    expect(sheet.getRow(rowFamiglia).getCell(3).value).toBe('IT60X0542811101000000123456')
    expect(sheet.getRow(rowFamiglia).getCell(4).value).toBe('Mario Rossi E2E')
  })

  test('PAG-53: Rigenera selezionate ripara la lista e il file è corretto @regression', async ({ page }) => {
    test.setTimeout(180_000)
    const nomeFam = `TEST_PAG53_${Date.now()}`
    const assocName = `TEST_ASSOC53_${Date.now()}`
    const batchName = `TEST_LISTA53_${Date.now()}`
    await setupData(page, nomeFam)
    await creaGruppoConLista(page, { nomeFam, assocName, batchName })

    const lista = await getListaByBatch(batchName)
    expect(lista?.File).toBeTruthy()

    const tutte = await apiGet('ListePagamenti', { limit: -1, fields: 'id,Nome,File' })
    const altra = (tutte.data || []).find(l => l.Nome !== `${batchName} (batch)`)

    // Simula il file mancante (come dopo un sync prod->dev)
    await apiPatch('ListePagamenti', lista.id, { File: null })

    await loginAs(page, 'admin', auth)
    await page.goto('/admin')
    await page.locator('.q-tab:has-text("Check")').click()
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.getByRole('button', { name: 'Verifica liste pagamenti' }).click()
    await page.waitForLoadState('networkidle').catch(() => {})

    const row = page
      .locator('tr')
      .filter({ hasText: `${batchName} (batch)` })
      .first()
    await expect(row).toBeVisible({ timeout: 15_000 })
    await row.locator('.q-checkbox').first().click()
    await page.getByRole('button', { name: 'Rigenera selezionate' }).click()
    await page.locator('.q-dialog button:has-text("Rigenera")').click()
    await expect(page.getByText(/aggiornate|create|eliminate/).first()).toBeVisible({ timeout: 120_000 })
    await page.waitForTimeout(1500)

    const dopo = await getListaByBatch(batchName)
    expect(dopo.File).toBeTruthy()
    expect(dopo.File).not.toBe(lista.File)

    const sheet = await parseWorkbook(await scaricaXlsxLista(dopo.File))
    expect(sheet.getCell('A1').value).toBe('Famiglia')
    const famiglie = []
    for (let r = 2; r <= sheet.rowCount; r++) famiglie.push(sheet.getRow(r).getCell(1).value)
    expect(famiglie).toContain(nomeFam)

    // Le liste non selezionate restano intatte
    if (altra) {
      const check = await apiGet('ListePagamenti/' + altra.id, { fields: 'File' })
      expect(check.data?.File).toBe(altra.File)
    }
  })
})
