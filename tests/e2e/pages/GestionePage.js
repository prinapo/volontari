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

  /**
   * Selects the Contatti tab (Famiglie tab is first after reorder)
   */
  async selectContattiTab() {
    await this.contattiTab.click()
    await this.page.waitForTimeout(500)
    await this.waitForTable()
  }

  get searchInput() {
    return this.page.locator('input[placeholder="Cerca per nome..."]')
  }

  get tipoFilter() {
    return this.page.locator('.q-select').first()
  }

  get table() {
    return this.page.locator('table')
  }

  get tableRows() {
    return this.page.locator('.q-table tbody tr')
  }

  get paginationInfo() {
    return this.page.locator('.q-table__bottom')
  }

  async waitForTable() {
    await this.page.locator('.q-table tbody tr').first().waitFor({ state: 'attached', timeout: 20000 }).catch(() => {})
    await this.page.waitForTimeout(500)
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
    await this.page.waitForTimeout(500)
    await this.waitForTable()
  }

  async setTipoFilter(tipo) {
    await this.tipoFilter.click()
    await this.page.locator(`.q-item:has-text("${tipo}")`).click()
    await this.page.waitForTimeout(500)
    await this.waitForTable()
  }

  async getRowCount() {
    return await this.tableRows.count()
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

  get contattiDialog() {
    return this.page.locator('.q-dialog:has(.text-h6:has-text("Contatti di"))')
  }

  /**
   * Clicca icona contacts sulla riga famiglia nella q-table delle Famiglie.
   * Ritorna true se trovata e cliccata.
   */
  async clickContactsOnFamiglia(nomeFamiglia) {
    // Trova la riga nella tabella che ha Nome_Famiglia = nomeFamiglia
    // Nota: il primo td è l'expand toggle, il secondo è Nome_Famiglia
    const rows = this.page.locator('.q-table tbody tr')
    const count = await rows.count()
    for (let i = 0; i < count; i++) {
      const cellText = await rows.nth(i).locator('td').nth(1).innerText()
      if (cellText.trim() === nomeFamiglia) {
        // Clicca icona contacts nell'ultima cella (azioni)
        // icon="contacts" rende <i class="q-icon material-icons">contacts</i>
        const actionCell = rows.nth(i).locator('td').last()
        await actionCell.locator('.q-btn').filter({ hasText: 'contacts' }).click()
        await this.contattiDialog.waitFor({ state: 'visible', timeout: 5000 })
        return true
      }
    }
    return false
  }

  /**
   * Assegna un contatto come Genitore tramite ContattiDialog.
   * Clicca il selettore per aprire il dropdown e seleziona la prima opzione disponibile.
   * @param {string} searchTerm - non usato (mantenuto per retrocompatibilità)
   * @param {string|object} [_unused] - non usato
   */
  async assignGenitore(searchTerm, _unused) {
    const select = this.contattiDialog.locator('.q-select:has(.q-field__label:has-text("Cerca contatto"))')
    const input = select.locator('input')

    // Click input to open dropdown with preloaded options
    await input.click()
    await this.page.waitForTimeout(800)

    // Pick first available option
    const firstItem = this.page.locator('.q-menu .q-item').first()
    await firstItem.waitFor({ state: 'visible', timeout: 5000 })
    await firstItem.click()

    await this.page.waitForTimeout(300)
    await this.contattiDialog.locator('button:has-text("Associa come Genitore")').click()
    await this.page.waitForTimeout(500)
  }

  /**
   * Assegna un contatto come Volontario tramite ContattiDialog.
   */
  async assignVolontario(searchTerm, fullName) {
    const input = this.contattiDialog.locator('.q-select:has(.q-field__label:has-text("Cerca contatto")) input')
    await input.fill(searchTerm)
    await this.page.waitForTimeout(600)
    const item = this.page.locator('.q-menu .q-item').filter({ hasText: fullName }).first()
    await item.waitFor({ state: 'visible', timeout: 5000 })
    await item.click()
    await this.page.waitForTimeout(300)
    await this.contattiDialog.locator('button:has-text("Associa come Volontario")').click()
    await this.page.waitForTimeout(500)
  }
}
