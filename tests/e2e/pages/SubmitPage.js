import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export class SubmitPage {
  constructor(page) {
    this.page = page
    this.testFilePath = resolve(__dirname, '../fixtures/test-file-pdf.pdf')
  }

  async goto() {
    await this.page.goto('/submit')
  }

  get tornaAlLoginLink() {
    return this.page.locator('a:has-text("Torna al login")')
  }

  get chiSeiCard() {
    return this.page.locator('.q-card').first()
  }

  get beneficiarioCard() {
    return this.page.locator('.q-card').nth(1)
  }

  giustificativoCard(index) {
    return this.page.locator('.q-card:has(.text-subtitle2)').nth(index)
  }

  _fieldByLabel(parent, label) {
    return parent
      .locator('.q-field')
      .filter({ has: this.page.locator(`.q-field__label:text-is("${label}")`) })
      .locator('input, textarea')
  }

  get nomeRichiedente() {
    return this._fieldByLabel(this.chiSeiCard, 'Nome *')
  }

  get cognomeRichiedente() {
    return this._fieldByLabel(this.chiSeiCard, 'Cognome *')
  }

  get emailInput() {
    return this._fieldByLabel(this.chiSeiCard, 'Email *')
  }

  get telefonoInput() {
    return this._fieldByLabel(this.chiSeiCard, 'Telefono *')
  }

  get ibanInput() {
    return this._fieldByLabel(this.chiSeiCard, 'IBAN *')
  }

  get intestatarioInput() {
    return this._fieldByLabel(this.chiSeiCard, 'Intestatario CC *')
  }

  get nomeBeneficiario() {
    return this._fieldByLabel(this.beneficiarioCard, 'Nome *')
  }

  get cognomeBeneficiario() {
    return this._fieldByLabel(this.beneficiarioCard, 'Cognome *')
  }

  get addGiustificativoBtn() {
    return this.page.locator('button:has-text("Aggiungi giustificativo")')
  }

  get submitBtn() {
    return this.page.locator('button[type="submit"]')
  }

  get successNotification() {
    return this.page.locator('.q-notification.bg-positive')
  }

  get form() {
    return this.page.locator('form')
  }

  getDescrizioneInput(index = 0) {
    return this._fieldByLabel(this.giustificativoCard(index), 'Descrizione *')
  }

  getImportoInput(index = 0) {
    return this._fieldByLabel(this.giustificativoCard(index), 'Importo (€) *')
  }

  getDataInput(index = 0) {
    return this._fieldByLabel(this.giustificativoCard(index), 'Data *')
  }

  getFileInput(index = 0) {
    return this.giustificativoCard(index).locator('input[type="file"]').first()
  }

  getGiustificativoTitle(index) {
    return this.page.locator(`.text-subtitle2:has-text("Giustificativo #${index + 1}")`)
  }

  async giustificativoCount() {
    return this.page.locator('text=Giustificativo #').count()
  }

  getDeleteBtn(index = 0) {
    return this.giustificativoCard(index).locator('.q-btn').filter({ hasText: 'delete' })
  }

  async fillForm(data) {
    await this.nomeRichiedente.fill(data.nome_richiedente)
    await this.cognomeRichiedente.fill(data.cognome_richiedente)
    await this.emailInput.fill(data.email)
    if (data.telefono) await this.telefonoInput.fill(data.telefono)
    await this.ibanInput.fill(data.iban)
    await this.intestatarioInput.fill(data.intestatario)
    await this.nomeBeneficiario.fill(data.nome_beneficiario)
    await this.cognomeBeneficiario.fill(data.cognome_beneficiario)
  }

  async fillGiustificativo(index, data) {
    await this.getDescrizioneInput(index).fill(data.descrizione)
    await this.getImportoInput(index).fill(String(data.importo))
    if (data.data) {
      const input = this.getDataInput(index)
      await input.evaluate((el, date) => {
        el.value = date
        el.dispatchEvent(new Event('input', { bubbles: true }))
      }, data.data)
    }
    const filePath = data.file || this.testFilePath
    await this.getFileInput(index).setInputFiles(filePath)
  }

  async clickTornaAlLogin() {
    await this.tornaAlLoginLink.click()
  }
  async clickAddGiustificativo() {
    await this.addGiustificativoBtn.click()
  }
  async clickDeleteGiustificativo(index) {
    await this.getDeleteBtn(index).click()
  }
  async clickSubmit() {
    await this.submitBtn.scrollIntoViewIfNeeded()
    await this.submitBtn.click()
  }

  async waitForSuccess() {
    await this.successNotification.waitFor({ state: 'visible', timeout: 30000 })
  }

  async waitForFormReset() {
    await this.page.waitForFunction(
      () => {
        const inputs = document.querySelectorAll('.q-field input')
        return inputs.length > 0 && Array.from(inputs).every(i => i.value === '')
      },
      { timeout: 10000 }
    )
  }

  async getFormValues() {
    return {
      nome_richiedente: await this.nomeRichiedente.inputValue(),
      cognome_richiedente: await this.cognomeRichiedente.inputValue(),
      email: await this.emailInput.inputValue(),
      telefono: await this.telefonoInput.inputValue(),
      iban: await this.ibanInput.inputValue(),
      intestatario: await this.intestatarioInput.inputValue(),
      nome_beneficiario: await this.nomeBeneficiario.inputValue(),
      cognome_beneficiario: await this.cognomeBeneficiario.inputValue()
    }
  }

  async getGiustificativoValues(index) {
    return {
      descrizione: await this.getDescrizioneInput(index).inputValue(),
      importo: await this.getImportoInput(index).inputValue(),
      data: await this.getDataInput(index).inputValue()
    }
  }
}
