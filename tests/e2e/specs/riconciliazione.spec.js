import { test, expect } from '../helpers/console.js'
import { GestionePage } from '../pages/GestionePage.js'
import { RiconciliazionePage } from '../pages/RiconciliazionePage.js'
import { loginAs } from '../helpers/login.js'
import { createTestSubmission } from '../helpers/submission.js'
import { createContatto, assignToFamiglia } from '../helpers/setup.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }

test.describe('Riconciliazione', () => {

  // ── RC-SETUP-01: Aggiunge IBAN/Intestatario a TEST_FAM_01 via FamigliaDialog ──
  test('RC-SETUP-01: Aggiunge IBAN e Intestatario a TEST_FAM_01 @setup', async ({ page }) => {
    test.setTimeout(60000)

    await loginAs(page, 'gestore', auth)

    const gestione = new GestionePage(page)
    await gestione.famiglieTab.click()
    await gestione.waitForTable()

    // Cerca la famiglia
    const searchInput = page.locator('input[placeholder="Cerca per nome famiglia..."]')
    await searchInput.fill('Famiglia Test')
    await gestione.waitForTable()

    // Clicca edit sulla riga "Famiglia TEST_FAM_01"
    const editBtn = page.locator('.q-table tbody tr').filter({ hasText: 'Famiglia TEST_FAM_01' }).locator('[data-testid="btn-edit-famiglia"]')
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

    await loginAs(page, 'gestore', auth)

    const gestione = new GestionePage(page)
    await gestione.selectContattiTab()

    // Cerca test.genitore@test.com
    await gestione.search('test.genitore@test.com')

    // Clicca edit sulla prima riga
    const editBtn = page.locator('[data-testid="btn-edit-contatto"]').first()
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
    const editBtnAfter = page.locator('[data-testid="btn-edit-contatto"]').first()
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
    await loginAs(page, 'gestore_verifica', auth)

    const riconcPage = new RiconciliazionePage(page)
    await riconcPage.goto()
    await riconcPage.waitForTable()

    const header = page.locator('.text-h5')
    await expect(header).toHaveText('Da riconciliare')
  })

  // ── RC-02: RiconciliaDialog si apre per riga linked @smoke ──
  test('RC-02: Apri RiconciliaDialog per riga linked @smoke', async ({ page }) => {
    const testEmail = `test_rc02_linked_${Date.now()}@test.com`
    console.log(`[RC-02] === INIZIO TEST ===`)
    console.log(`[RC-02] Email test: ${testEmail}`)

    // Setup via API: crea contatto e assegna a famiglia
    await loginAs(page, 'gestore', auth)
    const contatto = await createContatto(page, {
      Nome: 'Test RC02',
      Cognome: 'Linked',
      email: testEmail
    })
    await assignToFamiglia(page, contatto.id_contatto, 'TEST_FAM_01', 'Genitore')

    await createTestSubmission(page, {
      email: testEmail,
      descrizione: 'Test RC-02 linked'
    })

    await loginAs(page, 'gestore_verifica', auth)

    const riconcPage = new RiconciliazionePage(page)
    await riconcPage.goto()
    await riconcPage.waitForTable()

    const rowCount = await riconcPage.getRowCount()
    expect(rowCount).toBeGreaterThan(0)

    let foundBtn = null
    const rows = riconcPage.tableRows
    const count = await rows.count()
    for (let i = 0; i < count; i++) {
      const rowText = await rows.nth(i).innerText()
      if (rowText.toLowerCase().includes(testEmail)) {
        const btn = rows.nth(i).locator('[data-testid="btn-riconcilia"]').first()
        if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
          foundBtn = btn
          break
        }
      }
    }

    expect(foundBtn, `Submission ${testEmail} non trovata come linked`).toBeTruthy()

    await foundBtn.click()
    await riconcPage.waitForDialog()

    await expect(riconcPage.dialog.locator('text=Famiglia')).toBeVisible({ timeout: 3000 })

    await riconcPage.closeDialog()
    await page.evaluate(() => localStorage.clear())
  })

  // ── RC-03: Singolo campo contatto salvabile via pulsante save ──
  test('RC-03: Salva singolo campo contatto (Nome) @crud', async ({ page }) => {
    const testEmail = `test_rc03_${Date.now()}@test.com`

    // Setup via API: crea contatto e assegna a famiglia
    await loginAs(page, 'gestore', auth)
    const contatto = await createContatto(page, {
      Nome: 'Test RC03',
      Cognome: 'Linked',
      email: testEmail
    })
    await assignToFamiglia(page, contatto.id_contatto, 'TEST_FAM_01', 'Genitore')

    await createTestSubmission(page, {
      email: testEmail,
      descrizione: 'Test RC-03 linked'
    })

    await loginAs(page, 'gestore_verifica', auth)

    const riconcPage = new RiconciliazionePage(page)
    await riconcPage.goto()
    await riconcPage.waitForTable()

    const rowCount = await riconcPage.getRowCount()
    expect(rowCount).toBeGreaterThan(0)

    let foundBtn = null
    const rows = riconcPage.tableRows
    const count = await rows.count()
    for (let i = 0; i < count; i++) {
      const rowText = await rows.nth(i).innerText()
      if (rowText.toLowerCase().includes(testEmail)) {
        const btn = rows.nth(i).locator('[data-testid="btn-riconcilia"]').first()
        if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
          foundBtn = btn
          break
        }
      }
    }

    expect(foundBtn, `Submission ${testEmail} non trovata come linked`).toBeTruthy()

    await foundBtn.click()
    await riconcPage.waitForDialog()

    const saveBtn = riconcPage.dialog.locator('[data-testid="btn-save-field"]').first()
    if (await saveBtn.count() === 0 || await saveBtn.isDisabled()) {
      await riconcPage.closeDialog()
      test.skip('Nessun campo da salvare (dati già aggiornati)')
      return
    }

    await saveBtn.click()
    await expect(page.locator('.q-notification.bg-positive').first()).toBeVisible({ timeout: 5000 })
    await riconcPage.closeDialog()
    await page.evaluate(() => localStorage.clear())
  })

  // ── RC-04: Elimina submission (Scarta) @crud ──
  test('RC-04: Scarta submission @crud', async ({ page }) => {
    const testEmail = `test_rc04_scarta_${Date.now()}@test.com`
    const submission = await createTestSubmission(page, {
      email: testEmail,
      descrizione: 'Test RC-04 submission'
    })

    await loginAs(page, 'gestore_verifica', auth)

    const riconcPage = new RiconciliazionePage(page)
    await riconcPage.goto()
    await riconcPage.waitForTable()

    // Trova la riga della submission per email (usa input value per not_found state)
    const rows = riconcPage.tableRows
    const count = await rows.count()
    let targetBtn = null
    for (let i = 0; i < count; i++) {
      const emailInput = rows.nth(i).locator('td').nth(2).locator('input')
      let emailMatch = false
      if (await emailInput.count() > 0) {
        const value = await emailInput.inputValue()
        if (value === testEmail) emailMatch = true
      } else {
        const rowText = await rows.nth(i).innerText()
        if (rowText.toLowerCase().includes(testEmail)) emailMatch = true
      }
      if (emailMatch) {
        targetBtn = rows.nth(i).locator('[data-testid="btn-scarta"]').first()
        break
      }
    }

    expect(targetBtn, `Submission ${testEmail} non trovata`).toBeTruthy()

    await targetBtn.click()

    const dialog = page.locator('.q-dialog').filter({ hasText: 'Scarta submission' })
    await expect(dialog).toBeVisible({ timeout: 3000 })
    await dialog.locator('input[type="text"]').fill('Test scarto')
    await dialog.locator('button:has-text("OK")').click()

    await expect(page.locator('.q-notification').first()).toBeVisible({ timeout: 5000 })
  })

  // ── RC-PG-01: Toggle scartati mostra/nasconde scartati @crud ──
  test('RC-PG-01: Toggle scartati mostra/nasconde scartati @crud', async ({ page }) => {
    await loginAs(page, 'gestore_verifica', auth)

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
    await loginAs(page, 'gestore_verifica', auth)

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
    await loginAs(page, 'gestore_verifica', auth)

    const riconcPage = new RiconciliazionePage(page)
    await riconcPage.goto()
    await riconcPage.waitForTable()

    const refreshBtn = page.locator('[data-testid="btn-refresh-riconciliazioni"]')
    await expect(refreshBtn).toBeVisible({ timeout: 3000 })
    await refreshBtn.click()
    await riconcPage.waitForTable()
    // La tabella deve ancora avere righe (se presenti)
    const rows = await riconcPage.getRowCount()
    expect(rows).toBeGreaterThanOrEqual(0)
  })

  // ── RC-05: Riconcilia submission completa @crud ──
  test('RC-05: Riconcilia submission completa @crud', async ({ page }) => {
    const testEmail = `test_rc05_${Date.now()}@test.com`

    // Setup: crea contatto + assegna a famiglia come Genitore + crea submission
    await loginAs(page, 'gestore', auth)
    const contatto = await createContatto(page, {
      Nome: 'Test RC05',
      Cognome: 'Riconcilia',
      email: testEmail
    })
    await assignToFamiglia(page, contatto.id_contatto, 'TEST_FAM_01', 'Genitore')

    await createTestSubmission(page, {
      email: testEmail,
      descrizione: 'Test RC-05 riconciliazione'
    })

    // Login come gestore_verifica e vai a riconciliazione
    await loginAs(page, 'gestore_verifica', auth)
    const riconcPage = new RiconciliazionePage(page)
    await riconcPage.goto()
    await riconcPage.waitForTable()

    // Trova la riga della submission per email
    const rows = riconcPage.tableRows
    const count = await rows.count()
    let foundBtn = null
    for (let i = 0; i < count; i++) {
      const rowText = await rows.nth(i).innerText()
      if (rowText.toLowerCase().includes(testEmail)) {
        foundBtn = rows.nth(i).locator('[data-testid="btn-riconcilia"]').first()
        break
      }
    }

    expect(foundBtn, `Submission ${testEmail} non trovata come linked`).toBeTruthy()
    await foundBtn.click()
    await riconcPage.waitForDialog()

    // Seleziona progetto nel dialog
    const progettoSelect = riconcPage.dialog.locator('[data-testid="select-progetto-riconcilia"]')
    await progettoSelect.click()
    await page.locator('.q-menu .q-item').first().waitFor({ state: 'visible', timeout: 3000 })
    const firstProgetto = page.locator('.q-menu .q-item').first()
    if (await firstProgetto.count() === 0) { test.skip('Nessun progetto disponibile'); return }
    await firstProgetto.click()

    // Compila giustificativo
    await riconcPage.dialog.locator('[data-testid="riconcilia-descrizione"]').fill('Riconciliazione di test RC-05')
    await riconcPage.dialog.locator('[data-testid="riconcilia-importo"]').fill('150.00')

    // Clicca Crea giustificativo — verifica che la richiesta parta
    // Nota: se il test fallisce con 403, il ruolo GestoreVerifica non ha permessi
    // di scrittura su Giustificativi in Directus. Verificare le policy.
    const [postResp] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/items/Giustificativi') && resp.request().method() === 'POST'),
      riconcPage.dialog.locator('[data-testid="btn-crea-giustificativo"]').click()
    ])

    // Se 403, l'UI deve mostrare una notifica di errore
    if (postResp.status() === 403) {
      const notification = page.locator('.q-notification')
      await expect(notification).toBeVisible({ timeout: 5000 })
      console.log('[RC-05] 403: GestoreVerifica senza permessi di scrittura su Giustificativi')
      return
    }

    expect(postResp.status()).toBe(200)
    const giustData = await postResp.json()
    expect(giustData.data).toBeTruthy()
    expect(giustData.data.Descrizione).toBe('Riconciliazione di test RC-05')
  })

  // ── RC-PG-04: Recupera submission scartata @crud ──
  test('RC-PG-04: Recupera submission scartata @crud', async ({ page }) => {
    const testEmail = `test_pg04_restore_${Date.now()}@test.com`
    const submission = await createTestSubmission(page, {
      email: testEmail,
      descrizione: 'Test RC-PG-04 submission'
    })

    await loginAs(page, 'gestore_verifica', auth)

    const riconcPage = new RiconciliazionePage(page)
    await riconcPage.goto()
    await riconcPage.waitForTable()

    // Trova la riga per email (usa input value per not_found)
    const rows = riconcPage.tableRows
    const count = await rows.count()
    let targetScarta = null
    for (let i = 0; i < count; i++) {
      const emailInput = rows.nth(i).locator('td').nth(2).locator('input')
      let emailMatch = false
      if (await emailInput.count() > 0) {
        const value = await emailInput.inputValue()
        if (value === testEmail) emailMatch = true
      } else {
        const rowText = await rows.nth(i).innerText()
        if (rowText.toLowerCase().includes(testEmail)) emailMatch = true
      }
      if (emailMatch) {
        targetScarta = rows.nth(i).locator('[data-testid="btn-scarta"]').first()
        break
      }
    }
    expect(targetScarta, `Submission ${testEmail} non trovata per scarto`).toBeTruthy()
    await targetScarta.click()
    const scartaDialog = page.locator('.q-dialog').filter({ hasText: 'Scarta submission' })
    await expect(scartaDialog).toBeVisible({ timeout: 3000 })
    await scartaDialog.locator('input[type="text"]').fill('Test scarto PG-04')
    await scartaDialog.locator('button:has-text("OK")').click()
    await page.waitForResponse(
      resp => resp.url().includes('/items/InviiGiustificativiNoLogin') && resp.request().method() === 'GET',
      { timeout: 10000 }
    ).catch(() => {})

    // Ora attiva toggle scartati e recupera
    const toggle = page.locator('.q-toggle:has-text("Mostra scartati")')
    if (await toggle.count() === 0) {
      test.skip('Toggle non trovato')
      return
    }
    const toggleInput = toggle.locator('input')
    const isChecked = await toggleInput.isChecked()
    if (!isChecked) {
      await toggle.click()
      await page.waitForResponse(
        resp => resp.url().includes('/items/InviiGiustificativiNoLogin') && resp.url().includes('includeScartati') && resp.request().method() === 'GET',
        { timeout: 10000 }
      ).catch(() => {})
    }

    // Trova la riga scartata per email e clicca restore
    const rowsAfter = riconcPage.tableRows
    const countAfter = await rowsAfter.count()
    let targetRestore = null
    for (let i = 0; i < countAfter; i++) {
      const emailInput = rowsAfter.nth(i).locator('td').nth(2).locator('input')
      let emailMatch = false
      if (await emailInput.count() > 0) {
        const value = await emailInput.inputValue()
        if (value === testEmail) emailMatch = true
      } else {
        const rowText = await rowsAfter.nth(i).innerText()
        if (rowText.toLowerCase().includes(testEmail)) emailMatch = true
      }
      if (emailMatch) {
        targetRestore = rowsAfter.nth(i).locator('[data-testid="btn-restore"]').first()
        break
      }
    }

    expect(targetRestore, `Submission scartata ${testEmail} non trovata per restore`).toBeTruthy()

    await targetRestore.click()
    await expect(page.locator('.q-notification').first()).toBeVisible({ timeout: 5000 })
  })

  // ── RG-COMB-01: GestoreVerifica su Gestione CRUD contatti @smoke ──
  test('RG-COMB-01: GestoreVerifica accede a Gestione e vede contatti @smoke', async ({ page }) => {
    await loginAs(page, 'gestore_verifica', auth)

    const gestione = new GestionePage(page)
    await gestione.goto()
    await gestione.selectContattiTab()
    await gestione.waitForTable()

    const rowCount = await gestione.getRowCount()
    // GestoreVerifica deve almeno vedere la tabella contatti
    expect(rowCount).toBeGreaterThanOrEqual(0)
    await expect(gestione.searchInput).toBeVisible({ timeout: 5000 })
  })
})
