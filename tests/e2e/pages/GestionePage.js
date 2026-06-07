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

  get famiglieSearch() {
    return this.page.locator('input[placeholder="Cerca per nome famiglia..."]')
  }

  async searchFamiglie(text) {
    await this.famiglieSearch.fill(text)
    await this.page.waitForTimeout(500)
    await this.waitForTable()
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
    // Ogni riga q-table custom body ha 2 q-tr: principale + espansa (colspan)
    // Usiamo nth(i*2) per saltare le righe espanse
    const rows = this.page.locator('.q-table tbody tr')
    const count = await rows.count()
    const mainRowCount = Math.floor(count / 2)
    for (let i = 0; i < mainRowCount; i++) {
      const mainRow = rows.nth(i * 2)
      const cellText = await mainRow.locator('td').nth(1).innerText()
      if (cellText.trim().includes(nomeFamiglia)) {
        // Clicca icona contacts nell'ultima cella (azioni)
        // icon="contacts" rende <i class="q-icon material-icons">contacts</i>
        const actionCell = mainRow.locator('td').last()
        await actionCell.locator('.q-btn').filter({ hasText: 'contacts' }).click()
        await this.contattiDialog.waitFor({ state: 'visible', timeout: 5000 })
        return true
      }
    }
    return false
  }

  /**
   * Assegna un contatto come Genitore tramite ContattiDialog.
   * Cerca nel testo degli item del dropdown per email o nome.
   * Non usa fallback — se non trova il match, il test deve fallire.
   */
  async assignGenitore(searchTerm) {
    const select = this.contattiDialog.locator('.q-select:has(.q-field__label:has-text("Cerca contatto"))')
    const input = select.locator('input')

    await input.click()
    await this.page.waitForTimeout(500)
    await input.type(searchTerm, { delay: 50 })
    await this.page.waitForTimeout(3000)

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

  /**
   * Assegna un contatto come Referente tramite AssegnaFamigliaDialog.
   */
  async assignReferente(searchTerm, fullName) {
    const dialog = this.page.locator('.q-dialog:has(.text-h6:has-text("Associa a famiglia"))')
    await dialog.waitFor({ state: 'visible', timeout: 5000 })

    const roleSelect = dialog.locator('.q-select').first()
    await roleSelect.click()
    await this.page.waitForTimeout(500)
    await this.page.locator('.q-item:has-text("Referente")').click()
    await this.page.waitForTimeout(500)

    const famigliaSelect = dialog.locator('.q-select:has(.q-field__label:has-text("Aggiungi famiglia"))')
    const famigliaInput = famigliaSelect.locator('input')
    await famigliaInput.click()
    await this.page.waitForTimeout(500)
    await famigliaInput.type(searchTerm, { delay: 50 })
    await this.page.waitForTimeout(3000)

    const firstItem = this.page.locator('.q-menu .q-item').first()
    await firstItem.waitFor({ state: 'visible', timeout: 5000 })
    await firstItem.click()
    await this.page.waitForTimeout(300)

    await dialog.locator('button:has-text("Assegna")').click()
    await this.page.waitForTimeout(1000)
  }

  /**
   * Check if a name is already in the ContattiDialog list.
   */
  async isInList(fullName) {
    const dialog = this.contattiDialog
    const items = dialog.locator('.q-table tbody tr')
    const count = await items.count()
    for (let i = 0; i < count; i++) {
      const text = await items.nth(i).innerText()
      if (text.includes(fullName)) return true
    }
    return false
  }

  /**
   * Remove a contact from a family via the delete button in ContattiDialog/AssegnaFamigliaDialog.
   */
  async removeFromFamiglia(_fullName) {
    const dialog = this.page.locator('.q-dialog:visible')
    const rows = dialog.locator('.q-table tbody tr')
    const count = await rows.count()
    for (let i = 0; i < count; i++) {
      const text = await rows.nth(i).innerText()
      if (text.includes(fullName)) {
        await rows.nth(i).locator('.q-btn:has-text("delete")').click()
        await this.page.waitForTimeout(1000)
        return true
      }
    }
    return false
  }
}
