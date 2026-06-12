import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const FIXTURE_PDF = path.resolve(__dirname, '..', 'fixtures', 'test-file-pdf.pdf')

/**
 * Crea un giustificativo dal dialog "Aggiungi" di FamigliePage.
 * Usa i data-testid del componente GiustificativoForm.
 *
 * @param {import('@playwright/test').Page} page
 * @param {Object} data
 * @param {string} data.descrizione
 * @param {number|string} data.importo
 * @param {string} [data.data] — YYYY-MM-DD format, defaults to today
 * @param {string} [data.nota]
 * @param {string} [data.file] — path to fixture file
 * @param {boolean} [data.submitAfter=false] — click "Invia" after creation
 * @returns {Promise<{id: string, desc: string}|null>}
 */
export async function createGiustificativoViaDialog(page, data = {}) {
  const testDesc = data.descrizione || `Test giust ${Date.now()}`

  const aggiungiBtn = page.locator('button:has-text("Aggiungi")')
  if (await aggiungiBtn.isDisabled().catch(() => true)) return null

  await aggiungiBtn.click()
  const dialog = page.locator('.q-dialog')
  await dialog.waitFor({ state: 'visible', timeout: 5000 })

  await dialog.locator('[data-testid="giustform-descrizione"]').fill(testDesc)
  await dialog.locator('[data-testid="giustform-importo"]').fill(String(data.importo || '50.00'))

  if (data.data) {
    await dialog.locator('[data-testid="giustform-data"]').fill(data.data)
  }

  if (data.nota) {
    await dialog.locator('[data-testid="giustform-nota"]').fill(data.nota)
  }

  const filePath = data.file || FIXTURE_PDF
  await dialog.locator('input[type="file"]').first().setInputFiles(filePath)

  const [postResp] = await Promise.all([
    page.waitForResponse(resp => resp.url().includes('/items/Giustificativi') && resp.request().method() === 'POST'),
    dialog.locator('[data-testid="giustform-salva"]').click()
  ])

  if (postResp.status() !== 200) return null
  await dialog.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {})

  const created = await postResp.json()
  const giustId = created?.data?.id

  if (data.submitAfter && giustId) {
    const sendBtn = page.locator('.giust-item button:has(i:has-text("send"))').first()
    if (await sendBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await sendBtn.click()
      await page.waitForTimeout(2000)
    }
  }

  return { id: giustId, desc: testDesc }
}
