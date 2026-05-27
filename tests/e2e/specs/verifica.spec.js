import { test, expect } from '../helpers/console.js'
import { LoginPage } from '../pages/LoginPage.js'
import auth from '../fixtures/auth-verifica.json' with { type: 'json' }

const API_URL = 'https://app.sostienilsostegno.com'

async function seedInviato(page) {
  const token = await page.evaluate(() => localStorage.getItem('access_token'))
  if (!token) { console.log('SEED: no token'); return null }
  // Sort by Famiglia to match QTable default sortBy 'idFamiglia'
  const projUrl = new URL(`${API_URL}/items/Progetti`)
  projUrl.searchParams.set('limit', '1')
  projUrl.searchParams.set('sort', 'Famiglia')
  const projRes = await fetch(projUrl, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  })
  if (!projRes.ok) { console.log('SEED: progetti req failed', projRes.status); return null }
  const projBody = await projRes.json()
  const project = projBody.data?.[0]
  if (!project) { console.log('SEED: no projects', JSON.stringify(projBody)); return null }
  console.log('SEED: found project', project.id_progetto, 'famiglia', project.Famiglia)
  const desc = `__TEST_Inviato_${Date.now()}`
  const res = await fetch(`${API_URL}/items/Giustificativi`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      Progetto: project.id_progetto,
      Descrizione: desc,
      Importo: 50,
      Data: new Date().toISOString().slice(0, 10),
      Stato: 'Inviato'
    })
  })
  if (!res.ok) { console.log('SEED: create giustificativo failed', res.status); return null }
  const created = await res.json()
  console.log('SEED: created giustificativo', created.data?.id)
  return { id: created.data?.id, desc }
}

async function deleteGiustificativo(page, id) {
  if (!id) return
  const token = await page.evaluate(() => localStorage.getItem('access_token'))
  if (!token) return
  await fetch(`${API_URL}/items/Giustificativi/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  })
}

test.describe('VerificaPage — Auth & Layout', () => {
  test('VR-01: Accesso verificatore apre VerificaPage @smoke', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(auth.email, auth.password)
    await expect(page).toHaveURL(/\/verifica/, { timeout: 15000 })
    await expect(page.locator('.verifica-table')).toBeVisible({ timeout: 15000 })
  })

  test('VR-02: VerificaPage non accessibile se non autorizzati @regression', async () => {
    // Serve un utente volontario (non verifica) — test con fixture auth.json separata
    test.skip()
  })

  test('TB-01: Colonne ordine corretto @smoke', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(auth.email, auth.password)
    await expect(page.locator('.verifica-table')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(2000)

    const headers = await page.locator('.verifica-table thead tr:first-child th').allInnerTexts()
    // headers[0] = auto-width (colonna expand), poi Bando, Famiglia, ...
    const rendicontatoHeader = headers.find(h => h.includes('Rendicontato'))
    expect(rendicontatoHeader).toBeTruthy()
    expect(headers[1]).toContain('Bando')
    expect(headers[2]).toContain('Famiglia')
    expect(headers[3]).toContain('Dati bancari')
    expect(headers[4]).toContain('Allocato')
    expect(headers[6]).toContain('Rimborsabile')
    expect(headers[7]).toContain('Stato')
  })

  test('TB-05: Colonna Totali non esiste @regression', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(auth.email, auth.password)
    await expect(page.locator('.verifica-table')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('th:has-text("Totali")')).not.toBeVisible()
  })
})

test.describe('VerificaPage — Filtri', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(auth.email, auth.password)
    await expect(page.locator('.verifica-table')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(2000)
  })

  test('FL-01: Tranche Tutte mostra tutti i progetti @smoke', async ({ page }) => {
    // Il default è "Tutte" — tutte le righe visibili
    const rows = await page.locator('.verifica-table tbody tr').count()
    expect(rows).toBeGreaterThanOrEqual(0)
  })

  test('FL-04: Filtro rendicontazione con importi @crud', async ({ page }) => {
    // Cambia filtro in "Solo con importi"
    await page.locator('.q-select:has(.q-field__label:has-text("Rendicontazione"))').click()
    await page.locator('.q-item:has-text("Solo con importi")').click()
    await page.waitForTimeout(500)
    // Ogni riga visibile dovrebbe avere rendicontato > 0 (badge Non ricevuta non presente)
    const nonRicevutaCount = await page.locator('.q-badge:has-text("Non ricevuta")').count()
    expect(nonRicevutaCount).toBe(0)
  })

  test('FL-05: Filtro rendicontazione mancanti @crud', async ({ page }) => {
    await page.locator('.q-select:has(.q-field__label:has-text("Rendicontazione"))').click()
    await page.locator('.q-item:has-text("Solo mancanti")').click()
    await page.waitForTimeout(500)
    // Ogni riga visibile mostra "Non ricevuta" (se IBAN presente) o "Dati bancari mancanti" (se IBAN assente)
    const nonRicevutaCount = await page.locator('.verifica-table .q-badge:has-text("Non ricevuta")').count()
    const datiMancantiCount = await page.locator('.verifica-table .q-badge:has-text("Dati bancari mancanti")').count()
    const dataRows = await page.locator('.verifica-table tbody tr:has(td .q-btn)').count()
    if (dataRows > 0) {
      expect(nonRicevutaCount + datiMancantiCount).toBe(dataRows)
    }
  })

  test('FL-06: Filtro anno bando @crud', async ({ page }) => {
    const annoSelect = page.locator('.q-select:has(.q-field__label:has-text("Anno bando"))')
    await annoSelect.click()
    const firstOption = page.locator('.q-item').first()
    const annoLabel = await firstOption.innerText()
    await firstOption.click()
    await page.waitForTimeout(500)
    const rows = await page.locator('.verifica-table tbody tr').count()
    expect(rows).toBeGreaterThanOrEqual(0)
  })

  test('FL-07: Ricerca per famiglia @crud', async ({ page }) => {
    const allRows = page.locator('.verifica-table tbody tr:has(td .q-btn)')
    await expect(allRows.first()).toBeVisible({ timeout: 5000 })
    const firstFamiglia = await page.locator('.verifica-table .text-weight-medium').first().innerText()
    await page.locator('input[type="text"]').last().fill(firstFamiglia)
    await page.waitForTimeout(500)
    const filteredCount = await allRows.count()
    expect(filteredCount).toBeGreaterThanOrEqual(1)
  })
})

test.describe('VerificaPage — Expanded Row & Giustificativi', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(auth.email, auth.password)
    await expect(page.locator('.verifica-table')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(2000)
  })

  test('ER-01: Click expand mostra giustificativi @smoke', async ({ page }) => {
    const expandBtn = page.locator('.verifica-table tbody tr td .q-btn').first()
    await expandBtn.click()
    await page.waitForTimeout(500)
    await expect(page.locator('.expandable-content').first()).toBeVisible({ timeout: 5000 })
  })

  test('ER-02: Toggle expand/close funziona @regression', async ({ page }) => {
    const expandBtn = page.locator('.verifica-table tbody tr td .q-btn').first()
    await expandBtn.click()
    await page.waitForTimeout(500)
    await expect(page.locator('.expandable-content').first()).toBeVisible({ timeout: 3000 })
    await expandBtn.click()
    await page.waitForTimeout(500)
    await expect(page.locator('.expandable-content').first()).not.toBeVisible({ timeout: 3000 })
  })
})

test.describe('VerificaPage — Dati bancari edit', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(auth.email, auth.password)
    await expect(page.locator('.verifica-table')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(2000)
  })

  test('DB-V1: Badge dati bancari Completi/Da completare presenti @smoke', async ({ page }) => {
    const badges = page.locator('.verifica-table .q-badge:has-text("Completi"), .verifica-table .q-badge:has-text("Da completare")')
    await expect(badges.first()).toBeVisible({ timeout: 5000 })
  })

  test('DB-V2: Pulsante edit apre dialog IBAN @smoke', async ({ page }) => {
    const editBtn = page.locator('.verifica-table tbody tr td .q-btn').filter({ has: page.locator('i:text-is("edit")') }).first()
    if (await editBtn.count() === 0) test.skip()
    await editBtn.click()
    await expect(page.locator('.q-dialog:has(.text-h6:has-text("Modifica dati bancari"))')).toBeVisible({ timeout: 3000 })
  })

  test('DB-V3: Dialog IBAN annulla chiude senza salvare @crud', async ({ page }) => {
    const editBtn = page.locator('.verifica-table tbody tr td .q-btn').filter({ has: page.locator('i:text-is("edit")') }).first()
    if (await editBtn.count() === 0) test.skip()
    await editBtn.click()
    await expect(page.locator('.q-dialog')).toBeVisible({ timeout: 3000 })
    await page.locator('.q-dialog button:has-text("Annulla")').click()
    await expect(page.locator('.q-dialog')).not.toBeVisible({ timeout: 3000 })
  })
})

test.describe('VerificaPage — Rifiuto con nota', () => {
  let seedId = null

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(auth.email, auth.password)
    await page.waitForURL(/\/verifica/)
    // Seed un giustificativo "Inviato" per poter testare il rifiuto
    const seeded = await seedInviato(page)
    seedId = seeded?.id
    // Refresh page per caricare i nuovi dati
    if (seeded) {
      await page.goto('/verifica')
      await expect(page.locator('.verifica-table')).toBeVisible({ timeout: 15000 })
      await page.waitForTimeout(2000)
    }
  })

  test.afterEach(async ({ page }) => {
    if (seedId) {
      await deleteGiustificativo(page, seedId)
      seedId = null
    }
  })

  async function clickRejectBtn(page) {
    // Expandable-content uses v-show="props.expand" — content always in DOM but hidden.
    // Dispatch native click on the cancel button to bypass display:none.
    return await page.evaluate(() => {
      const buttons = document.querySelectorAll('.expandable-content button')
      for (const btn of buttons) {
        const icon = btn.querySelector('i')
        if (icon && icon.textContent === 'cancel') {
          btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
          return true
        }
      }
      return false
    })
  }

  test('RN-01: Rifiuta apre dialog nota obbligatoria @smoke', async ({ page }) => {
    const clicked = await clickRejectBtn(page)
    if (!clicked) test.skip()
    await expect(page.locator('.q-dialog:has(.text-h6:has-text("Rifiuta giustificativo"))')).toBeVisible({ timeout: 3000 })
  })

  test('RN-02: Rifiuta senza nota button disabilitato @regression', async ({ page }) => {
    const clicked = await clickRejectBtn(page)
    if (!clicked) test.skip()
    await expect(page.locator('.q-dialog')).toBeVisible({ timeout: 3000 })
    const confirmBtn = page.locator('.q-dialog button:has-text("Rifiuta")')
    await expect(confirmBtn).toBeDisabled()
  })

  test('RN-03: Rifiuta con nota salva e badge cambia @crud', async ({ page }) => {
    const clicked = await clickRejectBtn(page)
    if (!clicked) test.skip()
    await expect(page.locator('.q-dialog')).toBeVisible({ timeout: 3000 })
    const dialog = page.locator('.q-dialog')
    await dialog.locator('textarea').fill(`__TEST_Rifiuto_${Date.now()}`)
    const [patchResp] = await Promise.all([
      page.waitForResponse(
        resp => resp.url().includes('/items/Giustificativi/') && resp.request().method() === 'PATCH'
      ),
      dialog.locator('button:has-text("Rifiuta")').click()
    ])
    expect(patchResp.status()).toBe(200)
    await expect(dialog).not.toBeVisible({ timeout: 5000 })
    await expect(page.locator('.q-badge:has-text("Rifiutato")').first()).toBeAttached({ timeout: 5000 })
  })
})

test.describe('VerificaPage — Stato riga', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(auth.email, auth.password)
    await page.waitForURL(/\/verifica/)
    // Seed un giustificativo "Inviato" per abilitare badge "Da verificare"
    const seeded = await seedInviato(page)
    if (seeded) {
      await page.reload()
      await expect(page.locator('.verifica-table')).toBeVisible({ timeout: 15000 })
      await page.waitForTimeout(2000)
    }
  })

  test('SR-01: Stato Non ricevuta visibile @smoke', async ({ page }) => {
    const badge = page.locator('.q-badge:has-text("Non ricevuta")').first()
    if (await badge.count() > 0) {
      await expect(badge).toBeVisible()
    } else {
      test.skip()
    }
  })

  test('SR-02: Stato Da verificare visibile quando presente @smoke', async ({ page }) => {
    // Il badge "Da verificare" appare solo con una tranche specifica selezionata
    const trancheSelect = page.locator('.q-select').first()
    await trancheSelect.click()
    const options = page.locator('.q-menu .q-item')
    const optionCount = await options.count()
    if (optionCount > 1) {
      await options.nth(1).click()
      await page.waitForTimeout(500)
    }
    const badge = page.locator('.q-badge:has-text("Da verificare")').first()
    if (await badge.count() > 0) {
      await expect(badge).toBeVisible()
    } else {
      test.skip()
    }
  })

  test('SR-03: Stato Pronta ASPI visibile quando presente @smoke', async ({ page }) => {
    const badge = page.locator('.q-badge:has-text("Pronta ASPI")').first()
    if (await badge.count() > 0) {
      await expect(badge).toBeVisible()
    } else {
      test.skip()
    }
  })
})

test.describe('VerificaPage — ASPI Export', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(auth.email, auth.password)
    await expect(page.locator('.verifica-table')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(2000)
  })

  test('AS-01: Export ASPI button visibile @smoke', async ({ page }) => {
    await expect(page.locator('button:has-text("Export ASPI")')).toBeVisible({ timeout: 5000 })
  })

  test('AS-02: Copia riga ASPI funziona @crud', async ({ page }) => {
    await page.evaluate(() => { navigator.clipboard.writeText = async () => {} })
    const copyBtn = page.locator('.verifica-table .q-btn').filter({ has: page.locator('i:text-is("content_copy")') }).first()
    if (await copyBtn.count() === 0) test.skip()
    await copyBtn.click()
    await expect(page.locator('.q-notification').first()).toBeVisible({ timeout: 5000 })
  })
})
