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
    await this.page.waitForTimeout(1000)
  }

  async getRowCount() {
    return await this.rows.count()
  }

  async searchFamiglia(text) {
    const input = this.searchInput
    if (await input.isVisible({ timeout: 3000 }).catch(() => false)) {
      await input.fill(text)
      await this.page.waitForTimeout(4000)
    }
  }

  async expandRow(index = 0) {
    const expandBtn = this.rows.nth(index).locator('td').first().locator('.q-btn')
    await expandBtn.click()
    await this.page.waitForTimeout(2000)
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
    const editBtn = this.rows.nth(index).locator('.q-btn').filter({ has: this.page.locator('i:text-is("edit")') }).first()
    if (await editBtn.count() > 0) {
      await editBtn.click()
      await this.page.waitForTimeout(1000)
      return true
    }
    return false
  }

  async copyRow(index = 0) {
    const copyBtn = this.rows.nth(index).locator('.q-btn').filter({ has: this.page.locator('i:text-is("content_copy")') }).first()
    if (await copyBtn.count() > 0) {
      await copyBtn.click()
      await this.page.waitForTimeout(1000)
      return true
    }
    return false
  }

  async verifyGiustificativo(rowIndex = 0, giustIndex = 0) {
    const giustItem = this.rows.nth(rowIndex).locator('.giust-item').nth(giustIndex)
    const btn = giustItem.locator('button:has(i:has-text("check_circle"))')
    await btn.click()
    await this.page.waitForTimeout(1000)
  }

  async rejectGiustificativo(rowIndex = 0, giustIndex = 0) {
    const giustItem = this.rows.nth(rowIndex).locator('.giust-item').nth(giustIndex)
    const btn = giustItem.locator('button:has(i:has-text("cancel"))')
    await btn.click()
    await this.page.waitForTimeout(1000)
  }

  async sendGiustificativo(rowIndex = 0, giustIndex = 0) {
    const giustItem = this.rows.nth(rowIndex).locator('.giust-item').nth(giustIndex)
    const btn = giustItem.locator('button:has(i:has-text("send"))')
    await btn.click()
    await this.page.waitForTimeout(1000)
  }
}
