import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect } from '@playwright/test'
import { espandiGiustificativi } from './pagina-famiglie.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const FIXTURE_PDF = path.resolve(__dirname, '..', 'fixtures', 'test-file-pdf.pdf')

/**
 * Invia un giustificativo dalla card della FamigliePage e attende la PATCH che
 * lo porta a `inviato`. Deterministico: se la card o il bottone "Invia" non
 * compaiono, il test FALLISCE (niente click saltato in silenzio).
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} giustId
 * @param {{timeout?: number}} [opts]
 * @returns {Promise<import('@playwright/test').Response>}
 */
export async function inviaGiustificativo(page, giustId, { timeout = 15_000 } = {}) {
  const card = page.locator(`[data-testid="giustificativo-card-${giustId}"]`)
  await expect(card).toBeVisible({ timeout })

  const inviaBtn = card.locator('button:has-text("Invia")')
  await expect(inviaBtn).toBeVisible({ timeout })

  const [resp] = await Promise.all([
    page.waitForResponse(
      r => r.url().includes(`/items/Giustificativi/${giustId}`) && r.request().method() === 'PATCH',
      { timeout }
    ),
    inviaBtn.click()
  ])

  expect(resp.status()).toBe(200)
  const body = resp.request().postData() ? JSON.parse(resp.request().postData()) : null
  expect(body?.Stato, 'PATCH invio non imposta Stato=inviato').toBe('inviato')
  await page.waitForLoadState('networkidle').catch(() => {})
  return resp
}

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

  await espandiGiustificativi(page)

  const aggiungiBtn = page.locator('button:has-text("Aggiungi")')
  await expect(aggiungiBtn).toBeEnabled({ timeout: 15_000 })

  await aggiungiBtn.scrollIntoViewIfNeeded()
  await page.waitForLoadState('networkidle').catch(() => {})
  await aggiungiBtn.dispatchEvent('click')
  await page.waitForLoadState('networkidle').catch(() => {})
  const dialog = page.locator('.q-dialog:visible')
  await dialog.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {})

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
  await dialog.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {})

  const created = await postResp.json()
  const giustId = created?.data?.id

  if (data.submitAfter && giustId) {
    await page.waitForLoadState('networkidle').catch(() => {})
    await inviaGiustificativo(page, giustId)
  }

  return { id: giustId, desc: testDesc }
}
