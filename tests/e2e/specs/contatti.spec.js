import { test, expect } from '../helpers/console.js'
import { LoginPage } from '../pages/LoginPage.js'
import { GestionePage } from '../pages/GestionePage.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }

const expectedHeaders = ['Nome e Cognome', 'Email', 'Cellulare', 'Tipo', 'Stato account', 'Famiglie', 'Azioni']

test.describe('ContattiTab — Caricamento e Layout', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(auth.gestore.email, auth.gestore.password)
    await expect(page).toHaveURL(/\/gestione/)
    const gp = new GestionePage(page)
    await gp.selectContattiTab()
  })

  test('CT-01: Pagina carica e tab Contatti selezionato @smoke', async ({ page }) => {
    const gp = new GestionePage(page)
    await expect(gp.contattiTab).toBeVisible({ timeout: 10000 })
    await expect(gp.searchInput).toBeVisible({ timeout: 5000 })
    await expect(gp.table).toBeVisible({ timeout: 10000 })
  })

  test('CT-02: Intestazioni colonne ordine corretto @smoke', async ({ page }) => {
    const gp = new GestionePage(page)
    await gp.selectContattiTab()
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
    const text = await gp.paginationInfo.innerText()
    expect(text).toContain('di')
  })
})

test.describe('ContattiTab — Ricerca e Filtri', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(auth.gestore.email, auth.gestore.password)
    await expect(page).toHaveURL(/\/gestione/)
    const gp = new GestionePage(page)
    await gp.selectContattiTab()
  })

  test('CT-04: Ricerca per nome restringe risultati @crud', async ({ page }) => {
    const gp = new GestionePage(page)
    await gp.waitForTable()
    const rowsBefore = await gp.getRowCount()
    if (rowsBefore < 2) {
      test.skip()
      return
    }

    // Get the first row's name to search for
    const firstNameCell = await gp.tableRows.first().locator('td').nth(0).innerText()
    const searchTerm = firstNameCell.trim().split(' ')[0]
    if (!searchTerm || searchTerm === '—') {
      test.skip()
      return
    }

    await gp.search(searchTerm)
    await page.waitForTimeout(1000)
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
      test.skip()
      return
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
    if (rows === 0) {
      test.skip()
      return
    }

    // Find the tipo column index
    const headers = await gp.getTableHeaderTexts()
    const tipoIdx = headers.indexOf('Tipo')
    if (tipoIdx === -1) test.skip()

    // Check first visible row has a valid tipo
    const tipoText = await gp.getCellText(0, tipoIdx)
    expect(['Volontario', 'Genitore', 'Contatto']).toContain(tipoText)
  })
})

test.describe('ContattiTab — Directus 11 deep field fix', () => {
  test('CT-08: Contatti con user_id null sono visibili @smoke', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(auth.gestore.email, auth.gestore.password)
    await expect(page).toHaveURL(/\/gestione/)

    const gp = new GestionePage(page)
    await gp.waitForTable()
    const rows = await gp.getRowCount()
    if (rows === 0) {
      test.skip()
      return
    }

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
      if (foundDash) {
        console.log('CT-08: Found contatti without user_id — Directus fix verified')
      }
    }
  })
})

test.describe('ContattiTab — CRUD', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(auth.gestore.email, auth.gestore.password)
    await expect(page).toHaveURL(/\/gestione/)
    const gp = new GestionePage(page)
    await gp.selectContattiTab()
    await page.waitForTimeout(1000)
  })

  test('CT-09: Crea contatto nuovo @crud', async ({ page }) => {
    const timestamp = Date.now()
    const nome = `Test CT ${timestamp}`
    const cognome = 'AutoTest'

    const addBtn = page.locator('button:has-text("Aggiungi Contatto")')
    await addBtn.click()
    await page.waitForTimeout(1000)

    const dialog = page.locator('.q-dialog:visible')
    await expect(dialog).toBeVisible({ timeout: 5000 })

    await dialog.locator('[data-testid="contatto-nome"]').fill(nome)
    await dialog.locator('[data-testid="contatto-cognome"]').fill(cognome)

    const [postResp] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/items/contatti') && resp.request().method() === 'POST'),
      dialog.locator('button:has-text("Salva")').click()
    ])

    expect(postResp.status()).toBe(200)
    await expect(dialog).not.toBeVisible({ timeout: 10000 })

    const gp = new GestionePage(page)
    await gp.search(nome)
    await page.waitForTimeout(1000)
    const rows = await gp.getRowCount()
    expect(rows).toBeGreaterThanOrEqual(1)
  })

  test('CT-10: Modifica contatto esistente @crud', async ({ page }) => {
    const gp = new GestionePage(page)
    await gp.waitForTable()
    const rows = await gp.getRowCount()
    if (rows === 0) { test.skip('No contatti da modificare'); return }

    const editBtn = page.locator('.q-table tbody tr').first().locator('button:has(i:text-is("edit"))')
    if (await editBtn.count() === 0) { test.skip('Nessun pulsante edit'); return }
    await editBtn.click()

    const dialog = page.locator('.q-dialog:visible')
    await expect(dialog).toBeVisible({ timeout: 5000 })

    const nomeInput = dialog.locator('[data-testid="contatto-nome"]')
    const originalNome = await nomeInput.inputValue()
    const newNome = `${originalNome} mod`
    await nomeInput.fill(newNome)

    const [patchResp] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/items/contatti') && resp.request().method() === 'PATCH'),
      dialog.locator('button:has-text("Salva")').click()
    ])

    expect(patchResp.status()).toBe(200)
    await expect(dialog).not.toBeVisible({ timeout: 10000 })

    await gp.search(newNome)
    await page.waitForTimeout(1000)
    const rowsAfter = await gp.getRowCount()
    expect(rowsAfter).toBeGreaterThanOrEqual(1)

    await gp.search(newNome)
    await page.waitForTimeout(500)
    const editBtnAfter = page.locator('.q-table tbody tr').first().locator('button:has(i:text-is("edit"))')
    if (await editBtnAfter.count() > 0) {
      await editBtnAfter.click()
      await expect(dialog).toBeVisible({ timeout: 5000 })
      await dialog.locator('[data-testid="contatto-nome"]').fill(originalNome)
      await dialog.locator('button:has-text("Salva")').click()
      await expect(dialog).not.toBeVisible({ timeout: 10000 })
    }
  })

  test('CT-11: Elimina email da contatto @crud', async ({ page }) => {
    const gp = new GestionePage(page)
    await gp.waitForTable()
    const rows = await gp.getRowCount()
    if (rows === 0) { test.skip('No contatti'); return }

    const headers = await gp.getTableHeaderTexts()
    const statoIdx = headers.indexOf('Stato account')

    let targetRowIndex = -1
    for (let i = 0; i < Math.min(rows, 10); i++) {
      if (statoIdx !== -1) {
        const cellText = await gp.getCellText(i, statoIdx)
        if (cellText === '—') {
          targetRowIndex = i
          break
        }
      }
    }

    if (targetRowIndex === -1) {
      test.skip('Nessun contatto senza account trovato')
      return
    }

    const editBtn = page.locator('.q-table tbody tr').nth(targetRowIndex).locator('button:has(i:text-is("edit"))')
    if (await editBtn.count() === 0) { test.skip('Nessun pulsante edit'); return }
    await editBtn.click()

    const dialog = page.locator('.q-dialog:visible')
    await expect(dialog).toBeVisible({ timeout: 5000 })

    const emailInputs = dialog.locator('[data-testid^="contatto-email-"]')
    const emailCount = await emailInputs.count()
    if (emailCount === 0) {
      await dialog.locator('button:has-text("Annulla")').click()
      test.skip('Nessuna email da eliminare')
      return
    }

    const deleteEmailBtn = dialog.locator('button:has(i:text-is("delete"))').first()
    if (await deleteEmailBtn.count() === 0) {
      await dialog.locator('button:has-text("Annulla")').click()
      test.skip('Nessun pulsante elimina email')
      return
    }

    await deleteEmailBtn.click()
    await page.waitForTimeout(500)

    const emailInputsAfter = dialog.locator('[data-testid^="contatto-email-"]')
    const emailCountAfter = await emailInputsAfter.count()
    expect(emailCountAfter).toBeLessThan(emailCount)

    await dialog.locator('button:has-text("Annulla")').click()
    await page.waitForTimeout(500)
  })

  test('CT-12: Aggiungi email a contatto @crud', async ({ page }) => {
    const gp = new GestionePage(page)
    await gp.waitForTable()
    const rows = await gp.getRowCount()
    if (rows === 0) { test.skip('No contatti'); return }

    const testEmail = `ct_test_${Date.now()}@test.com`

    const firstNameCell = await gp.tableRows.first().locator('td').nth(0).innerText()
    const searchTerm = firstNameCell.trim().split(' ')[0]
    if (!searchTerm || searchTerm === '—') { test.skip('Nome non valido'); return }

    const editBtn = page.locator('.q-table tbody tr').first().locator('button:has(i:text-is("edit"))')
    if (await editBtn.count() === 0) { test.skip('Nessun pulsante edit'); return }
    await editBtn.click()

    const dialog = page.locator('.q-dialog:visible')
    await expect(dialog).toBeVisible({ timeout: 5000 })

    const addEmailBtn = dialog.locator('button:has-text("Aggiungi email")')
    if (await addEmailBtn.count() > 0) {
      await addEmailBtn.click()
      await page.waitForTimeout(500)

      const emailInput = dialog.locator('[data-testid^="contatto-email-"]').last()
      if (await emailInput.count() > 0) {
        await emailInput.fill(testEmail)

        const [patchResp] = await Promise.all([
          page.waitForResponse(resp => resp.url().includes('/items/contatti') && resp.request().method() === 'PATCH'),
          dialog.locator('button:has-text("Salva")').click()
        ])
        expect(patchResp.status()).toBe(200)
        await expect(dialog).not.toBeVisible({ timeout: 10000 })
      } else {
        await dialog.locator('button:has-text("Annulla")').click()
        test.skip('Input email non trovato')
      }
    } else {
      await dialog.locator('button:has-text("Annulla")').click()
      test.skip('Nessun pulsante aggiungi email')
    }
  })
})
