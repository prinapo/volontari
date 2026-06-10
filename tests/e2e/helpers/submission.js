import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const TEST_PDF = resolve(__dirname, '..', 'fixtures', 'test-file-pdf.pdf')

export async function createTestSubmission(page, { email, nomeRichiedente, cognomeRichiedente, descrizione } = {}) {
  const testEmail = email || `test_riconciliazione_${Date.now()}@test.com`
  const testNome = nomeRichiedente || 'Test'
  const testCognome = cognomeRichiedente || 'Riconciliazione'
  const testDescrizione = descrizione || `Test submission ${Date.now()}`

  await page.goto('/submit')
  await page.waitForTimeout(1000)

  const chiSeiCard = page.locator('.q-card').first()
  const nomeInput = chiSeiCard.locator('.q-field').filter({ has: page.locator('.q-field__label:text-is("Nome *")') }).locator('input')
  const cognomeInput = chiSeiCard.locator('.q-field').filter({ has: page.locator('.q-field__label:text-is("Cognome *")') }).locator('input')
  const emailInput = chiSeiCard.locator('.q-field').filter({ has: page.locator('.q-field__label:text-is("Email *")') }).locator('input')
  const telefonoInput = chiSeiCard.locator('.q-field').filter({ has: page.locator('.q-field__label:text-is("Telefono *")') }).locator('input')
  const ibanInput = chiSeiCard.locator('.q-field').filter({ has: page.locator('.q-field__label:text-is("IBAN *")') }).locator('input')
  const intestatarioInput = chiSeiCard.locator('.q-field').filter({ has: page.locator('.q-field__label:text-is("Intestatario CC *")') }).locator('input')

  const beneficiarioCard = page.locator('.q-card').nth(1)
  const nomeBenInput = beneficiarioCard.locator('.q-field').filter({ has: page.locator('.q-field__label:text-is("Nome *")') }).locator('input')
  const cognomeBenInput = beneficiarioCard.locator('.q-field').filter({ has: page.locator('.q-field__label:text-is("Cognome *")') }).locator('input')

  await nomeInput.fill(testNome)
  await cognomeInput.fill(testCognome)
  await emailInput.fill(testEmail)
  await telefonoInput.fill('1234567890')
  await ibanInput.fill('IT60X12345678901234567890')
  await intestatarioInput.fill('Test Intestatario')
  await nomeBenInput.fill('Luigi')
  await cognomeBenInput.fill('Rossi')

  const addGiustBtn = page.locator('button:has-text("Aggiungi giustificativo")')
  await addGiustBtn.click()
  await page.waitForTimeout(300)

  const giustCard = page.locator('.q-card:has(.text-subtitle2)').first()
  const descInput = giustCard.locator('.q-field').filter({ has: page.locator('.q-field__label:text-is("Descrizione *")') }).locator('input, textarea')
  const importoInput = giustCard.locator('.q-field').filter({ has: page.locator('.q-field__label:text-is("Importo (€) *")') }).locator('input')
  const fileInput = giustCard.locator('.q-file input[type="file"]')

  await descInput.fill(testDescrizione)
  await importoInput.fill('100')
  await fileInput.setInputFiles(TEST_PDF)

  const submitBtn = page.locator('button[type="submit"]')
  await submitBtn.click()

  await page.locator('.q-notification.bg-positive').waitFor({ state: 'visible', timeout: 30000 })

  return { email: testEmail, descrizione: testDescrizione }
}
