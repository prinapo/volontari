/**
 * UI helpers per FamigliePage — selezione famiglia e progetto.
 */

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

  // Click selettore per aprire menu
  await famSelector.click()
  await page.waitForTimeout(500)

  // Trova le opzioni famiglia
  const menu = page.locator('.q-menu')
  const options = menu.locator('.q-item')
  const count = await options.count()
  let found = false
  for (let i = 0; i < count; i++) {
    const text = await options.nth(i).innerText()
    if (text.includes(nomeFamiglia)) {
      await options.nth(i).click()
      found = true
      break
    }
  }

  if (!found) {
    if (count > 0) {
      await options.first().click()
    }
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
  await page.waitForTimeout(300)

  const items = page.locator('.q-menu .q-item')
  if ((await items.count()) <= index) {
    console.log(`[selezionaProgetto] indice ${index} fuori range (${await items.count()} disponibili)`)
    return
  }

  await items.nth(index).click()
  await page.waitForTimeout(500)
}
