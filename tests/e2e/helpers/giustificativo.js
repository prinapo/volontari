import { expect } from '@playwright/test'
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
  const testDesc = data.descrizione || `TEST_Giust_${Date.now()}`

  const aggiungiBtn = page.locator('button:has-text("Aggiungi")')
  await expect(aggiungiBtn).toBeEnabled({ timeout: 15000 })

  await aggiungiBtn.scrollIntoViewIfNeeded()
  await page.waitForLoadState("networkidle").catch(() => {})
  await aggiungiBtn.dispatchEvent('click')
  await page.waitForLoadState("networkidle").catch(() => {})
  const dialog = page.locator('.q-dialog:visible')
  await dialog.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {})

  await dialog.locator('[data-testid="giustform-descrizione"]').fill(testDesc)
  await dialog.locator('[data-testid="giustform-importo"]').fill(String(data.importo || '50.00'))

  if (data.data) {
    // Il campo data è readonly (q-date): usa evaluate per forzare il valore
    await dialog.locator('[data-testid="giustform-data"]').evaluate((el, val) => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
      setter.call(el, val)
      el.dispatchEvent(new Event('input', { bubbles: true }))
    }, data.data)
  }

  if (data.nota) {
    await dialog.locator('[data-testid="giustform-nota"]').fill(data.nota)
  }

  const filePath = data.file || FIXTURE_PDF
  await dialog.locator('input[type="file"]').first().setInputFiles(filePath)

  const salvaBtn = dialog.locator('[data-testid="giustform-salva"]')
  const [postResp] = await Promise.all([
    page.waitForResponse(resp => resp.url().includes('/items/Giustificativi') && resp.request().method() === 'POST'),
    salvaBtn.evaluate(el => el.click())
  ])

  expect(postResp.status()).toBe(200)
  await dialog.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {})

  const created = await postResp.json()
  const giustId = created?.data?.id

  if (data.submitAfter && giustId) {
    await page.waitForLoadState("networkidle").catch(() => {})
    const sendBtn = page.locator('[data-testid="giustificativo-card-' + giustId + '"] button:has-text("Invia")')
    if (await sendBtn.count().then(c => c > 0)) {
      const [patchResp] = await Promise.all([
        page.waitForResponse(resp => resp.url().includes('/items/Giustificativi/' + giustId) && resp.request().method() === 'PATCH').catch(() => null),
        sendBtn.evaluate(el => el.click())
      ])
    }
    await page.waitForLoadState("networkidle").catch(() => {})
  }

  return { id: giustId, desc: testDesc }
}
