/**
 * Helper per il test di sistema (@system): azioni di business pilotate dalla UI
 * (per esercitare use case e macchine a stati) + assert finale via API sul DB.
 *
 * Confine: le AZIONI passano dalla UI; seed/assert/cleanup passano dall'API.
 */
import { expect } from '@playwright/test'
import { createProgettoViaUI } from '../pages/CreaProgettoPage.js'
import { RiconciliazionePage } from '../pages/RiconciliazionePage.js'
import { VerificaPage } from '../pages/VerificaPage.js'
import { apiGet } from './api.js'
import { createGiustificativoViaDialog } from './giustificativo.js'
import { loginAs } from './login.js'
import { loginConFamigliaViaUI } from './pagina-famiglie.js'
import { createFamigliaViaUI, assegnaContattoAFamigliaViaUI } from './pagina-gestione.js'

// ---------------------------------------------------------------- letture/assert

export async function readProgetto(progettoId) {
  const res = await apiGet('Progetti/' + progettoId, {
    fields: [
      'id_progetto',
      'Allocato',
      'StatoProgetto',
      'StatoRendicontazione',
      'TipoChiusura',
      'MotivoChiusura',
      'DataChiusura',
      'TotaleGiustificativi',
      'TotaleImporto',
      'TotaleVerificato',
      'TotaleProposto',
      'TotaleInPagamento',
      'TotalePagato',
      'ResiduoAllocato'
    ].join(',')
  })
  return res.data
}

/**
Poll finché il progetto soddisfa `atteso` (objectContaining) o scade il timeout.
*/
export async function assertProgetto(progettoId, atteso, { timeoutMs = 20_000 } = {}) {
  const start = Date.now()
  let ultimo = null
  const soddisfa = o =>
    Object.entries(atteso).every(([k, v]) => {
      const got = o?.[k]
      if (typeof v === 'number') return Math.abs(Number(got) - v) <= 0.01
      return got === v
    })
  while (Date.now() - start < timeoutMs) {
    ultimo = await readProgetto(progettoId)
    if (soddisfa(ultimo)) return ultimo
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  expect(ultimo, `stato finale progetto ${progettoId}`).toMatchObject(atteso)
  return ultimo
}

/**
Poll finché esiste un pagamento del progetto in un certo stato.
*/
export async function assertPagamentoStato(progettoId, stato, { timeoutMs = 20_000 } = {}) {
  const start = Date.now()
  let lista = []
  while (Date.now() - start < timeoutMs) {
    lista = await readPagamentiProgetto(progettoId)
    if (lista.some(p => p.Stato === stato)) return lista
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  expect(
    lista.map(p => p.Stato),
    `pagamenti progetto ${progettoId}`
  ).toContain(stato)
  return lista
}

/**
Gli aggregati persistiti del progetto combaciano con i suoi giustificativi.
*/
export async function assertAggregatiCoerenti(progettoId) {
  const prog = await readProgetto(progettoId)
  const giust = await readGiustificativi(progettoId)
  const validi = giust.filter(g => !g.Invalidato)
  const importo = validi.reduce((s, g) => s + (Number.parseFloat(g.Importo) || 0), 0)
  expect(Number(prog.TotaleGiustificativi), `TotaleGiustificativi progetto ${progettoId}`).toBe(validi.length)
  expect(Number(prog.TotaleImporto), `TotaleImporto progetto ${progettoId}`).toBeCloseTo(importo, 2)
}

export async function readGiustificativi(progettoId) {
  const res = await apiGet('Giustificativi', {
    filter: JSON.stringify({ Progetto: { _eq: progettoId } }),
    fields: 'id,Descrizione,Importo,Stato,Invalidato,Pagamento',
    limit: -1
  })
  return res.data || []
}

export async function assertGiustificativoByDesc(progettoId, descrizione, atteso, { timeoutMs = 20_000 } = {}) {
  const start = Date.now()
  let trovato = null
  while (Date.now() - start < timeoutMs) {
    const lista = await readGiustificativi(progettoId)
    trovato = lista.find(g => g.Descrizione === descrizione)
    if (trovato && Object.entries(atteso).every(([k, v]) => trovato[k] === v)) return trovato
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  expect(trovato, `giustificativo "${descrizione}"`).toMatchObject(atteso)
  return trovato
}

export async function readPagamentiProgetto(progettoId) {
  const res = await apiGet('Pagamenti', {
    filter: JSON.stringify({ Progetto: { _eq: progettoId } }),
    fields: 'id,Stato,Importo,Batch',
    limit: -1
  })
  return res.data || []
}

// ---------------------------------------------------------------- seed

/**
 * Crea `n` famiglie (gestore), assegna 1 volontario a tutte e crea 1 progetto
 * per famiglia. Ritorna l'elenco con nomi/id e riempie `ids` per il cleanup.
 */
export async function setupFamiglie(page, { auth, n, allocato = 1000, ids }) {
  const ts = Date.now()
  const prefix = `TEST_SYS_${ts}`
  ids.prefix = prefix
  ids.famiglia = []
  ids.progetto = []
  ids.contattiModificati = ids.contattiModificati || []

  const volontarioEmail = auth.volontario.email
  const emailRes = await apiGet('email', {
    filter: JSON.stringify({ email_address: { _eq: volontarioEmail } }),
    fields: 'Contatto_Relation'
  })
  const contattoId = emailRes.data?.[0]?.Contatto_Relation
  const pre = await apiGet('contatti/' + contattoId, { fields: 'IsVolontario,user_id' })
  ids.contattiModificati.push({
    id: contattoId,
    preState: { IsVolontario: pre.data?.IsVolontario, user_id: pre.data?.user_id }
  })

  await loginAs(page, 'manager', auth)

  const famiglie = []
  for (let i = 1; i <= n; i++) {
    const nomeFam = `${prefix}_F${i}`
    const fam = await createFamigliaViaUI(page, { nomeFamiglia: nomeFam })
    ids.famiglia.push(fam.id_famiglia)

    await assegnaContattoAFamigliaViaUI(page, {
      famigliaNome: nomeFam,
      searchTerm: volontarioEmail,
      fullName: volontarioEmail,
      ruolo: 'Volontario'
    })

    const progettoId = await createProgettoViaUI(
      page,
      {
        famigliaNome: nomeFam,
        Cognome_Beneficiario: `${prefix}F${i}`,
        Nome_Beneficiario: 'Test',
        AnnoBando: new Date().getFullYear(),
        Allocato: allocato
      },
      auth,
      'manager'
    )
    ids.progetto.push(progettoId)
    famiglie.push({ nomeFam, famigliaId: fam.id_famiglia, progettoId })
  }
  return famiglie
}

// ---------------------------------------------------------------- azioni volontario

export async function volontarioCreaBozza(page, { auth, nomeFam, descrizione, importo }) {
  await loginConFamigliaViaUI(page, { role: 'volontario', auth, nomeFamiglia: nomeFam })
  await page
    .locator('.bg-green-1')
    .first()
    .waitFor({ state: 'visible', timeout: 15_000 })
    .catch(() => {})
  await page.waitForLoadState('networkidle').catch(() => {})
  return createGiustificativoViaDialog(page, { descrizione, importo })
}

/**
Invia una bozza esistente (dalla card del volontario).
*/
export async function volontarioInviaBozza(page, giustId) {
  const card = page.locator(`[data-testid="giustificativo-card-${giustId}"]`)
  await card.waitFor({ state: 'visible', timeout: 10_000 })
  const btn = card.locator('button:has-text("Invia")').first()
  await expect(btn).toBeVisible({ timeout: 8000 })
  const [patch] = await Promise.all([
    page
      .waitForResponse(r => r.url().includes(`/items/Giustificativi/${giustId}`) && r.request().method() === 'PATCH', {
        timeout: 15_000
      })
      .catch(() => null),
    btn.evaluate(el => el.click())
  ])
  await page.waitForLoadState('networkidle').catch(() => {})
  return patch
}

/**
Invalida (elimina) una bozza esistente.
*/
export async function volontarioInvalidaBozza(page, giustId) {
  const card = page.locator(`[data-testid="giustificativo-card-${giustId}"]`)
  await card.waitFor({ state: 'visible', timeout: 10_000 })
  await card.locator('button:has-text("Elimina")').first().click()
  const dialog = page.locator('.q-dialog:visible').last()
  await dialog.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
  const [patch] = await Promise.all([
    page
      .waitForResponse(r => r.url().includes(`/items/Giustificativi/${giustId}`) && r.request().method() === 'PATCH', {
        timeout: 15_000
      })
      .catch(() => null),
    dialog
      .locator('button:has-text("Elimina")')
      .last()
      .evaluate(el => el.click())
  ])
  await page.waitForLoadState('networkidle').catch(() => {})
  return patch
}

// ---------------------------------------------------------------- azioni manager

async function apriVerificaFamiglia(page, { auth, nomeFam }) {
  await loginAs(page, 'manager', auth)
  const vp = new VerificaPage(page)
  await vp.goto()
  await vp.waitForTable()
  await vp.searchFamiglia(nomeFam)
  await vp.expandRow(0)
  await page.waitForLoadState('networkidle').catch(() => {})
  return vp
}

export async function managerVerifica(page, { auth, nomeFam }) {
  await apriVerificaFamiglia(page, { auth, nomeFam })
  await page
    .locator('[data-testid="btn-verify"]')
    .first()
    .evaluate(el => el.click())
  await page.waitForLoadState('networkidle').catch(() => {})
}

export async function managerRifiuta(page, { auth, nomeFam, nota }) {
  await apriVerificaFamiglia(page, { auth, nomeFam })
  await page
    .locator('[data-testid="btn-reject"]')
    .first()
    .evaluate(el => el.click())
  const dialog = page.locator('.q-dialog:visible').last()
  await dialog.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
  const textarea = dialog.locator('textarea').first()
  if (await textarea.count()) await textarea.fill(nota, { force: true })
  const ok = dialog
    .locator('button')
    .filter({ hasText: /rifiut|conferma/i })
    .last()
  await ok.evaluate(el => el.click())
  await page.waitForLoadState('networkidle').catch(() => {})
}

export async function managerRipristinaInviato(page, { auth, nomeFam }) {
  await apriVerificaFamiglia(page, { auth, nomeFam })
  await page
    .locator('[aria-label="Ripristina"]')
    .first()
    .evaluate(el => el.click())
  const dialog = page.locator('.q-dialog:visible').last()
  if (await dialog.isVisible({ timeout: 3000 }).catch(() => false)) {
    await dialog
      .locator('button')
      .filter({ hasText: /ripristina/i })
      .last()
      .evaluate(el => el.click())
  }
  await page.waitForLoadState('networkidle').catch(() => {})
}

export async function managerRicalcola(page, { auth }) {
  await loginAs(page, 'manager', auth)
  await page.goto('/pagamenti')
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.locator('button:has-text("RICALCOLA")').click()
  await page.waitForLoadState('networkidle').catch(() => {})
}

export async function managerCreaBatch(page, { auth, nomeFam, associazione, progettoId }) {
  await loginAs(page, 'manager', auth)
  await page.goto('/pagamenti')
  await page.waitForLoadState('networkidle').catch(() => {})

  const search = page.locator('input[placeholder="Cerca famiglia, IBAN..."]')
  if (await search.isVisible({ timeout: 5000 }).catch(() => false)) {
    await search.fill(nomeFam)
    await page.waitForLoadState('networkidle').catch(() => {})
  }
  const row = page.locator('.q-table tbody tr, .q-table__grid-content .q-card').filter({ hasText: nomeFam }).first()
  await expect(row).toBeVisible({ timeout: 15_000 })

  const assocSelect = page.locator('.q-select:has(.q-field__label:has-text("Associazione"))').first()
  await assocSelect.click()
  await page.getByRole('option', { name: associazione }).first().click()
  await page.waitForLoadState('networkidle').catch(() => {})

  await row.locator('.q-checkbox').first().click()
  await page.locator('button:has-text("Crea gruppo di pagamento")').first().click()
  const dialog = page.locator('.q-dialog:has-text("Crea gruppo di pagamento")')
  await expect(dialog).toBeVisible({ timeout: 5000 })
  await dialog
    .locator('input')
    .first()
    .fill('GRUPPO_SYS_' + Date.now())
  await dialog.locator('button:has-text("Conferma")').click()
  await page.waitForLoadState('networkidle').catch(() => {})

  if (progettoId) {
    const start = Date.now()
    let stati = []
    while (Date.now() - start < 20_000) {
      stati = (await readPagamentiProgetto(progettoId)).map(p => p.Stato)
      if (stati.includes('in_pagamento')) return
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    throw new Error(
      `creaBatch non ha portato in_pagamento (progetto ${progettoId}); stati: ${stati.join(',') || 'nessuno'}`
    )
  }
}

export async function managerSegnaPagato(page, { auth, nomeFam }) {
  await loginAs(page, 'manager', auth)
  await page.goto('/pagamenti')
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.locator('.q-tab:has-text("Da riscontrare")').click()
  await page.waitForLoadState('networkidle').catch(() => {})
  const search = page.locator('input[placeholder*="Cerca famiglia"]')
  if (await search.isVisible({ timeout: 5000 }).catch(() => false)) {
    await search.fill(nomeFam)
    await page.waitForLoadState('networkidle').catch(() => {})
  }
  const row = page.locator('.q-table tbody tr, .q-table__grid-content .q-card').filter({ hasText: nomeFam }).first()
  await expect(row).toBeVisible({ timeout: 15_000 })
  await row.locator('button[aria-label="Segna pagato"]').first().click()
  await page.waitForLoadState('networkidle').catch(() => {})
}

export async function managerSegnaFallito(page, { auth, nomeFam, nota }) {
  await loginAs(page, 'manager', auth)
  await page.goto('/pagamenti')
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.locator('.q-tab:has-text("Da riscontrare")').click()
  await page.waitForLoadState('networkidle').catch(() => {})
  const search = page.locator('input[placeholder*="Cerca famiglia"]')
  if (await search.isVisible({ timeout: 5000 }).catch(() => false)) {
    await search.fill(nomeFam)
    await page.waitForLoadState('networkidle').catch(() => {})
  }
  const row = page.locator('.q-table tbody tr, .q-table__grid-content .q-card').filter({ hasText: nomeFam }).first()
  await expect(row).toBeVisible({ timeout: 15_000 })
  await row.locator('button[aria-label="Segna fallito"]').first().click()
  const dialog = page.locator('.q-dialog:visible').last()
  await dialog.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
  await dialog
    .locator('input, textarea')
    .first()
    .fill(nota, { force: true })
    .catch(() => {})
  await dialog
    .locator('button')
    .filter({ hasText: /conferma/i })
    .last()
    .evaluate(el => el.click())
  await page.waitForLoadState('networkidle').catch(() => {})
}

/**
Tab Falliti: seleziona la riga della famiglia e "Ripristina a Bonifici".
*/
export async function managerRipristinaBonifici(page, { auth, nomeFam }) {
  await loginAs(page, 'manager', auth)
  await page.goto('/pagamenti')
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.locator('.q-tab:has-text("Falliti")').click()
  await page.waitForLoadState('networkidle').catch(() => {})
  const search = page.locator('input[placeholder*="Cerca famiglia"]')
  if (await search.isVisible({ timeout: 5000 }).catch(() => false)) {
    await search.fill(nomeFam)
    await page.waitForLoadState('networkidle').catch(() => {})
  }
  const row = page.locator('.q-table tbody tr, .q-table__grid-content .q-card').filter({ hasText: nomeFam }).first()
  await expect(row).toBeVisible({ timeout: 15_000 })
  const btn = page.locator('button:has-text("Ripristina a Bonifici")').first()
  const checkbox = row.locator('.q-checkbox').first()
  await checkbox.evaluate(el => el.click())
  if (!(await btn.isVisible({ timeout: 3000 }).catch(() => false))) {
    await checkbox
      .locator('input')
      .first()
      .evaluate(el => el.click())
      .catch(() => {})
  }
  await expect(btn).toBeVisible({ timeout: 8000 })
  await btn.evaluate(el => el.click())
  await page.waitForLoadState('networkidle').catch(() => {})
}

export async function managerChiudiProgetto(page, { auth, nomeFam, tipo, motivo }) {
  await apriVerificaFamiglia(page, { auth, nomeFam })
  await page
    .locator('[aria-label="Chiudi progetto"]')
    .first()
    .evaluate(el => el.click())
  const dialog = page.locator('.q-dialog:has-text("Chiudi progetto")')
  await expect(dialog).toBeVisible({ timeout: 5000 })
  if (tipo) {
    await dialog.locator('.q-select').first().click()
    await page.getByRole('option', { name: tipo }).first().click()
  }
  if (motivo) {
    await dialog
      .locator('textarea')
      .first()
      .fill(motivo)
      .catch(() => {})
  }
  await dialog.locator('button:has-text("Chiudi progetto")').last().click()
  await page.waitForLoadState('networkidle').catch(() => {})
}

export async function managerRiapriProgetto(page, { auth, nomeFam, conferma = false }) {
  await apriVerificaFamiglia(page, { auth, nomeFam })
  await page
    .locator('[aria-label="Riapri progetto"]')
    .first()
    .evaluate(el => el.click())
  const dialog = page.locator('.q-dialog:has-text("Conferma riapertura")')
  if (await dialog.isVisible({ timeout: 3000 }).catch(() => false)) {
    if (conferma) {
      await dialog
        .locator('button:has-text("Riapri")')
        .last()
        .evaluate(el => el.click())
    } else {
      await dialog
        .locator('button:has-text("Annulla")')
        .last()
        .evaluate(el => el.click())
    }
  }
  await page.waitForLoadState('networkidle').catch(() => {})
}

/**
Riconciliazione della submission più recente con l'email data.
*/
export async function managerRiconcilia(page, { auth, email, importo = '100.00' }) {
  await loginAs(page, 'manager', auth)
  const rp = new RiconciliazionePage(page)
  await rp.goto()
  await rp.waitForTable()
  await page
    .locator('button[aria-label="Aggiorna"]')
    .click()
    .catch(() => {})
  await page.waitForLoadState('networkidle').catch(() => {})

  const rows = rp.rowLocator
  const count = await rows.count()
  for (let i = 0; i < count; i++) {
    if ((await rows.nth(i).innerText()).toLowerCase().includes(email.toLowerCase())) {
      await rp.expandRow(i).catch(() => {})
      await page.waitForLoadState('networkidle').catch(() => {})
      const btn = rows.nth(i).locator('[data-testid="btn-riconcilia"]').first()
      if ((await btn.count()) > 0) {
        await btn.click()
        break
      }
    }
  }
  await rp.waitForDialog()
  await page.waitForLoadState('networkidle').catch(() => {})
  const riconciliaBtn = rp.dialog.locator('button:has-text("Riconcilia")')
  if ((await riconciliaBtn.count()) > 0 && !(await riconciliaBtn.isDisabled().catch(() => true))) {
    const importoInput = rp.dialog.locator('[data-testid="riconcilia-importo"]')
    if (await importoInput.count()) await importoInput.fill(importo)
    await riconciliaBtn.click()
    await page.waitForLoadState('networkidle').catch(() => {})
  }
}
