import { loginAs } from '../helpers/login.js'

const DEFAULT_ATTACHMENT_PATH = 'tests/e2e/fixtures/test-file-pdf.pdf'

export class CreaProgettoPage {
  constructor(page) {
    this.page = page
  }

  _fieldByLabel(label) {
    return this.page
      .locator('.q-field')
      .filter({ has: this.page.locator(`.q-field__label:text-is("${label}")`) })
      .locator('input, textarea')
      .first()
  }

  _selectByLabel(label) {
    return this.page
      .locator('.q-select')
      .filter({ has: this.page.locator(`.q-field__label:text-is("${label}")`) })
      .first()
  }

  _fileInputByTestId(testId) {
    return this.page.locator(`[data-testid="${testId}"]`)
  }

  get submitButton() {
    return this.page.locator('[data-testid="btn-crea-progetto"]')
  }

  async goto() {
    await this.page.goto('/progetti/crea', { timeout: 20000 })
    await this.page.locator('.text-h5:has-text("Crea progetto di test")').waitFor({ state: 'visible', timeout: 10000 })
  }

  async fillFamiglia(nomeFamiglia) {
    const select = this._selectByLabel('Famiglia *')
    await select.locator('.q-field__control').click()
    await this.page.waitForTimeout(300)
    const searchInput = select.locator('input').first()
    await searchInput.fill(nomeFamiglia)
    await this.page.waitForTimeout(800)

    const item = this.page.locator('.q-menu .q-item, .q-dialog .q-item').filter({ hasText: nomeFamiglia }).first()
    if (await item.count()) {
      await item.click({ force: true })
    } else {
      await this.page.locator('[role="option"]').first().click({ force: true })
    }
    await this.page.waitForTimeout(300)
  }

  async fillForm(data) {
    await this.fillFamiglia(data.famigliaNome)
    await this._fieldByLabel('Cognome beneficiario *').fill(data.Cognome_Beneficiario || 'TEST_Cognome')
    await this._fieldByLabel('Nome beneficiario *').fill(data.Nome_Beneficiario || 'TEST_Nome')
    await this._fieldByLabel('Anno bando').fill(String(data.AnnoBando || new Date().getFullYear()))
    await this._fieldByLabel('Allocato (€)').fill(String(data.Allocato || '5000'))
    await this._fieldByLabel('Età').fill(String(data.Eta || '14'))
    await this._fieldByLabel('Data inizio progetto').fill(data.Data_Inizio_Progetto || '2026-01-01')
    await this._fieldByLabel('Data fine progetto').fill(data.Data_Fine_Progetto || '2026-12-31')
    await this._fieldByLabel('Titolo progetto').fill(data.Titolo_Progetto || 'TEST Titolo progetto')
    await this._fieldByLabel('Ambito').fill(data.Ambito || 'TEST Ambito')
    await this._fieldByLabel('Relazione con il richiedente').fill(
      data.Relazione_con_il_soggetto_richiedente || 'TEST Relazione richiedente'
    )
    await this._fieldByLabel('Descrizione progetto').fill(
      data.Descrizione_Progetto || 'TEST Descrizione progetto completa'
    )
    await this._fieldByLabel('Descrizione condizione').fill(
      data.Descrizione_Condizione || 'TEST Descrizione condizione completa'
    )
    await this._fieldByLabel('Dettaglio costi').fill(data.Dettaglio_Costi || 'TEST Dettaglio costi completo')
  }

  async uploadAttachments(attachments = {}) {
    await this._fileInputByTestId('file-allegato-progetto').setInputFiles(
      attachments.progetto || DEFAULT_ATTACHMENT_PATH
    )
    await this._fileInputByTestId('file-allegato-isee').setInputFiles(attachments.isee || DEFAULT_ATTACHMENT_PATH)
    await this._fileInputByTestId('file-allegato-giustificativi').setInputFiles(
      attachments.giustificativi || DEFAULT_ATTACHMENT_PATH
    )
    await this.page.waitForTimeout(300)
  }

  async submit() {
    const [postResp] = await Promise.all([
      this.page.waitForResponse(resp => resp.url().includes('/items/Progetti') && resp.request().method() === 'POST', {
        timeout: 15000
      }),
      this.submitButton.click()
    ])

    const body = await postResp.json()
    const progettoId = body?.data?.id_progetto

    await this.page.waitForURL(/\/admin/, { timeout: 20000 }).catch(() => {})
    await this.page.waitForTimeout(800)

    return progettoId
  }
}

export async function createProgettoViaUI(page, data, auth, returnRole) {
  await loginAs(page, 'admin', auth)
  const creaProgettoPage = new CreaProgettoPage(page)
  await creaProgettoPage.goto()
  await creaProgettoPage.fillForm(data)
  await creaProgettoPage.uploadAttachments(data.attachments)
  const progettoId = await creaProgettoPage.submit()
  if (returnRole) {
    await loginAs(page, returnRole, auth)
  }
  return progettoId
}
