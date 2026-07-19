/**
 * UI helpers per FamigliePage — selezione famiglia e progetto.
 */
import { loginAs } from './login.js'

/**
 * Seleziona una famiglia dal dropdown (se visibile — multi-famiglia).
 * Attende che la card famiglia appaia (.text-h6) e il primo progetto sia caricato.
 */
export async function selezionaFamiglia(page, nomeFamiglia) {
  const famSelector = page.locator('.q-select:has(.q-field__label:has-text("Seleziona famiglia"))')

  if (!(await famSelector.isVisible({ timeout: 8000 }).catch(() => false))) {
    await page
      .locator('.text-h6')
      .first()
      .waitFor({ state: 'visible', timeout: 15000 })
      .catch(() => {})
    return false
  }

  // Click selettore per aprire menu/dialog
  await famSelector.click()
  await page.waitForLoadState("networkidle").catch(() => {})

  // Cerca le opzioni nel menu (desktop) o nel dialog (mobile)
  const options = page.locator('[role="option"]')
  await options.first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {})
  const count = await options.count()
  let found = false
  for (let i = 0; i < count; i++) {
    const text = await options.nth(i).innerText()
    if (text.includes(nomeFamiglia)) {
      await options.nth(i).click({ force: true })
      found = true
      break
    }
  }

  if (!found && count > 0) {
    await options.first().click({ force: true })
  }

  // Aspetta che la card famiglia sia caricata
  await page
    .locator('.text-h6')
    .first()
    .waitFor({ state: 'visible', timeout: 15000 })
    .catch(() => {
      console.log(`[selezionaFamiglia] famiglia "${nomeFamiglia}" non caricata`)
    })

  return true
}

export async function apriFamiglieESelezionaFamiglia(page, nomeFamiglia) {
  await page.goto('/famiglie', { timeout: 15000 }).catch(() => {})
  await page.waitForLoadState("networkidle").catch(() => {})

  if (nomeFamiglia) {
    await selezionaFamiglia(page, nomeFamiglia)
    await page.keyboard.press('Escape').catch(() => {})
    await page.waitForLoadState("networkidle").catch(() => {})
  }

  await page
    .locator('.text-h6')
    .first()
    .waitFor({ state: 'visible', timeout: 15000 })
    .catch(() => {})

  await page
    .locator('.bg-green-1')
    .first()
    .waitFor({ state: 'visible', timeout: 10000 })
    .catch(() => {})
}

export async function loginConFamigliaViaUI(page, { role = 'volontario', auth, nomeFamiglia } = {}) {
  await loginAs(page, role, auth)
  await apriFamiglieESelezionaFamiglia(page, nomeFamiglia)
}

/**
 * Seleziona un progetto dal ProgettoSelector.
 */
export async function selezionaProgetto(page, index = 0) {
  const progettoSelect = page.locator('.q-select').first()
  if (!(await progettoSelect.isVisible({ timeout: 5000 }).catch(() => false))) {
    console.log('[selezionaProgetto] nessun selettore progetto trovato')
    return
  }

  await progettoSelect.click()
  await page.waitForLoadState("networkidle").catch(() => {})

  const items = page.locator('[role="option"]')
  if ((await items.count()) <= index) {
    console.log(`[selezionaProgetto] indice ${index} fuori range (${await items.count()} disponibili)`)
    return
  }

  await items.nth(index).click({ force: true })
  await page.waitForLoadState("networkidle").catch(() => {})
}
