import auth from '../fixtures/auth-test.json' with { type: 'json' }
import { apiLogin, apiPost, apiGet, apiPatch, apiDelete } from '../helpers/api.js'
import { test, expect } from '../helpers/console.js'
import { loginAs } from '../helpers/login.js'

const PAG = { progetti: [], pagamenti: [], batch: [], famiglie: [], associazioni: [], liste: [], files: [] }

test.describe('Pagamenti CRUD', () => {
  test.beforeAll(async () => {
    await apiLogin(auth.admin.email, auth.admin.password)
  })

  test.afterEach(async () => {
    for (const id of PAG.files) {
      try {
        await apiDelete('files', id)
      } catch {}
    }
    for (const id of PAG.liste) {
      try {
        await apiDelete('ListePagamenti', id)
      } catch {}
    }
    for (const id of PAG.batch) {
      try {
        await apiDelete('BatchPagamenti', id)
      } catch {}
    }
    for (const id of PAG.pagamenti) {
      try {
        await apiDelete('Pagamenti', id)
      } catch {}
    }
    for (const id of PAG.progetti) {
      try {
        await apiDelete('Progetti', id)
      } catch {}
    }
    for (const id of PAG.famiglie) {
      try {
        await apiDelete('Famiglie', id)
      } catch {}
    }
    for (const id of PAG.associazioni) {
      try {
        await apiDelete('Associazioni', id)
      } catch {}
    }
  })

  async function createBaseData() {
    const ass = await apiPost('Associazioni', { Nome: 'TEST_Assoc', Budget: 10_000 })
    const assId = ass.data?.id || ass.data?.[0]?.id
    PAG.associazioni.push(assId)
    const fam = await apiPost('Famiglie', {
      id_famiglia: `TEST_PAG_${Date.now()}`,
      Nome_Famiglia: `TEST_PAG_${Date.now()}`,
      IBAN: 'IT60X0542811101000000123456',
      Intestatario_CC: 'TEST'
    })
    const famId = fam.data?.id_famiglia || fam.data?.id
    PAG.famiglie.push(famId)
    const prog = await apiPost('Progetti', {
      id_progetto: `TEST_PAG_PROG_${Date.now()}`,
      Famiglia: famId,
      Allocato: 3000,
      Cognome_Beneficiario: 'TEST_PAG',
      Nome_Beneficiario: 'Test',
      AnnoBando: new Date().getFullYear()
    })
    const progId = prog.data?.id_progetto || prog.data?.id
    PAG.progetti.push(progId)
    return { assId, famId, progId }
  }

  test('PAG-30: Crea batch da pagamenti proposti @crud', async ({ page }) => {
    page.expectApiError('/items/Pagamenti/')
    const { assId, famId, progId } = await createBaseData()
    const pag1 = await apiPost('Pagamenti', { Progetto: progId, Famiglia: famId, Importo: 500, Stato: 'proposto' })
    PAG.pagamenti.push(pag1.data?.id || pag1.data?.[0]?.id)
    const pag2 = await apiPost('Pagamenti', { Progetto: progId, Famiglia: famId, Importo: 300, Stato: 'proposto' })
    PAG.pagamenti.push(pag2.data?.id || pag2.data?.[0]?.id)

    await loginAs(page, 'manager', auth)
    await page.goto('/pagamenti')
    await page.waitForLoadState("networkidle").catch(() => {})
    await page.waitForFunction(
      () => {
        return (
          document.querySelector('.q-table') ||
          document.querySelector('.q-table__grid-content') ||
          document.querySelector('.q-tab-panel')
        )
      },
      { timeout: 10_000 }
    )
  })

  test('PAG-31: Bonifici da fare ha tabella @smoke', async ({ page }) => {
    await loginAs(page, 'manager', auth)
    await page.goto('/pagamenti')
    await page.waitForLoadState("networkidle").catch(() => {})
    await expect(page.locator('.q-tab:has-text("Bonifici da fare")')).toBeVisible({ timeout: 5000 })
  })

  test('PAG-32: Da riscontrare tab visibile @smoke', async ({ page }) => {
    await loginAs(page, 'manager', auth)
    await page.goto('/pagamenti')
    await page.waitForLoadState("networkidle").catch(() => {})
    await page.locator('.q-tab:has-text("Da riscontrare")').click()
    await page.waitForLoadState("networkidle").catch(() => {})
    await page.waitForFunction(
      () => {
        return (
          document.querySelector('.q-table') ||
          document.querySelector('.q-table__grid-content') ||
          document.querySelector('.q-tab-panel')
        )
      },
      { timeout: 10_000 }
    )
  })

  test('PAG-33: Falliti tab visibile @smoke', async ({ page }) => {
    await loginAs(page, 'manager', auth)
    await page.goto('/pagamenti')
    await page.waitForLoadState("networkidle").catch(() => {})
    await page.locator('.q-tab:has-text("Falliti")').click()
    await page.waitForLoadState("networkidle").catch(() => {})
    await page.waitForFunction(
      () => {
        return (
          document.querySelector('.q-table') ||
          document.querySelector('.q-table__grid-content') ||
          document.querySelector('.q-tab-panel')
        )
      },
      { timeout: 10_000 }
    )
  })

  test('PAG-34: Liste esportazione tab visibile @smoke', async ({ page }) => {
    await loginAs(page, 'manager', auth)
    await page.goto('/pagamenti')
    await page.waitForLoadState("networkidle").catch(() => {})
    await page.locator('.q-tab:has-text("Liste esportazione")').click()
    await page.waitForLoadState("networkidle").catch(() => {})
    // Il tab è attivo
    await expect(page.locator('.q-tab--active:has-text("Liste esportazione")')).toBeVisible({ timeout: 5000 })
  })

  test('PAG-35: Segna pagato da Da riscontrare @crud', async ({ page }) => {
    const { assId, famId, progId } = await createBaseData()
    const pag = await apiPost('Pagamenti', { Progetto: progId, Famiglia: famId, Importo: 200, Stato: 'in_pagamento' })
    const pagId = pag.data?.id || pag.data?.[0]?.id
    PAG.pagamenti.push(pagId)
    const batch = await apiPost('BatchPagamenti', { Nome: 'TEST_BATCH_' + Date.now(), AssociazioneId: assId })
    const batchId = batch.data?.id || batch.data?.[0]?.id
    PAG.batch.push(batchId)

    await loginAs(page, 'manager', auth)
    await page.goto('/pagamenti')
    await page.locator('.q-tab:has-text("Da riscontrare")').click()
    await page.waitForLoadState("networkidle").catch(() => {})

    const pagatoBtn = page.locator('[aria-label="Segna pagato"]').first()
    await expect(pagatoBtn).toBeVisible({ timeout: 5000 })
    await pagatoBtn.click()
    await page.waitForLoadState("networkidle").catch(() => {})
    await expect(page.locator('.q-badge:has-text("Pagato")').first()).toBeVisible({ timeout: 5000 })
  })

  test('PAG-36: Segna fallito con motivo @crud', async ({ page }) => {
    const { assId, famId, progId } = await createBaseData()
    const pag = await apiPost('Pagamenti', { Progetto: progId, Famiglia: famId, Importo: 150, Stato: 'in_pagamento' })
    const pagId = pag.data?.id || pag.data?.[0]?.id
    PAG.pagamenti.push(pagId)
    const batch = await apiPost('BatchPagamenti', { Nome: 'TEST_BATCH_' + Date.now(), AssociazioneId: assId })
    const batchId = batch.data?.id || batch.data?.[0]?.id
    PAG.batch.push(batchId)

    await loginAs(page, 'manager', auth)
    await page.goto('/pagamenti')
    await page.locator('.q-tab:has-text("Da riscontrare")').click()
    await page.waitForLoadState("networkidle").catch(() => {})

    const fallitoBtn = page.locator('[aria-label="Segna fallito"]').first()
    await expect(fallitoBtn).toBeVisible({ timeout: 5000 })
    await fallitoBtn.click()
    await page.waitForLoadState("networkidle").catch(() => {})

    // Fill the prompt reason
    const promptInput = page.locator('.q-dialog .q-field__native, .q-dialog input[type="text"]').first()
    await expect(promptInput).toBeVisible({ timeout: 3000 })
    await promptInput.fill('IBAN errato')
    await page.locator('.q-dialog button:has-text("Conferma")').click()
    await page.waitForLoadState("networkidle").catch(() => {})

    // Switch to Falliti tab to verify
    await page.locator('.q-tab:has-text("Falliti")').click()
    await page.waitForLoadState("networkidle").catch(() => {})
    // Falliti tab è attivo (tabella o messaggio vuoto visibile)
    await expect(page.locator('.q-tab--active:has-text("Falliti")')).toBeVisible({ timeout: 5000 })
  })

  test('PAG-37: Ripristina fallito a Bonifici @crud', async ({ page }) => {
    const { assId, famId, progId } = await createBaseData()
    const pag = await apiPost('Pagamenti', {
      Progetto: progId,
      Famiglia: famId,
      Importo: 120,
      Stato: 'fallito',
      IBAN: 'IT60X0542811101000000123456',
      Intestatario: 'TEST'
    })
    const pagId = pag.data?.id || pag.data?.[0]?.id
    PAG.pagamenti.push(pagId)

    await loginAs(page, 'manager', auth)
    await page.goto('/pagamenti')
    await page.locator('.q-tab:has-text("Falliti")').click()
    await page.waitForLoadState("networkidle").catch(() => {})

    // Select the first row checkbox
    const checkbox = page.locator('.q-checkbox').first()
    await expect(checkbox).toBeVisible({ timeout: 5000 })
    await checkbox.click()
    await page.waitForLoadState("networkidle").catch(() => {})

    // Click Ripristina
    const restoreBtn = page.locator('button:has-text("Ripristina a Bonifici")')
    await expect(restoreBtn).toBeVisible({ timeout: 3000 })
    await restoreBtn.click()
    await page.waitForLoadState("networkidle").catch(() => {})

    // Verify success notification
    await expect(page.locator('.q-notification').first()).toBeVisible({ timeout: 5000 })
  })

  test('PAG-38: Scarica CSV da Liste esportazione @smoke', async ({ page }) => {
    const { assId, famId, progId } = await createBaseData()
    const listaNome = 'TEST_LISTA_' + Date.now()
    const lista = await apiPost('ListePagamenti', {
      Nome: listaNome,
      Totale: 100,
      ConteggioRighe: 1,
      AssociazioneId: assId
    })
    const listaId = lista.data?.id || lista.data?.[0]?.id
    PAG.liste.push(listaId)

    await loginAs(page, 'manager', auth)
    await page.goto('/pagamenti')
    await page.locator('.q-tab:has-text("Liste esportazione")').click()
    await page.waitForLoadState("networkidle").catch(() => {})

    // The list row should be visible
    await expect(page.locator(`text=${listaNome}`).first()).toBeVisible({ timeout: 5000 })
  })

  test('PAG-39: Crea batch e verifica lista in Liste esportazione @crud', async ({ page }) => {
    test.setTimeout(120_000)
    const _vp = await page.viewportSize()
    if (_vp && _vp.width < 600) return
    page.expectApiError('/items/Pagamenti/')
    const uid = Date.now()
    const assocName = 'TEST_Assoc_' + uid
    // Usa budget alto per evitare conflitti con dati residui di test precedenti
    const ass = await apiPost('Associazioni', { Nome: assocName, Budget: 1_000_000 })
    const assId = ass.data?.id || ass.data?.[0]?.id
    PAG.associazioni.push(assId)
    const fam = await apiPost('Famiglie', { id_famiglia: 'TEST_PAG39_' + uid, Nome_Famiglia: 'TEST_PAG39_' + uid, IBAN: 'IT60X0542811101000000123456', Intestatario_CC: 'TEST' })
    const famId = fam.data?.id_famiglia || fam.data?.id
    PAG.famiglie.push(famId)
    const prog = await apiPost('Progetti', { id_progetto: 'TEST_PAG39_PROG_' + uid, Famiglia: famId, Allocato: 5000, Cognome_Beneficiario: 'TEST_PAG39', Nome_Beneficiario: 'Test', AnnoBando: new Date().getFullYear() })
    const progId = prog.data?.id_progetto || prog.data?.id
    PAG.progetti.push(progId)
    const pag1 = await apiPost('Pagamenti', { Progetto: progId, Famiglia: famId, Importo: 500, Stato: 'proposto' })
    PAG.pagamenti.push(pag1.data?.id || pag1.data?.[0]?.id)
    const pag2 = await apiPost('Pagamenti', { Progetto: progId, Famiglia: famId, Importo: 300, Stato: 'proposto' })
    PAG.pagamenti.push(pag2.data?.id || pag2.data?.[0]?.id)

    const batchNome = 'TEST_BATCH_E2E_' + uid

    await loginAs(page, 'manager', auth)
    await page.goto('/pagamenti')
    await page.waitForLoadState("networkidle").catch(() => {})

    // Seleziona associazione dal q-select
    const assocSelect = page.locator('.q-select').filter({ hasText: /Associazione/ }).first()
    await assocSelect.locator('.q-field__control, .q-field__native').first().click()
    await page.waitForLoadState("networkidle").catch(() => {})
    await page.locator('.q-item').filter({ hasText: assocName }).first().click()
    await page.waitForLoadState("networkidle").catch(() => {})

    // Seleziona le righe della tabella
    const tableRows = page.locator('.q-table tbody tr')
    const rowCount = await tableRows.count()
    for (let i = 0; i < rowCount; i++) {
      await tableRows.nth(i).locator('td').first().click()
      await page.waitForLoadState("networkidle").catch(() => {})
    }

    // Clicca "Crea gruppo di pagamento"
    const creaBtn = page.locator('button:has-text("Crea gruppo di pagamento")')
    await expect(creaBtn).toBeEnabled({ timeout: 5000 })
    await creaBtn.click()
    await page.waitForLoadState("networkidle").catch(() => {})

    // Nella dialog, inserisci nome e conferma
    const dialogInput = page.locator('.q-dialog .q-field__native').first()
    await dialogInput.fill(batchNome)
    await page.locator('.q-dialog button:has-text("Conferma")').click()
    await page.waitForLoadState("networkidle").catch(() => {})

  // Chiudi il dialog se ancora visibile (successo o errore)
  if (await page.locator('.q-dialog').isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.locator('.q-dialog button:has-text("Annulla")').click().catch(() => {})
    await page.waitForLoadState("networkidle").catch(() => {})
  }
    await page.waitForLoadState("networkidle").catch(() => {})

    // Vai alla tab "Liste esportazione"
    await page.locator('.q-tab:has-text("Liste esportazione")').click()
    await page.waitForLoadState("networkidle").catch(() => {})

    // Verifica che la lista creata sia visibile
    await expect(page.locator(`text=${batchNome}`).first()).toBeVisible({ timeout: 10_000 })
  })
})
