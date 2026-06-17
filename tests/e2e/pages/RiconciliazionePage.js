export class RiconciliazionePage {
  constructor(page) {
    this.page = page
  }

  async goto() {
    await this.page.goto('/riconciliazione', { timeout: 15000 })
    await this.waitForTable()
  }

  get table() {
    return this.page.locator('.q-table')
  }

  get tableRows() {
    return this.page.locator('.q-table tbody tr')
  }

  get rowLocator() {
    return this.page.locator('.q-table tbody tr, .q-expansion-item')
  }

  get riconciliaBtn() {
    return this.page.locator('button:has-text("Riconcilia")').filter({ hasNot: this.page.locator('[disabled]') })
  }

  async waitForTable() {
    await this.page.waitForFunction(() => {
      const tr = document.querySelector('.q-table tbody tr')
      const exp = document.querySelector('.q-expansion-item')
      return !!(tr || exp)
    }, { timeout: 30000 }).catch(() => {})
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
    return await this.rowLocator.count()
  }

  async expandRow(index) {
    const row = this.rowLocator.nth(index)
    if (await row.locator('.q-expansion-item--expanded').count() === 0) {
      await row.click()
      await this.page.waitForTimeout(500)
    }
  }

  async getTotalItems() {
    const text = await this.page.locator('.q-table__bottom').innerText()
    const match = text.match(/di\s+(\d+)/)
    return match ? parseInt(match[1], 10) : 0
  }
}
