import { SubmitPage } from '../pages/SubmitPage.js'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

export async function createTestSubmission(page, { email, descrizione } = {}) {
  const testEmail = email || `test_riconciliazione_${Date.now()}@test.com`
  const testDescrizione = descrizione || `Test submission ${Date.now()}`

  try {
    await page.evaluate(() => localStorage.clear())
  } catch {
    await page.goto('/login')
    await page.evaluate(() => localStorage.clear())
  }
  await page.waitForLoadState("networkidle").catch(() => {})

  const submitPage = new SubmitPage(page)
  await submitPage.goto()
  await page.waitForLoadState("networkidle").catch(() => {})

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
  await page.waitForLoadState("networkidle").catch(() => {})

  await submitPage.fillGiustificativo(0, {
    descrizione: testDescrizione,
    importo: 100,
    file: resolve(dirname(fileURLToPath(import.meta.url)), '../fixtures/test-file-pdf.pdf')
  })

  const [postResp] = await Promise.all([
    page.waitForResponse(
      resp => resp.url().includes('/items/InviiGiustificativiNoLogin') && resp.request().method() === 'POST'
    ),
    submitPage.clickSubmit()
  ])
  await submitPage.waitForSuccess()
  let subId = null
  try {
    const respData = await postResp.json()
    subId = respData?.data?.id || respData?.data?.[0]?.id
  } catch {
    /* postResp body vuoto */
  }

  return { email: testEmail, descrizione: testDescrizione, id: subId }
}
