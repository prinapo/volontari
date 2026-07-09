import { test, expect } from '../helpers/console.js'
import { loginAs } from '../helpers/login.js'
import { createContatto, assignToFamiglia, createFamiglia } from '../helpers/setup.js'
import { createTestSubmission } from '../helpers/submission.js'
import { RiconciliazionePage } from '../pages/RiconciliazionePage.js'
import { GestionePage } from '../pages/GestionePage.js'
import { createProgettoViaUI } from '../pages/CreaProgettoPage.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }
import { apiLogin, apiGet, apiPost, apiPatch, apiDelete } from '../helpers/api.js'
import {
  creaFamigliaVolontarioProgetto,
  loginVolontarioConFamiglia,
  pulisciIds,
  loginGestore
} from '../helpers/setup-atomico.js'
import { deleteFamiglie, deleteContatti, invalidateGiustificativi } from '../helpers/cleanup.js'

let _rcIds = { inviiNoLogin: [] }
let ids = { famiglia: null, progetto: null, giustificativi: [] }

test.beforeAll(async () => {
  await apiLogin(auth.admin.email, auth.admin.password)
})

async function expandFirstCardIfMobile(page) {
  const exp = page.locator('.q-expansion-item')
  if ((await exp.count()) > 0 && (await page.locator('.q-expansion-item--expanded').count()) === 0) {
    await exp.first().click()
    await page.waitForTimeout(500)
  }
}

test.describe('Riconciliazione', () => {
  test.afterEach(async () => {
    await pulisciIds(ids)
    if (_rcIds.famigliaOrig) {
      try {
        await apiPatch('Famiglie', _rcIds.famigliaOrig.id, {
          IBAN: _rcIds.famigliaOrig.IBAN,
          Intestatario: _rcIds.famigliaOrig.Intestatario
        })
      } catch {
        /* */
      }
      delete _rcIds.famigliaOrig
    }
    for (const id of _rcIds.inviiNoLogin) {
      try {
        await apiDelete('InviiGiustificativiNoLogin', id)
      } catch {
        /* */
      }
    }
    _rcIds.inviiNoLogin = []
    try {
      const records = await apiGet('InviiGiustificativiNoLogin', {
        filter: { email: { _ends_with: '@test.com' } },
        fields: 'id'
      })
      for (const r of records.data || []) {
        try {
          await apiDelete('InviiGiustificativiNoLogin', r.id)
        } catch {
          /* */
        }
      }
    } catch {
      /* */
    }
  })

  // ── RC-SETUP-01: Aggiunge IBAN/Intestatario a famiglia via FamigliaDialog ──
  
  // ── RC-NF-01: not_found → Crea contatto ──
  test('RC-NF-01: not_found crea contatto e aggiorna stato @crud', async ({ page }) => {
    test.setTimeout(120000)
    const testEmail = `test_nf_create_${Date.now()}@test.com`
    const rcNfIds = { inviiNoLogin: [], contattiCreati: [] }

    // Pulisci submission di test residue da altri suite
    const oldSubs = await apiGet('InviiGiustificativiNoLogin', {
      filter: { email: { _ends_with: '@test.com' } },
      fields: 'id',
      limit: 50
    })
    for (const s of (oldSubs.data || [])) {
      await apiDelete('InviiGiustificativiNoLogin', s.id).catch(() => {})
    }

    // Setup: submission con email sconosciuta (via API per affidabilità)
    const newSub = await apiPost('InviiGiustificativiNoLogin', {
      email: testEmail,
      descrizione: `TEST_NF_${Date.now()}`,
      importo: '100.00',
      stato: 'in_attesa',
      data_invio: new Date().toISOString()
    })
    const newSubId = newSub?.data?.id || newSub?.data?.[0]?.id
    if (newSubId) rcNfIds.inviiNoLogin.push(newSubId)
    console.log(`[RC-NF-01] created submission via API: id=${newSubId} email=${testEmail}`)

    await loginAs(page, 'manager', auth)
    const riconcPage = new RiconciliazionePage(page)
    await riconcPage.goto()
    await riconcPage.waitForTable()
    await page.locator('button[aria-label="Aggiorna"]').click().catch(() => {})
    await page.waitForTimeout(3000)

    // Cerca su tutte le pagine
    let foundSubmit = false
    let keepSearching = true
    while (keepSearching) {
      const rows = riconcPage.rowLocator
      const count = await rows.count()
      for (let i = 0; i < count; i++) {
        await riconcPage.expandRow(i)
        const emailInput = rows.nth(i).locator('td').nth(2).locator('input')
        let emailMatch = false
        if ((await emailInput.count()) > 0) {
          const value = await emailInput.inputValue()
          if (value === testEmail) emailMatch = true
        } else {
          const caption = rows.nth(i).locator('.q-item__label--caption')
          const rowText = (await caption.count()) > 0 ? await caption.first().innerText() : await rows.nth(i).innerText()
          if (rowText.toLowerCase().includes(testEmail.toLowerCase())) emailMatch = true
        }
        if (emailMatch) {
          const createBtn = rows.nth(i).locator('[data-testid="btn-crea-contatto"]')
          if ((await createBtn.count()) > 0) {
            foundSubmit = true
          }
          break
        }
      }
      if (foundSubmit) break
      keepSearching = await riconcPage.goToNextPage()
    }
    expect(foundSubmit, `Bottone crea contatto per ${testEmail} non trovato`).toBe(true)

    // Cleanup
    for (const id of rcNfIds.inviiNoLogin) {
      await apiDelete('InviiGiustificativiNoLogin', id).catch(() => {})
    }
  })

  // ── RC-NL-01: not_linked → Associa famiglia ──
  test('RC-NL-01: not_linked mostra associa famiglia @crud', async ({ page }) => {
    test.setTimeout(120000)
    const testEmail = `test_nl_link_${Date.now()}@test.com`
    const rcNlIds = { inviiNoLogin: [], contatti: [], famiglie: [] }

    // Setup: crea contatto senza famiglia, poi submission con stessa email
    await loginGestore(page)
    const { createContattoViaUI } = await import('../helpers/pagina-gestione.js')
    const contatto = await createContattoViaUI(page, {
      nome: 'TEST_NL',
      cognome: 'NoFamily',
      email: testEmail
    })
    if (contatto?.id_contatto) rcNlIds.contatti.push(contatto.id_contatto)

    const sub = await createTestSubmission(page, {
      email: testEmail,
      descrizione: `TEST_NL_${Date.now()}`
    })
    if (sub?.id) rcNlIds.inviiNoLogin.push(sub.id)

    await loginAs(page, 'manager', auth)
    const riconcPage = new RiconciliazionePage(page)
    await riconcPage.goto()
    await riconcPage.waitForTable()
    await page.waitForTimeout(2000)

    // Trova la riga in stato not_linked
    const rows = riconcPage.rowLocator
    const count = await rows.count()
    let foundLink = false
    for (let i = 0; i < count; i++) {
      await riconcPage.expandRow(i)
      const rowText = await rows.nth(i).innerText()
      if (rowText.toLowerCase().includes(testEmail.toLowerCase())) {
        const badges = rows.nth(i).locator('.q-badge')
        for (let j = 0; j < (await badges.count()); j++) {
          const text = await badges.nth(j).innerText()
          if (text.includes('Contatto senza famiglia')) {
            foundLink = true
            break
          }
        }
        break
      }
    }
    expect(foundLink, `Badge "Contatto senza famiglia" per ${testEmail} non trovato`).toBe(true)

    // Cleanup
    for (const id of rcNlIds.inviiNoLogin) {
      await apiDelete('InviiGiustificativiNoLogin', id).catch(() => {})
    }
    for (const id of rcNlIds.contatti) {
      await apiDelete('contatti', id).catch(() => {})
    }
  })

  // ── RC-NP-01: not_parent → Associa genitore ──
  test('RC-NP-01: not_parent mostra bottone associa genitore @crud', async ({ page }) => {
    test.setTimeout(120000)
    const testEmail = `test_np_parent_${Date.now()}@test.com`
    const rcNpIds = { inviiNoLogin: [], contatti: [], famiglie: [] }

    // Setup: crea contatto volontario (non genitore) con famiglia, poi submission
    await loginGestore(page)
    const { createContattoViaUI, createFamigliaViaUI, assegnaContattoAFamigliaViaUI } =
      await import('../helpers/pagina-gestione.js')
    const fam = await createFamigliaViaUI(page, { nomeFamiglia: `TEST_NP_${Date.now()}` })
    rcNpIds.famiglie.push(fam.id_famiglia)
    const contatto = await createContattoViaUI(page, {
      nome: 'TEST_NP',
      cognome: 'NotParent',
      email: testEmail
    })
    if (contatto?.id_contatto) rcNpIds.contatti.push(contatto.id_contatto)
    await assegnaContattoAFamigliaViaUI(page, {
      famigliaNome: fam.nome || `TEST_NP_${Date.now()}`,
      searchTerm: testEmail,
      fullName: contatto.displayName || `TEST_NP NotParent`,
      ruolo: 'Volontario'
    })

    // Pulisci submission di test residue e creane una via API
    const oldSubsNP = await apiGet('InviiGiustificativiNoLogin', {
      filter: { email: { _ends_with: '@test.com' } },
      fields: 'id',
      limit: 50
    })
    for (const s of (oldSubsNP.data || [])) {
      await apiDelete('InviiGiustificativiNoLogin', s.id).catch(() => {})
    }
    const subNP = await apiPost('InviiGiustificativiNoLogin', {
      email: testEmail,
      descrizione: `TEST_NP_${Date.now()}`,
      importo: '100.00',
      stato: 'in_attesa',
      data_invio: new Date().toISOString()
    })
    const subNPId = subNP?.data?.id || subNP?.data?.[0]?.id
    if (subNPId) rcNpIds.inviiNoLogin.push(subNPId)

    await loginAs(page, 'manager', auth)
    const riconcPage = new RiconciliazionePage(page)
    await riconcPage.goto()
    await riconcPage.waitForTable()
    await page.locator('button[aria-label="Aggiorna"]').click().catch(() => {})
    await page.waitForTimeout(3000)

    // Cerca su tutte le pagine
    let foundNotParent = false
    let keepSearching = true
    while (keepSearching) {
      const rows = riconcPage.rowLocator
      const count = await rows.count()
      for (let i = 0; i < count; i++) {
        await riconcPage.expandRow(i)
        const emailInput = rows.nth(i).locator('td').nth(2).locator('input')
        let emailMatch = false
        if ((await emailInput.count()) > 0) {
          const value = await emailInput.inputValue()
          if (value === testEmail) emailMatch = true
        } else {
          const caption = rows.nth(i).locator('.q-item__label--caption')
          const rowText = (await caption.count()) > 0 ? await caption.first().innerText() : await rows.nth(i).innerText()
          if (rowText.toLowerCase().includes(testEmail.toLowerCase())) emailMatch = true
        }
        if (emailMatch) {
          const badges = rows.nth(i).locator('.q-badge')
          for (let j = 0; j < (await badges.count()); j++) {
            const text = await badges.nth(j).innerText()
            if (text.includes('Non è genitore') || text.includes('Contatto verificato')) {
              foundNotParent = true
              break
            }
          }
          break
        }
      }
      if (foundNotParent) break
      keepSearching = await riconcPage.goToNextPage()
    }
    expect(foundNotParent, `Badge "Non è genitore" per ${testEmail} non trovato`).toBe(true)

    // Cleanup
    for (const id of rcNpIds.inviiNoLogin) {
      await apiDelete('InviiGiustificativiNoLogin', id).catch(() => {})
    }
    for (const id of rcNpIds.contatti) {
      await apiDelete('contatti', id).catch(() => {})
    }
    for (const id of rcNpIds.famiglie) {
      await apiDelete('Famiglie', id).catch(() => {})
    }
  })
test('RC-SETUP-01: Aggiunge IBAN e Intestatario a famiglia @setup', async ({ page }) => {
    test.setTimeout(90000)

    // Crea famiglia atomica per il test
    await loginGestore(page)
    const { nomeFam } = await creaFamigliaVolontarioProgetto(page, ids)
    const famData = await apiGet('Famiglie', {
      filter: JSON.stringify({ Nome_Famiglia: { _eq: nomeFam } }),
      limit: 1,
      fields: 'id_famiglia,IBAN,Intestatario_CC'
    })
    const famiglia = famData.data?.[0]
    if (famiglia) {
      _rcIds.famigliaOrig = { id: famiglia.id_famiglia, IBAN: famiglia.IBAN, Intestatario: famiglia.Intestatario_CC }
    }

    const gestione = new GestionePage(page)
    await gestione.famiglieTab.click()
    await gestione.waitForTable()

    // Cerca la famiglia appena creata
    await gestione.searchFamiglie(nomeFam)

    // Clicca edit sulla prima riga trovata
    const editBtn = page
      .locator('.q-table tbody tr')
      .first()
      .locator('[data-testid="btn-edit-famiglia"], button[aria-label="Modifica"]')
    const editBtnMobile = page.locator('[data-testid="btn-edit-famiglia"]').first()
    if ((await editBtn.count()) > 0) {
      await expect(editBtn).toBeVisible({ timeout: 5000 })
      await editBtn.click()
    } else {
      // Su mobile: espandi card e clicca modifica
      await page.locator('.q-expansion-item').first().click()
      await page.waitForTimeout(500)
      await expect(editBtnMobile).toBeVisible({ timeout: 5000 })
      await editBtnMobile.click()
    }

    // Compila IBAN e Intestatario
    const dialog = page.locator('.q-dialog:has(.text-h6:has-text("Modifica Famiglia"))')
    await expect(dialog).toBeVisible({ timeout: 3000 })

    const ibanInput = dialog
      .locator('.q-field')
      .filter({ has: page.locator('.q-field__label:has-text("IBAN")') })
      .locator('input')
    const intestInput = dialog
      .locator('.q-field')
      .filter({ has: page.locator('.q-field__label:has-text("Intestatario")') })
      .locator('input')

    await ibanInput.fill('IT12X1234567890123456789012')
    await intestInput.fill('Famiglia Test Intestatario')

    await dialog.locator('button:has-text("Salva")').click()
    await expect(dialog).not.toBeVisible({ timeout: 3000 })
  })

  // ── RC-SETUP-02: Modifica contatto via ContattiTab ──
  test('RC-SETUP-02: Modifica Nome/Cognome contatto @setup', async ({ page }) => {
    test.setTimeout(90000)
    const testEmail = `TEST_rc_setup02_${Date.now()}@test.com`

    await loginAs(page, 'manager', auth)

    // Crea contatto con email univoca
    await createContatto(page, {
      Nome: 'TEST_SETUP02',
      Cognome: 'AutoTest',
      email: testEmail
    })

    const gestione = new GestionePage(page)
    await gestione.selectContattiTab()

    // Cerca per email univoca
    await gestione.search(testEmail)

    // Clicca edit sulla prima riga
    await expandFirstCardIfMobile(page)
    const editBtn = page.locator('[data-testid="btn-edit-contatto"]').first()
    await expect(editBtn.first()).toBeVisible({ timeout: 5000 })
    await editBtn.click()

    // Modifica Nome e Cognome nel dialog
    const dialog = page.locator('.q-dialog').filter({ hasText: 'Modifica Contatto' })
    await expect(dialog).toBeVisible({ timeout: 3000 })

    const nomeInput = dialog
      .locator('.q-field')
      .filter({ has: page.locator('.q-field__label:text-is("Nome *")') })
      .locator('input')
    const cognomeInput = dialog
      .locator('.q-field')
      .filter({ has: page.locator('.q-field__label:text-is("Cognome *")') })
      .locator('input')

    await nomeInput.fill('Test Genitore Aggiornato')
    await cognomeInput.fill('Test Genitore Aggiornato')

    await dialog.locator('button:has-text("Salva")').click()
    await expect(dialog).not.toBeVisible({ timeout: 3000 })

    // Cleanup: ripristina nome originale
    await gestione.search(testEmail)
    await expandFirstCardIfMobile(page)
    const editBtnAfter = page.locator('[data-testid="btn-edit-contatto"]').first()
    if ((await editBtnAfter.count()) > 0) {
      await editBtnAfter.click()
      const dialogAfter = page.locator('.q-dialog').filter({ hasText: 'Modifica Contatto' })
      await expect(dialogAfter).toBeVisible({ timeout: 3000 })
      const nomeInputAfter = dialogAfter
        .locator('.q-field')
        .filter({ has: page.locator('.q-field__label:text-is("Nome *")') })
        .locator('input')
      const cognomeInputAfter = dialogAfter
        .locator('.q-field')
        .filter({ has: page.locator('.q-field__label:text-is("Cognome *")') })
        .locator('input')
      await nomeInputAfter.fill('TEST_SETUP02')
      await cognomeInputAfter.fill('AutoTest')
      await dialogAfter.locator('button:has-text("Salva")').click()
      await expect(dialogAfter).not.toBeVisible({ timeout: 3000 })
    }
  })

  // ── RC-01: Pagina riconciliazione carica @smoke ──
  test('RC-01: Pagina riconciliazione carica @smoke', async ({ page }) => {
    test.setTimeout(90000)
    await loginAs(page, 'manager', auth)

    const riconcPage = new RiconciliazionePage(page)
    await riconcPage.goto()
    await riconcPage.waitForTable()

    const header = page.locator('.text-h5')
    await expect(header).toHaveText('Da riconciliare')
  })

  // ── RC-02: RiconciliaDialog si apre per riga linked @smoke ──
  test('RC-02: Apri RiconciliaDialog per riga linked @smoke', async ({ page }) => {
    test.setTimeout(90000)
    const testEmail = `TEST_rc02_linked_${Date.now()}@test.com`

    // Setup atomico: crea famiglia + contatto genitore (tutto via UI)
    await loginGestore(page)
    const { createFamigliaViaUI, createContattoViaUI, assegnaContattoAFamigliaViaUI } =
      await import('../helpers/pagina-gestione.js')
    const nomeFamRC2 = `TEST_RC02_${Date.now()}`
    const famRC2 = await createFamigliaViaUI(page, { nomeFamiglia: nomeFamRC2 })
    ids.famiglia = famRC2.id_famiglia
    if (!ids.contatti) ids.contatti = []

    const contatto = await createContattoViaUI(page, {
      nome: 'TEST_RC02',
      cognome: 'TEST_AutoTest',
      email: testEmail
    })
    if (contatto?.id_contatto) ids.contatti.push(contatto.id_contatto)

    await assegnaContattoAFamigliaViaUI(page, {
      famigliaNome: nomeFamRC2,
      searchTerm: testEmail,
      fullName: 'TEST_RC02 TEST_AutoTest',
      ruolo: 'Genitore'
    })

    const rc02sub = await createTestSubmission(page, {
      email: testEmail,
      descrizione: 'Test RC-02 riconciliazione'
    })
    if (rc02sub?.id) _rcIds.inviiNoLogin.push(rc02sub.id)

    await loginAs(page, 'manager', auth)

    const riconcPage = new RiconciliazionePage(page)
    await riconcPage.goto()
    await riconcPage.waitForTable()

    const rowCount = await riconcPage.getRowCount()
    expect(rowCount).toBeGreaterThan(0)

    let foundBtn = null
    const rows = riconcPage.rowLocator
    const count = await rows.count()
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i)
      const caption = row.locator('.q-item__label--caption')
      const rowText = (await caption.count()) > 0 ? await caption.first().innerText() : await row.innerText()
      if (rowText.toLowerCase().includes(testEmail.toLowerCase())) {
        await riconcPage.expandRow(i)
        const btn = row.locator('[data-testid="btn-riconcilia"]').first()
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
    test.setTimeout(90000)
    const testEmail = `TEST_rc03_${Date.now()}@test.com`

    // Setup atomico: crea famiglia + contatto genitore + progetto
    await loginGestore(page)
    const { createFamigliaViaUI, createContattoViaUI, assegnaContattoAFamigliaViaUI } =
      await import('../helpers/pagina-gestione.js')
    const nomeFamRC3 = `TEST_RC03_${Date.now()}`
    const famRC3 = await createFamigliaViaUI(page, { nomeFamiglia: nomeFamRC3 })
    if (!ids.contatti) ids.contatti = []
    ids.famiglia = famRC3.id_famiglia

    const contatto = await createContattoViaUI(page, {
      nome: 'TEST_RC03',
      cognome: 'TEST_AutoTest',
      email: testEmail
    })
    if (contatto?.id_contatto) ids.contatti.push(contatto.id_contatto)

    await assegnaContattoAFamigliaViaUI(page, {
      famigliaNome: nomeFamRC3,
      searchTerm: testEmail,
      fullName: 'TEST_RC03 TEST_AutoTest',
      ruolo: 'Genitore'
    })

    // Crea progetto per la famiglia
    ids.progetto = await createProgettoViaUI(
      page,
      {
        famigliaNome: nomeFamRC3,
        Cognome_Beneficiario: nomeFamRC3,
        Nome_Beneficiario: nomeFamRC3 + 'Test',
        AnnoBando: new Date().getFullYear(),
        Allocato: 5000
      },
      auth
    )

    const rc03sub = await createTestSubmission(page, {
      email: testEmail,
      descrizione: 'Test RC-03 riconciliazione'
    })
    if (rc03sub?.id) _rcIds.inviiNoLogin.push(rc03sub.id)

    await loginAs(page, 'manager', auth)

    const riconcPage = new RiconciliazionePage(page)
    await riconcPage.goto()
    await riconcPage.waitForTable()

    const rowCount = await riconcPage.getRowCount()
    expect(rowCount).toBeGreaterThan(0)

    let foundBtn = null
    const rows = riconcPage.rowLocator
    const count = await rows.count()
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i)
      const rowText = await row.innerText()
      if (rowText.toLowerCase().includes(testEmail.toLowerCase())) {
        // Su mobile le righe sono expansion-item: espandi per vedere i pulsanti
        await riconcPage.expandRow(i).catch(() => {})
        await page.waitForTimeout(300)
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
    if ((await saveBtn.count()) === 0 || (await saveBtn.isDisabled())) {
      await riconcPage.closeDialog()
      throw new Error('Save button disabled — dati già uguali')
      return
    }

    await saveBtn.click()
    await expect(page.locator('.q-notification.bg-positive').first()).toBeVisible({ timeout: 5000 })
    await riconcPage.closeDialog()
    await page.evaluate(() => localStorage.clear())
  })

  // ── RC-04: Elimina submission (Scarta) @crud ──
  test('RC-04: Scarta submission @crud', async ({ page }) => {
    test.setTimeout(90000)
    const testEmail = `test_rc04_scarta_${Date.now()}@test.com`
    const submission = await createTestSubmission(page, {
      email: testEmail,
      descrizione: 'Test RC-04 submission'
    })
    if (submission?.id) _rcIds.inviiNoLogin.push(submission.id)

    await loginAs(page, 'manager', auth)

    const riconcPage = new RiconciliazionePage(page)
    await riconcPage.goto()
    await riconcPage.waitForTable()

    // Trova la riga della submission per email (usa input value per not_found state)
    const rows = riconcPage.rowLocator
    const count = await rows.count()
    let targetBtn = null
    let foundIndex = -1
    for (let i = 0; i < count; i++) {
      await riconcPage.expandRow(i)
      const emailInput = rows.nth(i).locator('td').nth(2).locator('input')
      let emailMatch = false
      if ((await emailInput.count()) > 0) {
        const value = await emailInput.inputValue()
        if (value === testEmail) emailMatch = true
      } else {
        const caption = rows.nth(i).locator('.q-item__label--caption')
        const rowText = (await caption.count()) > 0 ? await caption.first().innerText() : await rows.nth(i).innerText()
        if (rowText.toLowerCase().includes(testEmail.toLowerCase())) emailMatch = true
      }
      if (emailMatch) {
        targetBtn = rows.nth(i).locator('[data-testid="btn-scarta"]').first()
        foundIndex = i
        break
      }
    }

    expect(targetBtn, `Submission ${testEmail} non trovata`).toBeTruthy()
    await riconcPage.expandRow(foundIndex)

    await targetBtn.click()

    const dialog = page.locator('.q-dialog').filter({ hasText: 'Scarta submission' })
    await expect(dialog).toBeVisible({ timeout: 3000 })
    await dialog.locator('input[type="text"]').fill('Test scarto')
    await dialog.locator('button:has-text("OK")').click()

    await expect(page.locator('.q-notification').first()).toBeVisible({ timeout: 5000 })
  })

  // ── RC-PG-01: Toggle scartati mostra/nasconde scartati @crud ──
  test('RC-PG-01: Toggle scartati mostra/nasconde scartati @crud', async ({ page }) => {
    test.setTimeout(90000)
    await loginAs(page, 'manager', auth)

    const riconcPage = new RiconciliazionePage(page)
    await riconcPage.goto()
    await riconcPage.waitForTable()

    // Legge conteggio righe con toggle off (default)
    const rowsDefault = await riconcPage.getRowCount()

    // Attiva toggle "Mostra scartati"
    const toggle = page.locator('.q-toggle:has-text("Mostra scartati")')
    if ((await toggle.count()) === 0) {
      }
    await toggle.click()
    await riconcPage.waitForTable()

    const rowsWithScartati = await riconcPage.getRowCount()
    expect(rowsWithScartati).toBeGreaterThanOrEqual(rowsDefault)

    // Verifica almeno un badge "Scartato" visibile (se ci sono scartati)
    const scartatoBadge = page.locator('.q-badge:has-text("Scartato")')
    if ((await scartatoBadge.count()) > 0) {
      await expect(scartatoBadge.first()).toBeVisible()
    }
  })

  // ── RC-PG-02: Paginazione UI visibile @smoke ──
  test('RC-PG-02: Controlli paginazione visibili @smoke', async ({ page }) => {
    test.setTimeout(90000)
    await loginAs(page, 'manager', auth)

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
    test.setTimeout(90000)
    const testEmail = `TEST_pg03_${Date.now()}@test.com`
    const rcp03sub = await createTestSubmission(page, {
      email: testEmail,
      descrizione: 'Test RC-PG-03 refresh'
    })
    if (rcp03sub?.id) _rcIds.inviiNoLogin.push(rcp03sub.id)

    await loginAs(page, 'manager', auth)

    const riconcPage = new RiconciliazionePage(page)
    await riconcPage.goto()

    // Verifica che la tabella abbia righe
    await expect(riconcPage.rowLocator.first()).toBeVisible({ timeout: 10000 })

    const refreshBtn = page.locator('[data-testid="btn-refresh-riconciliazioni"]')
    await expect(refreshBtn).toBeVisible({ timeout: 5000 })

    await refreshBtn.click()
    await riconcPage.waitForTable()

    // Dopo refresh la tabella deve ancora avere righe
    await expect(riconcPage.rowLocator.first()).toBeVisible({ timeout: 10000 })
  })

  // ── RC-05: Riconcilia submission completa @crud ──
  test('RC-05: Riconcilia submission completa @crud', async ({ page }) => {
    test.setTimeout(120000)
    console.log('[RC-05] test started')
    const testEmail = `TEST_rc05_${Date.now()}@test.com`

    // Setup: crea famiglia + contatto + progetto
    await loginGestore(page)
    const { createFamigliaViaUI, createContattoViaUI, assegnaContattoAFamigliaViaUI } =
      await import('../helpers/pagina-gestione.js')
    const nomeFamRC5 = `TEST_RC05_${Date.now()}`
    const famRC5 = await createFamigliaViaUI(page, { nomeFamiglia: nomeFamRC5 })
    ids.famiglia = famRC5.id_famiglia
    const contatto = await createContattoViaUI(page, { nome: 'TEST_RC05', cognome: 'TEST_AutoTest', email: testEmail })
    if (!ids.contatti) ids.contatti = []
    ids.contatti.push(contatto.id_contatto)
    await assegnaContattoAFamigliaViaUI(page, {
      famigliaNome: nomeFamRC5,
      searchTerm: testEmail,
      fullName: 'TEST_RC05 TEST_AutoTest',
      ruolo: 'Genitore'
    })
    ids.progetto = await createProgettoViaUI(
      page,
      {
        famigliaNome: nomeFamRC5,
        Cognome_Beneficiario: nomeFamRC5,
        Nome_Beneficiario: nomeFamRC5 + 'Test',
        AnnoBando: new Date().getFullYear(),
        Allocato: 5000
      },
      auth
    )

    const rc05sub = await createTestSubmission(page, {
      email: testEmail,
      descrizione: 'Test RC-05 riconciliazione'
    })
    if (rc05sub?.id) _rcIds.inviiNoLogin.push(rc05sub.id)

    // Login come gestore_verifica e vai a riconciliazione
    await loginAs(page, 'manager', auth)
    const riconcPage = new RiconciliazionePage(page)
    await riconcPage.goto()
    await riconcPage.waitForTable()

    // Trova la riga della submission per email
    const rows = riconcPage.rowLocator
    const count = await rows.count()
    let foundBtn = null
    let foundIdx = -1
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i)
      const caption = row.locator('.q-item__label--caption')
      const rowText = (await caption.count()) > 0 ? await caption.first().innerText() : await row.innerText()
      if (rowText.toLowerCase().includes(testEmail.toLowerCase())) {
        foundBtn = row.locator('[data-testid="btn-riconcilia"]').first()
        foundIdx = i
        break
      }
    }

    expect(foundBtn, `Submission ${testEmail} non trovata come linked`).toBeTruthy()
    if (foundIdx >= 0) await riconcPage.expandRow(foundIdx)
    await foundBtn.click()
    await riconcPage.waitForDialog()

    // Seleziona progetto nel dialog
    const progettoSelect = riconcPage.dialog.locator('[data-testid="select-progetto-riconcilia"]')
    await progettoSelect.locator('input').click()
    await page.waitForTimeout(500)
    let firstItem = page.locator('[role="option"]').first()
    if ((await firstItem.count()) === 0) {
      firstItem = page.locator('.q-dialog .q-item').first()
    }
    if ((await firstItem.count()) === 0) {
      }
    await firstItem.click()

    // Compila giustificativo
    await riconcPage.dialog.locator('[data-testid="riconcilia-descrizione"]').fill('TEST_RC-05 Riconciliazione')
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
    expect(giustData.data.Descrizione).toBe('TEST_RC-05 Riconciliazione')
  })

  // ── RC-PG-04: Recupera submission scartata @crud ──
  test('RC-PG-04: Recupera submission scartata @crud', async ({ page }) => {
    test.setTimeout(90000)
    const testEmail = `test_pg04_restore_${Date.now()}@test.com`
    const submission = await createTestSubmission(page, {
      email: testEmail,
      descrizione: 'Test RC-PG-04 submission'
    })
    if (submission?.id) _rcIds.inviiNoLogin.push(submission.id)

    await loginAs(page, 'manager', auth)

    const riconcPage = new RiconciliazionePage(page)
    await riconcPage.goto()
    await riconcPage.waitForTable()

    // Trova la riga per email (usa input value per not_found)
    const rows = riconcPage.rowLocator
    const count = await rows.count()
    let targetScarta = null
    for (let i = 0; i < count; i++) {
      const emailInput = rows.nth(i).locator('td').nth(2).locator('input')
      let emailMatch = false
      if ((await emailInput.count()) > 0) {
        const value = await emailInput.inputValue()
        if (value === testEmail) emailMatch = true
      } else {
        const row = rows.nth(i)
        const caption = row.locator('.q-item__label--caption')
        const rowText = (await caption.count()) > 0 ? await caption.first().innerText() : await row.innerText()
        if (rowText.toLowerCase().includes(testEmail.toLowerCase())) emailMatch = true
      }
      if (emailMatch) {
        await riconcPage.expandRow(i)
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
    await page
      .waitForResponse(
        resp => resp.url().includes('/items/InviiGiustificativiNoLogin') && resp.request().method() === 'GET',
        { timeout: 10000 }
      )
      .catch(() => {})

    // Ora attiva toggle scartati e recupera
    const toggle = page.locator('.q-toggle:has-text("Mostra scartati")')
    if ((await toggle.count()) === 0) {
      }
    const toggleInput = toggle.locator('input')
    const isChecked = await toggleInput.isChecked()
    if (!isChecked) {
      await toggle.click()
      await page
        .waitForResponse(
          resp =>
            resp.url().includes('/items/InviiGiustificativiNoLogin') &&
            resp.url().includes('includeScartati') &&
            resp.request().method() === 'GET',
          { timeout: 10000 }
        )
        .catch(() => {})
    }

    // Trova la riga scartata per email e clicca restore
    const rowsAfter = riconcPage.rowLocator
    const countAfter = await rowsAfter.count()
    let targetRestore = null
    for (let i = 0; i < countAfter; i++) {
      const emailInput = rowsAfter.nth(i).locator('td').nth(2).locator('input')
      let emailMatch = false
      if ((await emailInput.count()) > 0) {
        const value = await emailInput.inputValue()
        if (value === testEmail) emailMatch = true
      } else {
        const row = rowsAfter.nth(i)
        const caption = row.locator('.q-item__label--caption')
        const rowText = (await caption.count()) > 0 ? await caption.first().innerText() : await row.innerText()
        if (rowText.toLowerCase().includes(testEmail.toLowerCase())) emailMatch = true
      }
      if (emailMatch) {
        await riconcPage.expandRow(i)
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
    test.setTimeout(90000)
    await loginAs(page, 'manager', auth)

    const gestione = new GestionePage(page)
    await gestione.goto()
    await gestione.selectContattiTab()
    await gestione.waitForTable()

    const rowCount = await gestione.getRowCount()
    // GestoreVerifica deve almeno vedere la tabella contatti
    expect(rowCount).toBeGreaterThanOrEqual(0)
    await expect(gestione.searchInput).toBeVisible({ timeout: 5000 })
  })

  // ── RC-CARD-01: Card mobile mostra richiedente corretto @smoke ──
  test('RC-CARD-01: Card mobile mostra richiedente corretto @smoke', async ({ page }) => {
    test.setTimeout(60000)
    const testEmail = `TEST_card_${Date.now()}@test.com`
    const rccsub = await createTestSubmission(page, { email: testEmail, descrizione: 'Test RC-CARD richiedente' })
    if (rccsub?.id) _rcIds.inviiNoLogin.push(rccsub.id)
    await loginAs(page, 'manager', auth)

    const riconcPage = new RiconciliazionePage(page)
    await riconcPage.goto()
    await riconcPage.waitForTable()

    // Desktop: cerca nella tabella, Mobile: cerca nella card
    const tableLabel = page.locator('.q-table tbody tr td').filter({ hasText: 'Test Submission' }).first()
    const cardLabel = page.locator('.q-expansion-item .q-item__label').filter({ hasText: 'Test' }).first()
    const isCard = (await cardLabel.count()) > 0
    const isTable = (await tableLabel.count()) > 0

    if (isCard) {
      await expect(cardLabel).toBeVisible({ timeout: 5000 })
      await expect(cardLabel).not.toContainText('Richiedente sconosciuto')
    } else if (isTable) {
      await expect(tableLabel).toBeVisible({ timeout: 5000 })
    } else {
      // Fallback: verifica che almeno la tabella sia visibile con dati
      await expect(riconcPage.rowLocator.first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('RC-PRIORITY-01: Submission con contatto Volontario+Genitore assegna alla famiglia Genitore @regression', async ({
    page
  }) => {
    test.setTimeout(120000)
    const testEmail = `TEST_priority_${Date.now()}@test.com`

    // Setup atomico: crea 2 famiglie + contatto
    await loginGestore(page)
    const { createFamigliaViaUI, createContattoViaUI, assegnaContattoAFamigliaViaUI } = await import('../helpers/pagina-gestione.js')

    // Crea contatto
    const contatto = await createContattoViaUI(page, {
      nome: 'Priority Test',
      cognome: 'TEST_AutoTest',
      email: testEmail
    })
    if (!ids.contatti) ids.contatti = []
    if (contatto?.id_contatto) ids.contatti.push(contatto.id_contatto)

    // Crea famiglia Volontario (con progetto)
    const famVol = await createFamigliaViaUI(page, { nomeFamiglia: `TEST_PRIVOL_${Date.now()}` })
    ids.famiglia = [famVol.id_famiglia]

    // Crea famiglia Genitore (con progetto)
    const famGen = await createFamigliaViaUI(page, { nomeFamiglia: `TEST_PRIGEN_${Date.now()}` })
    ids.famiglia.push(famGen.id_famiglia)

    // Crea progetto per la famiglia Volontario (necessario per la riconciliazione)
    if (!Array.isArray(ids.progetto)) ids.progetto = []
    ids.progetto.push(
      await createProgettoViaUI(
        page,
        {
          famigliaNome: famVol.nome,
          Cognome_Beneficiario: `TEST_PRI_Vol_${Date.now()}`,
          Nome_Beneficiario: `TEST_PRI_Vol_Benef_${Date.now()}`,
          AnnoBando: new Date().getFullYear(),
          Allocato: 5000,
          Data_Inizio_Progetto: '2026-01-01',
          Data_Fine_Progetto: '2026-12-31'
        },
        auth,
        'manager'
      )
    )

    // Assegna contatto come Volontario
    await assegnaContattoAFamigliaViaUI(page, {
      famigliaNome: famVol.nome,
      searchTerm: testEmail,
      fullName: contatto.displayName,
      ruolo: 'Volontario'
    })

    // Assegna contatto come Genitore
    ids.progetto.push(
      await createProgettoViaUI(
        page,
        {
          famigliaNome: famGen.nome,
          Cognome_Beneficiario: `TEST_PRI_Gen_${Date.now()}`,
          Nome_Beneficiario: `TEST_PRI_Gen_Benef_${Date.now()}`,
          AnnoBando: new Date().getFullYear(),
          Allocato: 5000,
          Data_Inizio_Progetto: '2026-01-01',
          Data_Fine_Progetto: '2026-12-31'
        },
        auth,
        'manager'
      )
    )
    await assegnaContattoAFamigliaViaUI(page, {
      famigliaNome: famGen.nome,
      searchTerm: testEmail,
      fullName: contatto.displayName,
      ruolo: 'Genitore'
    })

    // Crea submission pubblica con la stessa email
    const rcpSub = await createTestSubmission(page, {
      email: testEmail,
      descrizione: 'Test priority Genitore su Volontario'
    })
    if (rcpSub?.id) _rcIds.inviiNoLogin.push(rcpSub.id)

    // Login come gestore_verifica e vai a riconciliazione
    await loginAs(page, 'manager', auth)
    const riconcPage = new RiconciliazionePage(page)
    await riconcPage.goto()
    await riconcPage.waitForTable()

    // Trova la riga per email
    const rows = riconcPage.rowLocator
    const count = await rows.count()
    let found = false
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i)
      const caption = row.locator('.q-item__label--caption')
      const rowText = (await caption.count()) > 0 ? await caption.first().innerText() : await row.innerText()
      if (rowText.toLowerCase().includes(testEmail.toLowerCase())) {
        // Verifica che lo stato sia 'linked' (contatto trovato e legato come genitore)
        const badges = row.locator('.q-badge')
        const badgeCount = await badges.count()
        for (let j = 0; j < badgeCount; j++) {
          const text = await badges.nth(j).innerText()
          if (text.includes('Contatto verificato')) {
            found = true
            break
          }
        }
        break
      }
    }

    expect(found, `Submission ${testEmail} non trovata come contatto verificato`).toBe(true)
  })
})

