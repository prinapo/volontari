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

  async _waitForContattiApi() {
    await this.page.waitForResponse(
      resp => resp.url().includes('/items/contatti') && resp.request().method() === 'GET',
      { timeout: 10000 }
    ).catch(() => {})
  }

  async _waitForFamiglieApi() {
    await this.page.waitForResponse(
      resp => resp.url().includes('/items/Famiglie') && resp.request().method() === 'GET',
      { timeout: 10000 }
    ).catch(() => {})
  }

  /**
   * Selects the Contatti tab (Famiglie tab is first after reorder)
   */
  async selectContattiTab() {
    await this.contattiTab.click()
    await this._waitForContattiApi()
    await this.waitForTable()
    const isMobile = await this.page.locator('.q-table__grid').count() > 0
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
    await this.page.waitForFunction((sel) => {
      const panel = document.querySelector('.q-tab-panel:not([hidden])')
      if (!panel) return false
      const tr = panel.querySelector('.q-table tbody tr')
      const exp = panel.querySelector('.q-expansion-item')
      return !!(tr || exp)
    }, { timeout: 20000 }).catch(() => {})
    await this.page.waitForTimeout(500)
  }

  async waitForTableMobile() {
    await this.page.locator('.q-expansion-item').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {})
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
      return match ? parseInt(match[1].replace(/\./g, '')) : 0
    } catch {
      return 0
    }
  }

  async search(text) {
    await this.searchInput.fill(text)
    await this.page.waitForTimeout(350)
    await this._waitForContattiApi()
    await this.waitForTable()
    const isMobile = await this.page.locator('.q-table__grid').count() > 0
    if (isMobile) {
      await this.waitForTableMobile()
    }
  }

  async setTipoFilter(tipo) {
    await this.tipoFilter.click()
    await this.page.locator(`.q-item:has-text("${tipo}")`).click()
    await this._waitForContattiApi()
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
    await this._waitForFamiglieApi()
    await this.waitForTable()
  }

  get contattiDialog() {
    return this.page.locator('.q-dialog:has(.text-h6:has-text("Contatti di"))')
  }

  /**
   * Clicca icona contacts sulla riga famiglia nella q-table delle Famiglie.
   * Supporta desktop (tbody tr) e mobile (espansione card).
   */
  async clickContactsOnFamiglia(nomeFamiglia) {
    // Prima prova desktop
    const desktopRows = this.page.locator('.q-table tbody tr')
    const desktopCount = await desktopRows.count()
    if (desktopCount > 0) {
      const mainRowCount = Math.floor(desktopCount / 2)
      for (let i = 0; i < mainRowCount; i++) {
        const mainRow = desktopRows.nth(i * 2)
        const cellText = await mainRow.locator('td').nth(1).innerText()
        if (cellText.trim().includes(nomeFamiglia)) {
          const actionCell = mainRow.locator('td').last()
          await actionCell.locator('.q-btn').filter({ hasText: 'contacts' }).click()
          await this.contattiDialog.waitFor({ state: 'visible', timeout: 5000 })
          return true
        }
      }
    }

    // Fallback mobile: cerca expansion item
    const expItems = this.page.locator('.q-expansion-item')
    const expCount = await expItems.count()
    for (let i = 0; i < expCount; i++) {
      const label = await expItems.nth(i).locator('.q-item__label').first().innerText().catch(() => '')
      if (label.includes(nomeFamiglia)) {
        // Espandi se non già espanso
        if (await expItems.nth(i).locator('.q-expansion-item--expanded').count() === 0) {
          await expItems.nth(i).click()
          await this.page.waitForTimeout(500)
        }
        const contactsBtn = expItems.nth(i).locator('.q-btn[icon="contacts"]')
        if (await contactsBtn.count() > 0) {
          await contactsBtn.click()
          await this.contattiDialog.waitFor({ state: 'visible', timeout: 5000 })
          return true
        }
      }
    }
    return false
  }

  /**
   * Assegna un contatto come Genitore tramite ContattiDialog.
   */
  async assignGenitore(searchTerm) {
    const select = this.contattiDialog.locator('.q-select:has(.q-field__label:has-text("Cerca contatto"))')
    const input = select.locator('input')
    await input.click()
    await input.fill(searchTerm)
    await this.page.locator('.q-menu .q-item').first().waitFor({ state: 'visible', timeout: 5000 })
    await this.page.locator('.q-menu .q-item').first().click()
    await this.contattiDialog.locator('button:has-text("Genitore")').last().click()
  }

  /**
   * Assegna un contatto come Volontario tramite ContattiDialog.
   */
  async assignVolontario(searchTerm, fullName) {
    const input = this.contattiDialog.locator('.q-select:has(.q-field__label:has-text("Cerca contatto")) input')
    await input.fill(searchTerm)
    const item = this.page.locator('.q-menu .q-item').filter({ hasText: fullName }).first()
    await item.waitFor({ state: 'visible', timeout: 5000 })
    await item.click()
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
