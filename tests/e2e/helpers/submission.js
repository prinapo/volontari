import { SubmitPage } from '../pages/SubmitPage.js'

export async function createTestSubmission(page, { email, descrizione } = {}) {
  const testEmail = email || `test_riconciliazione_${Date.now()}@test.com`
  const testDescrizione = descrizione || `Test submission ${Date.now()}`

  const submitPage = new SubmitPage(page)
  await submitPage.goto()
  await page.waitForTimeout(1000)

  await submitPage.fillForm({
    nome_richiedente: 'Test',
    cognome_richiedente: 'Submission',
    email: testEmail,
    telefono: '1234567890',
    iban: 'IT60X12345678901234567890',
    intestatario: 'Test Intestatario',
    nome_beneficiario: 'Luigi',
    cognome_beneficiario: 'Rossi'
  })

  await submitPage.clickAddGiustificativo()
  await page.waitForTimeout(300)

  await submitPage.fillGiustificativo(0, {
    descrizione: testDescrizione,
    importo: 100
  })

  await submitPage.clickSubmit()
  await submitPage.waitForSuccess()

  return { email: testEmail, descrizione: testDescrizione }
}
