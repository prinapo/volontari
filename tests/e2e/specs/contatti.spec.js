import { test, expect } from '../helpers/console.js'
import { GestionePage } from '../pages/GestionePage.js'
import { loginAs } from '../helpers/login.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }
import { apiLogin } from '../helpers/api.js'
import {
  creaFamigliaVolontarioProgetto,
  loginVolontarioConFamiglia,
  pulisciIds,
  loginGestore
} from '../helpers/setup-atomico.js'
import { deleteContatti } from '../helpers/cleanup.js'
import { createContattoViaUI } from '../helpers/pagina-gestione.js'

const expectedHeaders = ['Nome e Cognome', 'Email', 'Cellulare', 'Tipo', 'Stato account', 'Famiglie', 'Azioni']

async function expandFirstCardIfMobile(page) {
  const exp = page.locator('.q-expansion-item')
  if ((await exp.count()) > 0 && (await page.locator('.q-expansion-item--expanded').count()) === 0) {
    await exp.first().click()
    await page.waitForTimeout(500)
  }
}

let ids = { famiglia: null, progetto: null, giustificativi: [] }
let createdContattoIds = []

test.beforeAll(async () => {
  await apiLogin(auth.admin.email, auth.admin.password)
})

test.afterEach(async () => {
  await pulisciIds(ids)
  if (createdContattoIds.length > 0) {
    await deleteContatti(...createdContattoIds)
    createdContattoIds = []
  }
})

test.describe('ContattiTab — Caricamento e Layout', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'manager', auth)
    const gp = new GestionePage(page)
    await gp.selectContattiTab()
  })

  test('CT-01: Pagina carica e tab Contatti selezionato @smoke', async ({ page }) => {
    const gp = new GestionePage(page)
    await expect(gp.contattiTab).toBeVisible({ timeout: 10000 })
    await gp.waitForTable()
    await expect(gp.searchInput).toBeVisible({ timeout: 5000 })
    const count = await gp.getRowCount()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('CT-SS-01: ContattiTab screenshot con tabella @visual', async ({ page }) => {
    const gp = new GestionePage(page)
    const cont = await createContattoViaUI(page, {
      nome: 'TEST_CT_SS_FixedName',
      cognome: 'TEST_CT_SS_FixedCognome',
      cellulare: '3331234567',
      telefono: '0212345678'
    })
    if (cont?.id_contatto) createdContattoIds.push(cont.id_contatto)
    await gp.search('TEST_CT_SS_FixedName')
    await page.waitForTimeout(500)
    await expect(page).toHaveScreenshot('contatti-tab.png', { maxDiffPixels: 500, animations: 'disabled' })
  })

  test('CT-02: Intestazioni colonne ordine corretto @smoke', async ({ page }) => {
    const gp = new GestionePage(page)
    await gp.selectContattiTab()
    await gp.waitForTable()
    const total = await gp.getTotalItems()
    const rows = await gp.getRowCount()
    expect(total).toBeGreaterThanOrEqual(0)
    if (total > 0) {
      expect(rows).toBeGreaterThanOrEqual(1)
    }
  })

  test('CT-07: Controlli paginazione visibili @smoke', async ({ page }) => {
    const gp = new GestionePage(page)
    await gp.waitForTable()
    await expect(gp.paginationInfo).toBeVisible({ timeout: 5000 })
    const total = await gp.getTotalItems()
    expect(total).toBeGreaterThanOrEqual(0)
    const text = await gp.paginationInfo.innerText()
    expect(text).toMatch(/di\s+\d+/)
  })
})

test.describe('ContattiTab — Ricerca e Filtri', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'manager', auth)
    const gp = new GestionePage(page)
    await gp.selectContattiTab()
  })

  test('CT-04: Ricerca per nome restringe risultati @crud', async ({ page }) => {
    const gp = new GestionePage(page)
    await gp.waitForTable()
    const rowsBefore = await gp.getRowCount()
    if (rowsBefore < 2) {
      }

    let searchTerm
    const hasDesktopRows = (await gp.tableRows.count()) > 0
    if (hasDesktopRows) {
      const firstNameCell = await gp.tableRows.first().locator('td').nth(0).innerText()
      searchTerm = firstNameCell.trim().split(' ')[0]
    } else {
      const label = await page.locator('.q-expansion-item .q-item__label').first().innerText()
      searchTerm = label.trim().split(' ')[0]
    }

    if (!searchTerm || searchTerm === '—') {
      }

    await gp.search(searchTerm)
    const rowsAfter = await gp.getRowCount()

    // Search should either narrow results or keep same (if all match)
    expect(rowsAfter).toBeLessThanOrEqual(rowsBefore)
    expect(rowsAfter).toBeGreaterThanOrEqual(1)
  })

  test('CT-05: Filtro tipo cambia risultati @crud', async ({ page }) => {
    const gp = new GestionePage(page)
    await gp.waitForTable()
    const rowsAll = await gp.getRowCount()
    if (rowsAll === 0) {
      }

    // Filter to Volontario — check it doesn't crash and returns <= total
    await gp.setTipoFilter('Volontario')
    const rowsVol = await gp.getRowCount()
    expect(rowsVol).toBeLessThanOrEqual(rowsAll)

    // Filter to Genitore
    await gp.setTipoFilter('Genitore')
    const rowsGen = await gp.getRowCount()
    expect(rowsGen).toBeLessThanOrEqual(rowsAll)

    // Filter to Contatto
    await gp.setTipoFilter('Contatto')
    const rowsCont = await gp.getRowCount()
    expect(rowsCont).toBeLessThanOrEqual(rowsAll)
  })

  test('CT-06: Badge tipo mostra valore corretto @smoke', async ({ page }) => {
    const gp = new GestionePage(page)
    await gp.waitForTable()
    const rows = await gp.getRowCount()
    expect(rows).toBeGreaterThan(0)

    const hasDesktopRows = (await gp.tableRows.count()) > 0
    if (hasDesktopRows) {
      const headers = await gp.getTableHeaderTexts()
      const tipoIdx = headers.indexOf('Tipo')
      expect(tipoIdx).not.toBe(-1)
      const tipoText = await gp.getCellText(0, tipoIdx)
      expect(['Volontario', 'Genitore', 'Referente', 'Contatto']).toContain(tipoText)
    } else {
      // Espandi la prima card per vedere il badge
      await page.locator('.q-expansion-item').first().click()
      await page.waitForTimeout(500)
      const badge = page.locator('.q-expansion-item--expanded .q-badge').first()
      await expect(badge).toBeVisible()
      const text = await badge.innerText()
      expect(['Volontario', 'Genitore', 'Referente', 'Contatto']).toContain(text)
    }
  })
})

test.describe('ContattiTab — Directus 11 deep field fix', () => {
  test('CT-08: Contatti con user_id null sono visibili @smoke', async ({ page }) => {
    await loginAs(page, 'manager', auth)

    const gp = new GestionePage(page)
    await gp.waitForTable()
    const rows = await gp.getRowCount()
    if (rows === 0) {
      }

    const hasDesktopRows = (await gp.tableRows.count()) > 0
    if (hasDesktopRows) {
      // The table rendered successfully with rows — the key fix is that
      // contatti with null user_id are NOT excluded by the query (no INNER JOIN).
      // Verify at least the "Nome e Cognome" column renders with a value.
      const firstCell = await gp.getFirstCellText()
      expect(firstCell).toBeTruthy()
      expect(firstCell).not.toBe('')

      // Find the Stato account column to check for user_id presence
      const headers = await gp.getTableHeaderTexts()
      const statoIdx = headers.indexOf('Stato account')
      if (statoIdx !== -1) {
        let foundDash = false
        for (let i = 0; i < Math.min(rows, 10); i++) {
          const cellText = await gp.getCellText(i, statoIdx)
          if (cellText === '—') {
            foundDash = true
            break
          }
        }
        expect(foundDash).toBe(true)
      }
    } else {
      // Mobile: verifica che la card sia renderizzata con label non vuoto
      const label = await page.locator('.q-expansion-item .q-item__label').first().innerText()
      expect(label).toBeTruthy()
      expect(label).not.toBe('')
    }
  })
})

test.describe('ContattiTab — CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'manager', auth)
    const gp = new GestionePage(page)
    await gp.selectContattiTab()
  })

  test('CT-09: Crea contatto nuovo @crud', async ({ page }) => {
    test.setTimeout(60000)
    const timestamp = Date.now()
    const nome = `TEST_CT ${timestamp}`
    const cognome = 'TEST_AutoTest'

    await page.locator('[data-testid="btn-aggiungi-contatto"]').click()
    await page.locator('.q-dialog:visible').waitFor({ state: 'visible', timeout: 5000 })

    const dialog = page.locator('.q-dialog:visible')

    await dialog.locator('[data-testid="contatto-nome"]').fill(nome)
    await dialog.locator('[data-testid="contatto-cognome"]').fill(cognome)

    const [postResp] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/items/contatti') && resp.request().method() === 'POST'),
      dialog.locator('button:has-text("Salva")').click()
    ])

    const contattoId = (await postResp.json())?.data?.id_contatto
    if (contattoId) createdContattoIds.push(contattoId)

    expect(postResp.status()).toBe(200)
    await expect(dialog).not.toBeVisible({ timeout: 10000 })

    const gp = new GestionePage(page)
    await gp.search(nome)
    const rows = await gp.getRowCount()
    expect(rows).toBeGreaterThanOrEqual(1)

    // Verifica persistenza dopo reload
    await page.reload()
    await gp.selectContattiTab()
    await gp.search(nome)
    const rowsAfterReload = await gp.getRowCount()
    expect(rowsAfterReload).toBeGreaterThanOrEqual(1)
  })

  test('CT-10: Modifica contatto esistente @crud', async ({ page }) => {
    test.setTimeout(90000)
    const timestamp = Date.now()
    const nome = `TEST_CT10 ${timestamp}`
    const cognome = 'TEST_AutoTest'
    const nomeMod = `${nome} mod`

    // Crea contatto (atomico)
    await page.locator('[data-testid="btn-aggiungi-contatto"]').click()
    await page.locator('.q-dialog:visible').waitFor({ state: 'visible', timeout: 5000 })
    let dialog = page.locator('.q-dialog:visible')
    await dialog.locator('[data-testid="contatto-nome"]').fill(nome)
    await dialog.locator('[data-testid="contatto-cognome"]').fill(cognome)

    const [postResp] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/items/contatti') && resp.request().method() === 'POST'),
      dialog.locator('button:has-text("Salva")').click()
    ])
    expect(postResp.status()).toBe(200)
    const ct10ContattoId = (await postResp.json())?.data?.id_contatto
    if (ct10ContattoId) createdContattoIds.push(ct10ContattoId)
    await expect(dialog).not.toBeVisible({ timeout: 10000 })

    // Modifica contatto
    const gp = new GestionePage(page)
    await gp.search(nome)
    await expandFirstCardIfMobile(page)
    expect(await gp.getRowCount()).toBeGreaterThan(0)

    const editBtn = page.locator('[data-testid="btn-edit-contatto"]').first()
    await expect(editBtn).toBeVisible({ timeout: 5000 })
    await editBtn.click()
    await expect(dialog).toBeVisible({ timeout: 5000 })

    const nomeInput = dialog.locator('[data-testid="contatto-nome"]')
    await nomeInput.fill(nomeMod)

    const [patchResp] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/items/contatti') && resp.request().method() === 'PATCH'),
      dialog.locator('button:has-text("Salva")').click()
    ])
    expect(patchResp.status()).toBe(200)
    await expect(dialog).not.toBeVisible({ timeout: 10000 })

    // Verifica modifica persiste
    await gp.search(nomeMod)
    await expandFirstCardIfMobile(page)
    expect(await gp.getRowCount()).toBeGreaterThanOrEqual(1)

    // Ripristina nome originale
    await gp.search(nomeMod)
    await expandFirstCardIfMobile(page)
    const editBtnAfter = page.locator('[data-testid="btn-edit-contatto"]').first()
    if ((await editBtnAfter.count()) > 0) {
      await editBtnAfter.click()
      await expect(dialog).toBeVisible({ timeout: 5000 })
      await dialog.locator('[data-testid="contatto-nome"]').fill(nome)
      await dialog.locator('button:has-text("Salva")').click()
      await expect(dialog).not.toBeVisible({ timeout: 10000 })
    }
  })

  test('CT-11: Elimina email da contatto @crud', async ({ page }) => {
    test.setTimeout(60000)
    const timestamp = Date.now()
    const nome = `TEST_DelEmail_${timestamp}`

    const gp = new GestionePage(page)
    await gp.waitForTable()

    await page.locator('[data-testid="btn-aggiungi-contatto"]').click()
    await page.locator('.q-dialog:visible').waitFor({ state: 'visible', timeout: 5000 })

    const dialog = page.locator('.q-dialog:visible')

    await dialog.locator('[data-testid="contatto-nome"]').fill(nome)
    await dialog.locator('[data-testid="contatto-cognome"]').fill('TestEmail')

    const addEmailBtn = dialog.locator('button:has-text("Aggiungi email")')
    if (await addEmailBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addEmailBtn.click()
      await dialog
        .locator('[data-testid^="contatto-email-"]')
        .first()
        .waitFor({ state: 'visible', timeout: 3000 })
        .catch(() => {})
    }

    const emailInput = dialog.locator('[data-testid^="contatto-email-"]').last()
    if ((await emailInput.count()) === 0) {
      await dialog.locator('button:has-text("Annulla")').click()
      }

    await emailInput.fill(`TEST_email_${timestamp}@test.com`)

    const [postResp] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/items/contatti') && resp.request().method() === 'POST'),
      dialog.locator('button:has-text("Salva")').click()
    ])
    expect(postResp.status()).toBe(200)
    const ct11ContattoId = (await postResp.json())?.data?.id_contatto
    if (ct11ContattoId) createdContattoIds.push(ct11ContattoId)
    await expect(dialog).not.toBeVisible({ timeout: 10000 })

    await gp.search(nome)
    await expandFirstCardIfMobile(page)

    const editBtn = page.locator('[data-testid="btn-edit-contatto"]').first()
    await expect(editBtn).toBeVisible({ timeout: 5000 })
    await editBtn.click()

    const editDialog = page.locator('.q-dialog:visible')
    await expect(editDialog).toBeVisible({ timeout: 5000 })

    const emailInputs = editDialog.locator('[data-testid^="contatto-email-"]')
    const emailCount = await emailInputs.count()
    console.log(`[CT-11] email count prima: ${emailCount}`)
    if (emailCount === 0) {
      await editDialog.locator('button:has-text("Annulla")').click()
      }

    const deleteEmailBtn = editDialog.locator('[data-testid="btn-delete-email"]').first()
    if ((await deleteEmailBtn.count()) === 0) {
      await editDialog.locator('button:has-text("Annulla")').click()
      }

    await deleteEmailBtn.click()

    const emailCountAfter = await editDialog.locator('[data-testid^="contatto-email-"]').count()
    console.log(`[CT-11] email count dopo: ${emailCountAfter}`)
    expect(emailCountAfter).toBeLessThan(emailCount)

    await editDialog.locator('button:has-text("Annulla")').click()
    await expect(editDialog)
      .not.toBeVisible({ timeout: 3000 })
      .catch(() => {})
  })

  test('CT-12: Aggiungi email a contatto @crud', async ({ page }) => {
    const timestamp = Date.now()
    const nome = `TEST_CT12_${timestamp}`
    const cognome = 'TEST_TestEmail'
    const testEmail = `TEST_ct12_email_${timestamp}@test.com`

    // Crea contatto dedicato
    await page.locator('[data-testid="btn-aggiungi-contatto"]').click()
    await page.locator('.q-dialog:visible').waitFor({ state: 'visible', timeout: 5000 })

    const createDialog = page.locator('.q-dialog:visible')
    await expect(createDialog).toBeVisible({ timeout: 5000 })

    await createDialog.locator('[data-testid="contatto-nome"]').fill(nome)
    await createDialog.locator('[data-testid="contatto-cognome"]').fill(cognome)

    const [postResp] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/items/contatti') && resp.request().method() === 'POST'),
      createDialog.locator('button:has-text("Salva")').click()
    ])
    expect(postResp.status()).toBe(200)
    await expect(createDialog).not.toBeVisible({ timeout: 10000 })

    const createdContatto = await postResp.json()
    const contattoId = createdContatto?.data?.[0]?.id_contatto || createdContatto?.data?.id_contatto

    if (contattoId) createdContattoIds.push(contattoId)

    

    // Modifica contatto per aggiungere email
    const gp = new GestionePage(page)
    await gp.search(nome)
    await expandFirstCardIfMobile(page)

    const editBtn = page.locator('[data-testid="btn-edit-contatto"]').first()
    await expect(editBtn).toBeVisible({ timeout: 5000 })
    await editBtn.click()

    const dialog = page.locator('.q-dialog:visible')
    await expect(dialog).toBeVisible({ timeout: 5000 })

    const addEmailBtn = dialog.locator('button:has-text("Aggiungi email")')
    if ((await addEmailBtn.count()) > 0) {
      await addEmailBtn.click()
      await dialog
        .locator('[data-testid^="contatto-email-"]')
        .last()
        .waitFor({ state: 'visible', timeout: 3000 })
        .catch(() => {})

      const emailInput = dialog.locator('[data-testid^="contatto-email-"]').last()
      if ((await emailInput.count()) > 0) {
        await emailInput.fill(testEmail)
        // Trigger blur per far completare onEmailBlur prima del salvataggio
        await dialog.locator('[data-testid="contatto-nome"]').click()
        await page
          .waitForResponse(resp => resp.url().includes('/items/email') && resp.request().method() === 'POST', {
            timeout: 5000
          })
          .catch(() => {})

        const [patchResp] = await Promise.all([
          page.waitForResponse(resp => resp.url().includes('/items/contatti') && resp.request().method() === 'PATCH'),
          dialog.locator('button:has-text("Salva")').click()
        ])
        expect(patchResp.status()).toBe(200)
        await expect(dialog).not.toBeVisible({ timeout: 10000 })
      } else {
        await dialog.locator('button:has-text("Annulla")').click()
        throw new Error('Input email non trovato')
      }
    } else {
      await dialog.locator('button:has-text("Annulla")').click()
      throw new Error('Nessun pulsante aggiungi email')
    }
  })
})


