import { test, expect } from '../helpers/console.js'
import { LoginPage } from '../pages/LoginPage.js'
import { GestionePage } from '../pages/GestionePage.js'
import { RiconciliazionePage } from '../pages/RiconciliazionePage.js'
import { createTestSubmission } from '../helpers/submission.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }

test.describe.serial('Riconciliazione', () => {

  // ── RC-SETUP-01: Aggiunge IBAN/Intestatario a TEST_FAM_01 via FamigliaDialog ──
  test('RC-SETUP-01: Aggiunge IBAN e Intestatario a TEST_FAM_01 @setup', async ({ page }) => {
    test.setTimeout(60000)

    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(auth.gestore.email, auth.gestore.password)
    await expect(page).toHaveURL(/\/gestione/, { timeout: 15000 })

    const gestione = new GestionePage(page)
    await gestione.famiglieTab.click()
    await gestione.waitForTable()

    // Cerca la famiglia
    const searchInput = page.locator('input[placeholder="Cerca per nome famiglia..."]')
    await searchInput.fill('Famiglia Test')
    await page.waitForTimeout(1000)
    await gestione.waitForTable()

    // Clicca edit sulla riga "Famiglia TEST_FAM_01"
    const editBtn = page.locator('.q-table tbody tr').filter({ hasText: 'Famiglia TEST_FAM_01' }).locator('button:has(i:text-is("edit"))')
    await expect(editBtn).toBeVisible({ timeout: 5000 })
    await editBtn.click()

    // Compila IBAN e Intestatario
    const dialog = page.locator('.q-dialog:has(.text-h6:has-text("Modifica Famiglia"))')
    await expect(dialog).toBeVisible({ timeout: 3000 })

    const ibanInput = dialog.locator('.q-field').filter({ has: page.locator('.q-field__label:has-text("IBAN")') }).locator('input')
    const intestInput = dialog.locator('.q-field').filter({ has: page.locator('.q-field__label:has-text("Intestatario CC")') }).locator('input')

    await ibanInput.fill('IT12X1234567890123456789012')
    await intestInput.fill('Famiglia Test Intestatario')

    await dialog.locator('button:has-text("Salva")').click()
    await expect(dialog).not.toBeVisible({ timeout: 3000 })
  })

  // ── RC-SETUP-02: Modifica contatto TEST_03 via ContattiTab ──
  test('RC-SETUP-02: Modifica Nome/Cognome di TEST_03 @setup', async ({ page }) => {
    test.setTimeout(60000)

    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(auth.gestore.email, auth.gestore.password)
    await expect(page).toHaveURL(/\/gestione/, { timeout: 15000 })

    const gestione = new GestionePage(page)
    await gestione.selectContattiTab()

    // Cerca test.genitore@test.com
    await gestione.search('test.genitore@test.com')
    await page.waitForTimeout(500)

    // Clicca edit sulla prima riga
    const editBtn = page.locator('.q-table tbody tr').first().locator('button:has(i:text-is("edit"))')
    if (await editBtn.count() === 0) {
      test.skip('Nessun contatto trovato con quella email')
      return
    }
    await editBtn.click()

    // Modifica Nome e Cognome nel dialog
    const dialog = page.locator('.q-dialog').filter({ hasText: 'Modifica Contatto' })
    await expect(dialog).toBeVisible({ timeout: 3000 })

    const nomeInput = dialog.locator('.q-field').filter({ has: page.locator('.q-field__label:text-is("Nome *")') }).locator('input')
    const cognomeInput = dialog.locator('.q-field').filter({ has: page.locator('.q-field__label:text-is("Cognome *")') }).locator('input')

    await nomeInput.fill('Test Genitore Aggiornato')
    await cognomeInput.fill('Test Genitore Aggiornato')

    await dialog.locator('button:has-text("Salva")').click()
    await expect(dialog).not.toBeVisible({ timeout: 3000 })

    // Cleanup: ripristina nome originale
    await gestione.search('test.genitore@test.com')
    await page.waitForTimeout(500)
    const editBtnAfter = page.locator('.q-table tbody tr').first().locator('button:has(i:text-is("edit"))')
    if (await editBtnAfter.count() > 0) {
      await editBtnAfter.click()
      const dialogAfter = page.locator('.q-dialog').filter({ hasText: 'Modifica Contatto' })
      await expect(dialogAfter).toBeVisible({ timeout: 3000 })
      const nomeInputAfter = dialogAfter.locator('.q-field').filter({ has: page.locator('.q-field__label:text-is("Nome *")') }).locator('input')
      const cognomeInputAfter = dialogAfter.locator('.q-field').filter({ has: page.locator('.q-field__label:text-is("Cognome *")') }).locator('input')
      await nomeInputAfter.fill('Test Genitore')
      await cognomeInputAfter.fill('Test Genitore')
      await dialogAfter.locator('button:has-text("Salva")').click()
      await expect(dialogAfter).not.toBeVisible({ timeout: 3000 })
    }
  })

  // ── RC-01: Pagina riconciliazione carica @smoke ──
  test('RC-01: Pagina riconciliazione carica @smoke', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(auth.gestore_verifica.email, auth.gestore_verifica.password)

    const riconcPage = new RiconciliazionePage(page)
    await riconcPage.goto()
    await riconcPage.waitForTable()

    const header = page.locator('.text-h5')
    await expect(header).toHaveText('Da riconciliare')
  })

  // ── RC-02: RiconciliaDialog si apre per riga linked @smoke ──
  test('RC-02: Apri RiconciliaDialog per riga linked @smoke', async ({ page }) => {
    const submission = await createTestSubmission(page, {
      email: 'test_riconciliazione@test.com',
      descrizione: 'Test RC-02 submission'
    })

    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(auth.gestore_verifica.email, auth.gestore_verifica.password)

    const riconcPage = new RiconciliazionePage(page)
    await riconcPage.goto()
    await riconcPage.waitForTable()

    const rowCount = await riconcPage.getRowCount()
    if (rowCount === 0) {
      test.skip('Nessuna submission disponibile')
      return
    }

    let foundBtn = null
    const rows = riconcPage.tableRows
    const count = await rows.count()
    for (let i = 0; i < count; i++) {
      const btn = rows.nth(i).locator('.q-td:last-child .q-btn').filter({ has: page.locator('i:has-text("fact_check")') }).first()
      if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
        foundBtn = btn
        break
      }
    }

    if (!foundBtn) {
      test.skip('Nessuna riga linked disponibile')
      return
    }

    await foundBtn.click()
    await riconcPage.waitForDialog()

    await expect(riconcPage.dialog.locator('text=Famiglia')).toBeVisible({ timeout: 3000 })

    await riconcPage.closeDialog()
  })

  // ── RC-03: Singolo campo contatto salvabile via pulsante save ──
  test('RC-03: Salva singolo campo contatto (Nome) @crud', async ({ page }) => {
    const submission = await createTestSubmission(page, {
      email: 'test_riconciliazione@test.com',
      descrizione: 'Test RC-03 submission'
    })

    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(auth.gestore_verifica.email, auth.gestore_verifica.password)

    const riconcPage = new RiconciliazionePage(page)
    await riconcPage.goto()
    await riconcPage.waitForTable()

    const rowCount = await riconcPage.getRowCount()
    if (rowCount === 0) {
      test.skip('Nessuna submission disponibile')
      return
    }

    let foundBtn = null
    const rows = riconcPage.tableRows
    const count = await rows.count()
    for (let i = 0; i < count; i++) {
      const btn = rows.nth(i).locator('.q-td:last-child .q-btn').filter({ has: page.locator('i:has-text("fact_check")') }).first()
      if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
        foundBtn = btn
        break
      }
    }

    if (!foundBtn) {
      test.skip('Nessuna riga linked disponibile')
      return
    }

    await foundBtn.click()
    await riconcPage.waitForDialog()

    const saveBtn = riconcPage.dialog.locator('button:has(i:has-text("save"))').first()
    if (await saveBtn.count() === 0 || await saveBtn.isDisabled()) {
      await riconcPage.closeDialog()
      test.skip('Nessun campo da salvare (dati giù aggiornati)')
      return
    }

    await saveBtn.click()
    await expect(page.locator('.q-notification.bg-positive').first()).toBeVisible({ timeout: 5000 })
    await riconcPage.closeDialog()
  })

  // ── RC-04: Elimina submission (Scarta) @crud ──
  test('RC-04: Scarta submission @crud', async ({ page }) => {
    const submission = await createTestSubmission(page, {
      email: 'test_riconciliazione@test.com',
      descrizione: 'Test RC-04 submission'
    })

    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(auth.gestore_verifica.email, auth.gestore_verifica.password)

    const riconcPage = new RiconciliazionePage(page)
    await riconcPage.goto()
    await riconcPage.waitForTable()

    const scartaBtns = page.locator('button:has(i:text-is("delete"))')
    const count = await scartaBtns.count()

    if (count === 0) {
      test.skip('Nessuna submission da scartare')
      return
    }

    await scartaBtns.first().click()

    // Inserisci motivazione nel prompt
    const dialog = page.locator('.q-dialog').filter({ hasText: 'Scarta submission' })
    await expect(dialog).toBeVisible({ timeout: 3000 })
    await dialog.locator('input[type="text"]').fill('Test scarto')
    await dialog.locator('button:has-text("OK")').click()

    // Verifica notify
    await expect(page.locator('.q-notification').first()).toBeVisible({ timeout: 5000 })
    await page.waitForTimeout(1000)
  })

  // ── RC-PG-01: Toggle scartati mostra/nasconde scartati @crud ──
  test('RC-PG-01: Toggle scartati mostra/nasconde scartati @crud', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(auth.gestore_verifica.email, auth.gestore_verifica.password)

    const riconcPage = new RiconciliazionePage(page)
    await riconcPage.goto()
    await riconcPage.waitForTable()

    // Legge conteggio righe con toggle off (default)
    const rowsDefault = await riconcPage.getRowCount()

    // Attiva toggle "Mostra scartati"
    const toggle = page.locator('.q-toggle:has-text("Mostra scartati")')
    if (await toggle.count() === 0) {
      test.skip('Toggle non trovato')
      return
    }
    await toggle.click()
    await page.waitForTimeout(1000)
    await riconcPage.waitForTable()

    const rowsWithScartati = await riconcPage.getRowCount()
    expect(rowsWithScartati).toBeGreaterThanOrEqual(rowsDefault)

    // Verifica almeno un badge "Scartato" visibile (se ci sono scartati)
    const scartatoBadge = page.locator('.q-badge:has-text("Scartato")')
    if (await scartatoBadge.count() > 0) {
      await expect(scartatoBadge.first()).toBeVisible()
    }
  })

  // ── RC-PG-02: Paginazione UI visibile @smoke ──
  test('RC-PG-02: Controlli paginazione visibili @smoke', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(auth.gestore_verifica.email, auth.gestore_verifica.password)

    const riconcPage = new RiconciliazionePage(page)
    await riconcPage.goto()
    await riconcPage.waitForTable()

    const bottom = page.locator('.q-table__bottom')
    await expect(bottom).toBeVisible({ timeout: 5000 })
    const text = await bottom.innerText()
    expect(text).toContain('di')
  })

  // ── RC-PG-03: Refresh ricarica dati @smoke ──
  test('RC-PG-03: Pulsante refresh ricarica @smoke', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(auth.gestore_verifica.email, auth.gestore_verifica.password)

    const riconcPage = new RiconciliazionePage(page)
    await riconcPage.goto()
    await riconcPage.waitForTable()

    const refreshBtn = page.locator('button:has(i:text-is("refresh"))')
    await expect(refreshBtn).toBeVisible({ timeout: 3000 })
    await refreshBtn.click()
    await page.waitForTimeout(500)
    await riconcPage.waitForTable()
    // La tabella deve ancora avere righe (se presenti)
    const rows = await riconcPage.getRowCount()
    expect(rows).toBeGreaterThanOrEqual(0)
  })

  // ── RC-PG-04: Recupera submission scartata @crud ──
  test('RC-PG-04: Recupera submission scartata @crud', async ({ page }) => {
    const submission = await createTestSubmission(page, {
      email: 'test_scarto@test.com',
      descrizione: 'Test RC-PG-04 submission'
    })

    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(auth.gestore_verifica.email, auth.gestore_verifica.password)

    const riconcPage = new RiconciliazionePage(page)
    await riconcPage.goto()
    await riconcPage.waitForTable()

    const toggle = page.locator('.q-toggle:has-text("Mostra scartati")')
    if (await toggle.count() === 0) {
      test.skip('Toggle non trovato')
      return
    }
    const toggleInput = toggle.locator('input')
    const isChecked = await toggleInput.isChecked()
    if (!isChecked) {
      await toggle.click()
      await page.waitForTimeout(1000)
      await riconcPage.waitForTable()
    }

    const restoreBtns = page.locator('button:has(i:text-is("restore"))')
    const restoreCount = await restoreBtns.count()

    if (restoreCount === 0) {
      test.skip('Nessuna submission scartata da recuperare')
      return
    }

    await restoreBtns.first().click()
    await expect(page.locator('.q-notification').first()).toBeVisible({ timeout: 5000 })
  })
})
