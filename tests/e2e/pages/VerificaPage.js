export class VerificaPage {
  constructor(page) {
    this.page = page
  }

  get table() {
    return this.page.locator('.verifica-table')
  }

  get rows() {
    return this.table.locator('tbody tr:has(td .q-btn), .q-expansion-item')
  }

  get searchInput() {
    return this.page.locator('input[aria-label="Cerca famiglia"]')
  }

  async goto() {
    await this.page.goto('/verifica')
  }

  async waitForTable() {
    await this.table.waitFor({ state: 'visible', timeout: 15000 })
    // Wait for actual data rows to load (desktop: tbody tr, mobile: .q-expansion-item)
    await this.page.waitForFunction(() => {
      const table = document.querySelector('.verifica-table')
      if (!table) return false
      if (table.classList.contains('q-table--grid')) {
        return table.querySelectorAll('.q-expansion-item').length > 0
      }
      return table.querySelectorAll('tbody tr').length > 0
    }, { timeout: 15000 }).catch(() => {})
  }

  async getRowCount() {
    return await this.rows.count()
  }

  async searchFamiglia(text) {
    const input = this.searchInput
    const count = await input.count()
    if (count > 0) {
      try {
        await input.fill(text, { timeout: 3000 })
      } catch {
        try {
          await input.fill(text, { force: true, timeout: 3000 })
        } catch {
          // fallback: set value via evaluate
          await this.page.evaluate(t => {
            const inp = document.querySelector('input[aria-label="Cerca famiglia"]')
            if (!inp) return
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
            nativeSetter.call(inp, t)
            inp.dispatchEvent(new Event('input', { bubbles: true }))
            inp.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }))
          }, text)
        }
      }
    } else {
      // No input found at all — set via evaluate
      await this.page.evaluate(t => {
        const inp = document.querySelector('input[aria-label="Cerca famiglia"]')
        if (!inp) return
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
        nativeSetter.call(inp, t)
        inp.dispatchEvent(new Event('input', { bubbles: true }))
        inp.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }))
      }, text)
    }

    // Wait for Quasar debounce and search API call(s) to complete
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    await this.page.waitForFunction(searchText => {
      const table = document.querySelector('.verifica-table')
      if (!table) return true
      const isGrid = table.classList.contains('q-table--grid')
      if (isGrid && table.querySelectorAll('.q-expansion-item').length > 0) {
        const items = table.querySelectorAll('.q-expansion-item')
        for (const item of items) {
          if (item.textContent.includes(searchText)) return true
        }
      }
      if (!isGrid && table.querySelectorAll('tbody tr').length > 0) return true
      return document.body.innerText.includes('Nessun dato disponibile')
    }, text, { timeout: 10000 }).catch(() => {})
  }

  async expandRow(index = 0) {
    const expandBtn = this.page.locator('[data-testid="expand-row"]').nth(index)
    if ((await expandBtn.count()) > 0) {
      await expandBtn.click()
    } else {
      // Su mobile: click sull'expansion item
      const expItem = this.page.locator('.q-expansion-item').nth(index)
      if ((await expItem.count()) > 0) {
        await expItem.click()
      }
    }

    const isGrid = await this.page.locator('.q-table--grid').count() > 0
    if (!isGrid) {
      await this.page
        .locator('.expandable-content')
        .first()
        .waitFor({ state: 'visible', timeout: 5000 })
        .catch(() => {
          console.log('[VerificaPage] expandable-content not found within timeout')
        })
    } else {
      await this.page.locator('.q-expansion-item--expanded').first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
    }
  }

  async getGiustificativiInRow(index = 0) {
    return this.rows.nth(index).locator('.giust-item')
  }

  async getStatoRiga(index = 0) {
    const badges = this.rows.nth(index).locator('.q-badge')
    const count = await badges.count()
    for (let i = 0; i < count; i++) {
      const text = await badges.nth(i).innerText()
      if (['Non ricevuta', 'Pronto', 'Da verificare', 'Da completare', 'Dati bancari mancanti'].includes(text)) {
        return text
      }
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
    if ((await editBtn.count()) > 0) {
      await editBtn.click()
      await this.page
        .locator('.q-dialog')
        .waitFor({ state: 'visible', timeout: 3000 })
        .catch(() => {})
      return true
    }
    return false
  }

  async copyRow(index = 0) {
    const copyBtn = this.page.locator('[data-testid="btn-copy-aspi"]').nth(index)
    if ((await copyBtn.count()) > 0) {
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
