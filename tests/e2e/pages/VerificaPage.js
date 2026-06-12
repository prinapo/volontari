export class VerificaPage {
  constructor(page) {
    this.page = page
  }

  get table() {
    return this.page.locator('.verifica-table')
  }

  get rows() {
    return this.table.locator('tbody tr:has(td .q-btn)')
  }

  get searchInput() {
    return this.page.locator('input[aria-label="Cerca famiglia"]')
  }

  async goto() {
    await this.page.goto('/verifica')
  }

  async waitForTable() {
    await this.table.waitFor({ state: 'visible', timeout: 15000 })
  }

  async getRowCount() {
    return await this.rows.count()
  }

  async searchFamiglia(text) {
    const input = this.searchInput
    if (!(await input.isVisible({ timeout: 3000 }).catch(() => false))) return

    await input.fill(text)

    await this.page.waitForResponse(
      resp => resp.url().includes('/items/Progetti') && resp.request().method() === 'GET',
      { timeout: 10000 }
    ).catch(() => {})

    await this.table.locator('tbody tr').first().waitFor({ state: 'attached', timeout: 5000 }).catch(() => {})
  }

  async expandRow(index = 0) {
    const expandBtn = this.page.locator('[data-testid="expand-row"]').nth(index)
    await expandBtn.click()

    await this.page.locator('.expandable-content').first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {
      console.log('[VerificaPage] expandable-content not found within timeout')
    })
  }

  async getGiustificativiInRow(index = 0) {
    return this.rows.nth(index).locator('.giust-item')
  }

  async getStatoRiga(index = 0) {
    const badge = this.rows.nth(index).locator('.q-badge').first()
    if (await badge.count() > 0) {
      return await badge.innerText()
    }
    return null
  }

  async getAllocato(index = 0) {
    return await this.rows.nth(index).locator('td').nth(4).innerText()
  }

  async getRendicontato(index = 0) {
    return await this.rows.nth(index).locator('td').nth(5).innerText()
  }

  async getRimborsabile(index = 0) {
    return await this.rows.nth(index).locator('td').nth(6).innerText()
  }

  async openBancariDialog(index = 0) {
    const editBtn = this.page.locator('[data-testid="btn-edit-bancari"]').nth(index)
    if (await editBtn.count() > 0) {
      await editBtn.click()
      await this.page.locator('.q-dialog').waitFor({ state: 'visible', timeout: 3000 }).catch(() => {})
      return true
    }
    return false
  }

  async copyRow(index = 0) {
    const copyBtn = this.page.locator('[data-testid="btn-copy-aspi"]').nth(index)
    if (await copyBtn.count() > 0) {
      await copyBtn.click()
      return true
    }
    return false
  }

  async verifyGiustificativo(rowIndex = 0, _giustIndex = 0) {
    const btn = this.page.locator('[data-testid="btn-verify"]').first()
    await btn.click()
  }

  async rejectGiustificativo(rowIndex = 0, _giustIndex = 0) {
    const btn = this.page.locator('[data-testid="btn-reject"]').first()
    await btn.click()
  }

  async sendGiustificativo(rowIndex = 0, _giustIndex = 0) {
    const btn = this.page.locator('[data-testid="btn-send"]').first()
    await btn.click()
  }
}
