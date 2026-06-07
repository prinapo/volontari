export class RiconciliazionePage {
  constructor(page) {
    this.page = page
  }

  async goto() {
    await this.page.goto('/riconciliazione', { timeout: 15000 })
    await this.page.waitForTimeout(2000)
  }

  get table() {
    return this.page.locator('.q-table')
  }

  get tableRows() {
    return this.page.locator('.q-table tbody tr')
  }

  get riconciliaBtn() {
    return this.page.locator('button:has-text("Riconcilia")').filter({ hasNot: this.page.locator('[disabled]') })
  }

  async getRowBadgeText(rowIndex = 0) {
    return await this.tableRows.nth(rowIndex).locator('.q-badge').first().innerText()
  }

  async clickRiconcilia(rowIndex = 0) {
    const btn = this.tableRows.nth(rowIndex).locator('.q-td:last-child .q-btn').filter({ has: this.page.locator('i:text-is("fact_check")') }).first()
    await btn.click()
  }

  async waitForTable() {
    await this.table.waitFor({ state: 'visible', timeout: 15000 })
    await this.page.waitForTimeout(1000)
  }

  get dialog() {
    return this.page.locator('.q-dialog').filter({ hasText: 'Riconcilia giustificativo' })
  }

  async waitForDialog() {
    await this.dialog.waitFor({ state: 'visible', timeout: 5000 })
  }

  async closeDialog() {
    await this.dialog.locator('button:has-text("Annulla")').click()
    await this.dialog.waitFor({ state: 'hidden', timeout: 3000 })
  }

  async getNomeFamigliaText() {
    return await this.dialog.locator('text=Nome Famiglia:').locator('..').innerText()
  }

  async getRowCount() {
    return await this.tableRows.count()
  }

  async getTotalItems() {
    const text = await this.page.locator('.q-table__bottom').innerText()
    const match = text.match(/di\s+(\d+)/)
    return match ? parseInt(match[1], 10) : 0
  }
}
