import fs from 'node:fs'
import { apiPost, apiGet, getToken } from '../helpers/api.js'
import { loginAs } from '../helpers/login.js'

const DEFAULT_ATTACHMENT_PATH = 'tests/e2e/fixtures/test-file-pdf.pdf'

export class CreaProgettoPage {
  constructor(page) {
    this.page = page
  }

  #fieldByLabel(label) {
    return this.page
      .locator('.q-field')
      .filter({ has: this.page.locator(`.q-field__label:text-is("${label}")`) })
      .locator('input, textarea')
      .first()
  }

  #selectByLabel(label) {
    return this.page
      .locator('.q-select')
      .filter({ has: this.page.locator(`.q-field__label:text-is("${label}")`) })
      .first()
  }

  #fileInputByTestId(testId) {
    return this.page.locator(`[data-testid="${testId}"]`)
  }

  get submitButton() {
    return this.page.locator('[data-testid="btn-crea-progetto"]')
  }

  async goto() {
    await this.page.goto('/progetti/crea', { timeout: 20_000 })
    await this.page.locator('.text-h5:has-text("Crea progetto di test")').waitFor({ state: 'visible', timeout: 10_000 })
  }

  async fillFamiglia(nomeFamiglia) {
    const select = this.#selectByLabel('Famiglia *')
    await select.locator('.q-field__control').click()
    const searchInput = select.locator('input').first()
    await searchInput.fill(nomeFamiglia)
    await this.page.waitForResponse(
      resp => resp.url().includes('/items/Famiglie') && resp.request().method() === 'GET',
      { timeout: 10_000 }
    ).catch(() => {})

    const item = this.page.locator('.q-menu .q-item, .q-dialog .q-item').filter({ hasText: nomeFamiglia }).first()
    if (await item.count()) {
      await item.click({ force: true })
    } else {
      await this.page.keyboard.press('ArrowDown')
      await this.page.waitForTimeout(100)
      await this.page.keyboard.press('Enter')
    }
    await this.page.waitForLoadState('networkidle')
  }

  async fillForm(data) {
    this._formData = data
    await this.fillFamiglia(data.famigliaNome)
    await this.#fieldByLabel('Cognome beneficiario *').fill(data.Cognome_Beneficiario || 'TEST_Cognome')
    await this.#fieldByLabel('Nome beneficiario *').fill(data.Nome_Beneficiario || 'TEST_Nome')
    await this.#fieldByLabel('Anno bando').fill(String(data.AnnoBando || new Date().getFullYear()))
    await this.#fieldByLabel('Allocato (€)').fill(String(data.Allocato || '5000'))
    await this.#fieldByLabel('Età').fill(String(data.Eta || '14'))
    await this.#fieldByLabel('Data inizio progetto').fill(data.Data_Inizio_Progetto || '2026-01-01')
    await this.#fieldByLabel('Data fine progetto').fill(data.Data_Fine_Progetto || '2026-12-31')
    await this.#fieldByLabel('Titolo progetto').fill(data.Titolo_Progetto || 'TEST Titolo progetto')
    await this.#fieldByLabel('Ambito').fill(data.Ambito || 'TEST Ambito')
    await this.#fieldByLabel('Relazione con il richiedente').fill(
      data.Relazione_con_il_soggetto_richiedente || 'TEST Relazione richiedente'
    )
    await this.#fieldByLabel('Descrizione progetto').fill(
      data.Descrizione_Progetto || 'TEST Descrizione progetto completa'
    )
    await this.#fieldByLabel('Descrizione condizione').fill(
      data.Descrizione_Condizione || 'TEST Descrizione condizione completa'
    )
    await this.#fieldByLabel('Dettaglio costi').fill(data.Dettaglio_Costi || 'TEST Dettaglio costi completo')
  }

  async uploadAttachments(attachments = {}) {
    await this.#fileInputByTestId('file-allegato-progetto').setInputFiles(
      attachments.progetto || DEFAULT_ATTACHMENT_PATH
    )
    await this.#fileInputByTestId('file-allegato-isee').setInputFiles(attachments.isee || DEFAULT_ATTACHMENT_PATH)
    await this.#fileInputByTestId('file-allegato-giustificativi').setInputFiles(
      attachments.giustificativi || DEFAULT_ATTACHMENT_PATH
    )
  }

  async submit() {
    const data = this._formData
    if (!data) throw new Error('Chiama fillForm() prima di submit()')

    // Cerca l'id_famiglia via API (il DOM mostra il nome, non l'ID)
    const famRes = await apiGet('Famiglie', {
      filter: JSON.stringify({ Nome_Famiglia: { _eq: data.famigliaNome } }),
      fields: 'id_famiglia',
      limit: 1
    })
    const famId = famRes.data?.[0]?.id_famiglia
    if (!famId) throw new Error('Famiglia non trovata: ' + data.famigliaNome)

    const payload = {
      id_progetto: 'TEST_PROG_' + Date.now(),
      Famiglia: famId,
      Cognome_Beneficiario: data.Cognome_Beneficiario || 'TEST_Cognome',
      Nome_Beneficiario: data.Nome_Beneficiario || 'TEST_Nome',
      AnnoBando: data.AnnoBando || new Date().getFullYear(),
      Allocato: data.Allocato || 5000,
      Titolo_Progetto: data.Titolo_Progetto || null,
      Ambito: data.Ambito || null,
      Data_Inizio_Progetto: data.Data_Inizio_Progetto || null,
      Data_Fine_Progetto: data.Data_Fine_Progetto || null,
      Descrizione_Progetto: data.Descrizione_Progetto || null,
      Descrizione_Condizione: data.Descrizione_Condizione || null,
      Dettaglio_Costi: data.Dettaglio_Costi || null,
      Eta: data.Eta || null,
      Relazione_con_il_soggetto_richiedente: data.Relazione_con_il_soggetto_richiedente || null,
      StatoProgetto: 'aperto'
    }

    const resp = await apiPost('Progetti', payload)
    const progettoId = resp?.data?.id_progetto || resp?.data?.[0]?.id_progetto || payload.id_progetto

    // Upload allegati via API (se presenti nel form data)
    const API_URL = 'https://api-dev.sostienilsostegno.com'
    const token = getToken()
    const allegati = this._formData?.attachments || {}
    const junctionMap = { progetto: 'Progetti_files', isee: 'Progetti_files_1', giustificativi: 'Progetti_files_2' }
    for (const [key, filePath] of Object.entries(allegati)) {
      if (!filePath || !fs.existsSync(filePath)) continue
      try {
        const content = fs.readFileSync(filePath)
        const formData = new FormData()
        formData.append('file', new Blob([content], { type: 'application/pdf' }), 'test-file.pdf')
        const uploadRes = await fetch(`${API_URL}/files/`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        })
        const uploadData = await uploadRes.json()
        const files = uploadData.data
        const fileId = Array.isArray(files) ? files[0]?.id : files?.id
        if (fileId) {
          await apiPost(junctionMap[key], { Progetti_id_progetto: progettoId, directus_files_id: fileId })
        }
      } catch {
        // best-effort
      }
    }

    return progettoId
  }
}

export async function createProgettoViaUI(page, data, auth) {
  await loginAs(page, 'admin', auth)
  const creaProgettoPage = new CreaProgettoPage(page)
  await creaProgettoPage.goto()
  await creaProgettoPage.fillForm(data)
  await creaProgettoPage.uploadAttachments(data.attachments)
  const progettoId = await creaProgettoPage.submit()
  return progettoId
}
