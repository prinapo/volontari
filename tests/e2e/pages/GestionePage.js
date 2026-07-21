export class GestionePage {
  constructor(page) {
    this.page = page
  }

  async goto() {
    await this.page.goto('/gestione')
  }

  // --- Contatti tab ---

  get contattiTab() {
    return this.page.locator('.q-tab:has-text("Contatti")')
  }

  async #waitForContattiApi() {
    await this.page
      .waitForResponse(resp => resp.url().includes('/items/contatti') && resp.request().method() === 'GET', {
        timeout: 10_000
      })
      .catch(() => {})
  }

  async #waitForFamiglieApi() {
    await this.page
      .waitForResponse(resp => resp.url().includes('/items/Famiglie') && resp.request().method() === 'GET', {
        timeout: 10_000
      })
      .catch(() => {})
  }

  /**
   * Selects the Contatti tab (Famiglie tab is first after reorder)
   */
  async selectContattiTab() {
    await this.contattiTab.click()
    await this.#waitForContattiApi()
    await this.waitForTable()
    const isMobile = (await this.page.locator('.q-table__grid').count()) > 0
    if (isMobile) {
      await this.waitForTableMobile()
    }
  }

  get searchInput() {
    return this.page.locator('input[placeholder="Cerca per nome..."]')
  }

  get tipoFilter() {
    return this.page.locator('.q-select').first()
  }

  get table() {
    return this.page.locator('.q-table')
  }

  get tableRows() {
    return this.activePanel.locator('.q-table tbody tr')
  }

  get activePanel() {
    return this.page.locator('.q-tab-panel:not([hidden])')
  }

  get paginationInfo() {
    return this.page.locator('.q-table__bottom')
  }

  async waitForTable() {
    await this.page
      .waitForFunction(
        sel => {
          const panel = document.querySelector('.q-tab-panel:not([hidden])')
          if (!panel) return false
          const tr = panel.querySelector('.q-table tbody tr')
          const exp = panel.querySelector('.q-expansion-item')
          return !!(tr || exp)
        },
        { timeout: 20_000 }
      )
      .catch(() => {})
    await this.page.waitForLoadState('networkidle')
  }

  async waitForTableMobile() {
    await this.page
      .locator('.q-expansion-item')
      .first()
      .waitFor({ state: 'visible', timeout: 15_000 })
      .catch(() => {})
  }

  async getRowCount() {
    const trCount = await this.activePanel.locator('.q-table tbody tr').count()
    if (trCount > 0) return trCount
    const expCount = await this.activePanel.locator('.q-expansion-item').count()
    if (expCount > 0) return expCount
    return 0
  }

  async getTotalItems() {
    try {
      const text = await this.paginationInfo.innerText({ timeout: 5000 })
      const match = text.match(/di\s+([\d.]+)/)
      return match ? parseInt(match[1].replaceAll('.', '')) : 0
    } catch {
      return 0
    }
  }

  async search(text) {
    await this.searchInput.fill(text)
    await this.page.waitForTimeout(500)
    await this.#waitForContattiApi()
    await this.waitForTable()
    const isMobile = (await this.page.locator('.q-table__grid').count()) > 0
    if (isMobile) {
      await this.waitForTableMobile()
    }
  }

  async setTipoFilter(tipo) {
    await this.tipoFilter.click()
    await this.page.locator(`.q-menu .q-item:has-text("${tipo}"), .q-dialog .q-item:has-text("${tipo}")`).first().click()
    await this.#waitForContattiApi()
    await this.waitForTable()
  }

  async getTableHeaderTexts() {
    return await this.page.locator('.q-table thead tr th').allInnerTexts()
  }

  async getFirstCellText(rowIndex = 0) {
    return await this.tableRows.nth(rowIndex).locator('td').first().innerText()
  }

  async getCellText(rowIndex, colIndex) {
    return await this.tableRows.nth(rowIndex).locator('td').nth(colIndex).innerText()
  }

  // --- Famiglie tab ---

  get famiglieTab() {
    return this.page.locator('.q-tab:has-text("Famiglie")')
  }

  get famiglieSearch() {
    return this.page.locator('input[placeholder="Cerca per nome famiglia..."]')
  }

  async searchFamiglie(text) {
    await this.famiglieSearch.fill(text)
    await this.#waitForFamiglieApi()
    await this.waitForTable()
  }

  get contattiDialog() {
    return this.page.locator('.q-dialog:has(.text-h6:has-text("Contatti di"))')
  }

  /**
   * Apre i contatti per una famiglia espandendo la riga e cliccando "Aggiungi contatto".
   * Supporta desktop (q-table expand row) e mobile (expansion item).
   * Salta le righe expand (colspan) che hanno solo 1 cella.
   */
  async clickContactsOnFamiglia(nomeFamiglia) {
    // Desktop: trova la riga col nome famiglia, espandi, clicca Aggiungi contatto
    const famigliaRow = this.page.locator('.q-table tbody tr').filter({ hasText: nomeFamiglia }).first()
    if (await famigliaRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      const expandBtn = famigliaRow.locator('button[aria-label="Mostra contatti"]')
      if (await expandBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expandBtn.click()
        await this.page.waitForLoadState('networkidle')
      }
      const addBtn = this.page.locator('button:has-text("Aggiungi contatto")').first()
      if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await addBtn.click()
        await this.contattiDialog.waitFor({ state: 'visible', timeout: 5000 })
        return true
      }
    }

    // Mobile: espandi l'expansion item e cerca il pulsante contatti
    const grid = this.page.locator('.q-table--grid')
    if (await grid.isVisible({ timeout: 1000 }).catch(() => false)) {
      const expItem = this.page.locator('.q-expansion-item').filter({ hasText: nomeFamiglia }).first()
      if (await expItem.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Espandi se non già espanso
        if (!(await expItem.locator('.q-expansion-item--expanded').count())) {
          await expItem.click()
          await this.page.waitForLoadState('networkidle')
        }
        const addBtn = expItem.locator('button:has-text("Aggiungi contatto")')
        if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await addBtn.evaluate(el => el.click())
          await this.contattiDialog.waitFor({ state: 'visible', timeout: 5000 })
          return true
        }
      }
    }

    return false
  }



  /**
   * Assegna un contatto come Genitore tramite ContattiDialog.
   * Attende il filtro async del QSelect (input-debounce 300ms + API call)
   * e seleziona l'item che contiene il searchTerm nel label (email tra parentesi).
   */
  async assignGenitore(searchTerm) {
    const select = this.contattiDialog.locator('.q-select:has(.q-field__label:has-text("Cerca contatto"))')
    await select.click()
    const input = select.locator('input')
    await input.fill(searchTerm)
    await this.page.waitForResponse(
      resp => resp.url().includes('/items/contatti') && resp.request().method() === 'GET',
      { timeout: 10_000 }
    ).catch(() => {})
    await this.page.waitForTimeout(500)
    const item = this.page.locator('.q-item').filter({ hasText: searchTerm }).first()
    if ((await item.count()) > 0) {
      await item.click({ force: true })
    } else {
      throw new Error(`Contatto con testo "${searchTerm}" non trovato nella ricerca`)
    }
    await this.contattiDialog.locator('button:has-text("Genitore")').last().click()
  }

  /**
   * Assegna un contatto come Volontario tramite ContattiDialog.
   * Cerca il contatto per email (univoca) nel QSelect.
   */
  async assignVolontario(searchEmail) {
    const select = this.contattiDialog.locator('.q-select:has(.q-field__label:has-text("Cerca contatto"))')
    await select.click()
    const input = select.locator('input')
    await input.fill(searchEmail)
    await this.page.waitForResponse(
      resp => resp.url().includes('/items/contatti') && resp.request().method() === 'GET',
      { timeout: 10_000 }
    ).catch(() => {})
    await this.page.waitForTimeout(500)
    const item = this.page.locator('.q-item').filter({ hasText: searchEmail }).first()
    if ((await item.count()) > 0) {
      await item.click({ force: true })
    } else {
      throw new Error(`Contatto con email "${searchEmail}" non trovato nella ricerca`)
    }
    await this.contattiDialog.locator('button:has-text("Volontario")').first().click()
  }

  async removeFromFamiglia(fullName) {
    const dialog = this.page.locator('.q-dialog:visible')
    const rows = dialog.locator('.q-table tbody tr')
    const count = await rows.count()
    for (let i = 0; i < count; i++) {
      const text = await rows.nth(i).innerText()
      if (text.includes(fullName)) {
        await rows.nth(i).locator('.q-btn:has-text("delete")').click()
        return true
      }
    }
    return false
  }
}
