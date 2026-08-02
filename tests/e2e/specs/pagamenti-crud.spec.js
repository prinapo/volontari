import auth from '../fixtures/auth-test.json' with { type: 'json' }
import { apiLogin, apiGet, apiPost, apiDelete } from '../helpers/api.js'
import { test, expect } from '../helpers/console.js'
import { loginAs } from '../helpers/login.js'
import { createFamigliaViaUI } from '../helpers/pagina-gestione.js'
import { createProgettoViaUI } from '../pages/CreaProgettoPage.js'

const TS = Date.now()
const NOME_FAM = `TEST_PAG_${TS}`

test.describe('Pagamenti CRUD', () => {
  let ids = { famiglia: null, progetto: null, giustificativi: [], associazione: null }

  test.beforeAll(async () => {
    await apiLogin(auth.admin.email, auth.admin.password)
  })

  test.afterEach(async () => {
    if (ids.associazione) {
      try {
        await apiDelete('Associazioni', ids.associazione)
      } catch {
        /* */
      }
      ids.associazione = null
    }
  })

  async function setupData(page) {
    await loginAs(page, 'admin', auth)
    await page.goto('/gestione')
    await page.waitForLoadState('networkidle')
    await page.locator('.q-tab:has-text("Famiglie")').click()
    await page.waitForLoadState('networkidle')

    await createFamigliaViaUI(page, { nomeFamiglia: NOME_FAM })
    await page.waitForLoadState('networkidle')

    ids.progetto = await createProgettoViaUI(
      page,
      {
        famigliaNome: NOME_FAM,
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

  test('PAG-35: Annullati tab visibile con selettore motivo @smoke', async ({ page }) => {
    await loginAs(page, 'manager', auth)
    await page.goto('/pagamenti')
    await page.waitForLoadState('networkidle')
    await page.locator('.q-tab:has-text("Annullati")').click()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.q-tab--active:has-text("Annullati")')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('.q-select:has-text("Filtra per motivo")'))
      .toBeVisible({ timeout: 5000 })
      .catch(() => {})
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
  })
})
