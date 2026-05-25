export class FamigliePage {
  constructor(page) {
    this.page = page
    this.projectSelector = page.locator('.q-select')
    this.giustificativiCards = page.locator('.q-card:has(.text-caption)')
  }

  async goto() {
    await this.page.goto('/famiglie')
  }

  async selectProjectByIndex(index = 0) {
    await this.projectSelector.click()
    await this.page.locator('.q-item').nth(index).click()
  }

  async getGiustificativoCount() {
    return this.giustificativiCards.count()
  }
}
