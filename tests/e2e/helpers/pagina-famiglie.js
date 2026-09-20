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
      .waitFor({ state: 'visible', timeout: 15_000 })
      .catch(() => {})
    return false
  }

  // Click selettore per aprire menu/dialog
  await famSelector.scrollIntoViewIfNeeded()
  await famSelector.click({ force: true })
  await page.waitForLoadState('networkidle').catch(() => {})

  // Cerca le opzioni nel menu (desktop) o nel dialog (mobile)
  const options = page.locator('[role="option"]')
  await options
    .first()
    .waitFor({ state: 'visible', timeout: 10_000 })
    .catch(() => {})
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
    .waitFor({ state: 'visible', timeout: 15_000 })
    .catch(() => {
      console.log(`[selezionaFamiglia] famiglia "${nomeFamiglia}" non caricata`)
    })

  return true
}

export async function apriFamiglieESelezionaFamiglia(page, nomeFamiglia, { expandGiustificativi = true } = {}) {
  await page.goto('/famiglie', { timeout: 15_000 }).catch(() => {})
  await page.waitForLoadState('networkidle').catch(() => {})

  if (nomeFamiglia) {
    await selezionaFamiglia(page, nomeFamiglia)
    await page.keyboard.press('Escape').catch(() => {})
    await page.waitForLoadState('networkidle').catch(() => {})
  }

  await page
    .locator('.text-h6')
    .first()
    .waitFor({ state: 'visible', timeout: 15_000 })
    .catch(() => {})

  await page
    .locator('.bg-green-1')
    .first()
    .waitFor({ state: 'visible', timeout: 10_000 })
    .catch(() => {})

  if (expandGiustificativi) {
    await espandiGiustificativi(page)
  }
}

/**
 * Espande la sezione "Giustificativi" della scheda famiglia (collassata di default).
 * Best-effort: no-op se la sezione non è presente (es. area verifica manager).
 */
export async function espandiGiustificativi(page) {
  await espandiSezione(page, 'Giustificativi')
}

/**
 * Espande la sezione "Erogazioni" della scheda famiglia (collassata di default).
 * Best-effort: no-op se la sezione non è presente.
 */
export async function espandiErogazioni(page) {
  await espandiSezione(page, 'Erogazioni')
}

async function espandiSezione(page, titolo) {
  const header = page.locator(`.q-expansion-item:has-text("${titolo}")`).first()
  if ((await header.count()) === 0) return

  const content = header.locator('.q-expansion-item__content').first()
  if (await content.isVisible().catch(() => false)) return

  // L'header cliccabile è il QItem interno all'expansion item.
  await header.locator('.q-item').first().click({ timeout: 8000 })
  await content.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {})
  await page.waitForLoadState('networkidle').catch(() => {})
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

  await progettoSelect.scrollIntoViewIfNeeded()
  await progettoSelect.click({ force: true })
  await page.waitForLoadState('networkidle').catch(() => {})

  const items = page.locator('[role="option"]')
  if ((await items.count()) <= index) {
    console.log(`[selezionaProgetto] indice ${index} fuori range (${await items.count()} disponibili)`)
    return
  }

  await items.nth(index).click({ force: true })
  await page.waitForLoadState('networkidle').catch(() => {})
}
