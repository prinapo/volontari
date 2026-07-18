/**
 * UI helpers per GestionePage — creazione dati via browser.
 * Ogni funzione opera sulla pagina corrente con attese dirette su elementi DOM,
 * evitando waitForFunction che può time out su pagine cached.
 */
import { GestionePage } from '../pages/GestionePage.js'

async function waitForContattiTable(page) {
  await page
    .locator('.q-table tbody tr, .q-expansion-item')
    .first()
    .waitFor({ state: 'visible', timeout: 15000 })
    .catch(() => {})
}

async function waitForFamiglieTable(page) {
  await page
    .locator('.q-table tbody tr, .q-expansion-item')
    .first()
    .waitFor({ state: 'visible', timeout: 15000 })
    .catch(() => {})
}

/**
 * Crea una famiglia via UI (dialog FamigliaDialog).
 * Richiede di essere su /gestione (o login come gestore).
 */
export async function createFamigliaViaUI(page, { nomeFamiglia, iban, intestatario } = {}) {
  if (!nomeFamiglia) throw new Error('createFamigliaViaUI: nomeFamiglia obbligatorio')

  if (!page.url().includes('/gestione')) {
    const gp = new GestionePage(page)
    await gp.goto()
  }

  // Seleziona tab Famiglie
  const famiglieTab = page.locator('.q-tab:has-text("Famiglie")')
  await famiglieTab.waitFor({ state: 'visible', timeout: 10000 })
  await famiglieTab.click()
  await page.waitForLoadState("networkidle").catch(() => {})

  // Clicca "Aggiungi Famiglia"
  const aggiungiBtn = page.locator('button:has-text("Aggiungi Famiglia")')
  await aggiungiBtn.waitFor({ state: 'visible', timeout: 10000 })
  await aggiungiBtn.click()

  // Aspetta il dialog
  const dialog = page.locator('.q-dialog:visible')
  await dialog.waitFor({ state: 'visible', timeout: 5000 })

  // Compila tutti i campi
  await dialog.locator('[data-testid="famiglia-nome"]').fill(nomeFamiglia)
  // IBAN IT valido: 27 caratteri
  const ts = String(Date.now()).slice(-5)
  const rnd = String(Math.floor(Math.random() * 90000) + 10000)
  const testIban = iban || `IT60X${ts}${rnd}0000123456`
  await dialog.locator('[data-testid="famiglia-iban"]').fill(testIban)
  await dialog.locator('[data-testid="famiglia-intestatario"]').fill(intestatario || nomeFamiglia.slice(0, 20) + ' Int')

  // Submit e attendi POST /items/Famiglie
  // Filtra per Nome_Famiglia per evitare di catturare POST di altri test
  const [postResp] = await Promise.all([
    page.waitForResponse(resp => {
      if (!resp.url().includes('/items/Famiglie') || resp.request().method() !== 'POST') return false
      try {
        const body = JSON.parse(resp.request().postData() || '{}')
        return body.Nome_Famiglia === nomeFamiglia
      } catch {
        return true
      }
    }),
    dialog.locator('button:has-text("Salva")').click()
  ])

  const data = await postResp.json()
  const id_famiglia = data?.data?.id_famiglia

  await dialog.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
  if (!id_famiglia) {
    console.error(`[createFamigliaViaUI] WARNING: id_famiglia non trovato per "${nomeFamiglia}"`)
  }
  return { id_famiglia, nome: nomeFamiglia }
}

/**
 * Crea un contatto via UI (dialog ContattoDialog).
 */
export async function createContattoViaUI(page, { nome, cognome, email, cellulare, telefono } = {}) {
  if (!nome || !cognome) throw new Error('createContattoViaUI: nome e cognome obbligatori')

  if (!page.url().includes('/gestione')) {
    const gp = new GestionePage(page)
    await gp.goto()
  }

  // Seleziona tab Contatti
  const contattiTab = page.locator('.q-tab:has-text("Contatti")')
  await contattiTab.waitFor({ state: 'visible', timeout: 10000 })
  await contattiTab.click()
  await page.waitForLoadState("networkidle").catch(() => {})
  await waitForContattiTable(page)

  // Clicca "Aggiungi Contatto"
  const aggiungiBtn = page.locator('[data-testid="btn-aggiungi-contatto"]')
  await aggiungiBtn.waitFor({ state: 'visible', timeout: 10000 })
  await aggiungiBtn.click()

  // Aspetta il dialog
  const dialog = page.locator('.q-dialog:visible')
  await dialog.waitFor({ state: 'visible', timeout: 5000 })

  // Compila tutti i campi
  await dialog.locator('[data-testid="contatto-nome"]').fill(nome)
  await dialog.locator('[data-testid="contatto-cognome"]').fill(cognome)
  const cell = cellulare || `333${Math.floor(Math.random() * 9000000) + 1000000}`
  await dialog.locator('[data-testid="contatto-cellulare"]').fill(cell)
  const telo = telefono || `02${Math.floor(Math.random() * 90000000) + 10000000}`
  await dialog.locator('[data-testid="contatto-telefono"]').fill(telo)

  // Aggiungi email se fornita
  if (email) {
    const addEmailBtn = dialog.locator('button:has-text("Aggiungi email")')
    if (await addEmailBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addEmailBtn.click()
      await page.waitForLoadState("networkidle").catch(() => {})
      await dialog.locator('[data-testid="contatto-email-0"]').fill(email)
    }
  }

  // Submit e attendi POST /items/contatti
  const [postResp] = await Promise.all([
    page.waitForResponse(resp => resp.url().includes('/items/contatti') && resp.request().method() === 'POST'),
    dialog.locator('button:has-text("Salva")').click()
  ])

  const data = await postResp.json()
  const id_contatto = data?.data?.id_contatto

  await dialog.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
  return {
    id_contatto,
    nome,
    cognome,
    displayName: `${nome} ${cognome}`
  }
}

/**
 * Assegna un contatto a una famiglia con un ruolo specifico.
 * Usa il ContattiDialog dal tab Famiglie (cerca il contatto per email prefix o nome).
 */
export async function assegnaContattoAFamigliaViaUI(
  page,
  { famigliaNome, searchTerm, fullName, ruolo = 'Volontario' } = {}
) {
  if (!searchTerm || !famigliaNome)
    throw new Error('assegnaContattoAFamigliaViaUI: searchTerm e famigliaNome obbligatori')
  if (!fullName) fullName = searchTerm

  const gp = new GestionePage(page)

  if (!page.url().includes('/gestione')) {
    await gp.goto()
  }

  // Usa gp.clickContactsOnFamiglia che gestisce sia desktop che mobile
  const famiglieTab = page.locator('.q-tab:has-text("Famiglie")')
  await famiglieTab.waitFor({ state: 'visible', timeout: 10000 })
  await famiglieTab.click()
  await page.waitForLoadState("networkidle").catch(() => {})

  await gp.famiglieSearch.fill(famigliaNome)
  await page.waitForLoadState("networkidle").catch(() => {})

  const found = await gp.clickContactsOnFamiglia(famigliaNome)
  if (!found) {
    throw new Error(`Famiglia "${famigliaNome}" non trovata per assegnazione contatto`)
  }

  // Assegna contatto tramite ContattiDialog
  if (ruolo === 'Volontario') {
    await gp.assignVolontario(searchTerm, fullName)
  } else {
    await gp.assignGenitore(searchTerm)
  }

  // Chiude il dialog
  await gp.contattiDialog.locator('button:has-text("Chiudi")').click()
  await gp.contattiDialog.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
  await page.waitForLoadState("networkidle").catch(() => {})
}

/**
 * Rimuove un contatto da una famiglia via UI.
 */
export async function rimuoviContattoDaFamigliaViaUI(page, { famigliaNome, fullName } = {}) {
  if (!famigliaNome || !fullName) throw new Error('rimuoviContattoDaFamigliaViaUI: famigliaNome e fullName obbligatori')

  const gp = new GestionePage(page)

  if (!page.url().includes('/gestione')) {
    await gp.goto()
  }

  // Cerca la famiglia nel tab Famiglie e clicca contacts
  const famiglieTab = page.locator('.q-tab:has-text("Famiglie")')
  await famiglieTab.waitFor({ state: 'visible', timeout: 10000 })
  await famiglieTab.click()
  await page.waitForLoadState("networkidle").catch(() => {})

  await gp.famiglieSearch.fill(famigliaNome)
  await page.waitForLoadState("networkidle").catch(() => {})
  const famTable = page.locator('.q-table')
  const famRow = famTable.locator('td').filter({ hasText: famigliaNome }).first()
  await famRow.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {})
  const contactsBtn = famRow.locator('..').locator('[aria-label="Gestisci contatti"]')
  await contactsBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
  if (!((await contactsBtn.count()) > 0)) {
    throw new Error(`Famiglia "${famigliaNome}" non trovata per rimozione contatto`)
  }
  await contactsBtn.click()
  await gp.contattiDialog.waitFor({ state: 'visible', timeout: 5000 })

  // Rimuovi il contatto dalla lista nel dialog
  await gp.removeFromFamiglia(fullName)
  await gp.contattiDialog.locator('button:has-text("Chiudi")').click()
  await gp.contattiDialog.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
  await page.waitForLoadState("networkidle").catch(() => {})
}

/**
 * Helper: clicca l'icona groups sulla riga/tabella del contatto.
 * Supporta sia desktop che mobile.
 */
async function clickGroupsOnContatto(page, displayName) {
  // Desktop: cerca nelle righe tabella (prima colonna = nome cognome)
  const tableRows = page.locator('.q-table tbody tr')
  const tableCount = await tableRows.count()
  if (tableCount > 0) {
    for (let i = 0; i < tableCount; i++) {
      const cellText = await tableRows
        .nth(i)
        .locator('td')
        .first()
        .innerText()
        .catch(() => '')
      if (cellText.trim() === displayName) {
        const groupsBtn = tableRows.nth(i).locator('[aria-label="Assegna famiglia"]')
        if ((await groupsBtn.count()) > 0) {
          await groupsBtn.click()
          return true
        }
      }
    }
  }

  // Mobile: cerca nelle expansion cards
  const expItems = page.locator('.q-expansion-item')
  const expCount = await expItems.count()
  for (let i = 0; i < expCount; i++) {
    const label = await expItems
      .nth(i)
      .locator('.q-item__label')
      .first()
      .innerText()
      .catch(() => '')
    if (label.includes(displayName)) {
      // Espandi se non già espanso
      if ((await expItems.nth(i).locator('.q-expansion-item--expanded').count()) === 0) {
        await expItems.nth(i).click()
        await page.waitForLoadState("networkidle").catch(() => {})
      }
      const groupsBtn = expItems.nth(i).locator('[aria-label="Assegna famiglia"]')
      if ((await groupsBtn.count()) > 0) {
        await groupsBtn.click()
        return true
      }
    }
  }

  return false
}
