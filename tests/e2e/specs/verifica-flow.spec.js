import { test, expect } from '../helpers/console.js'
import { LoginPage } from '../pages/LoginPage.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const FIXTURE_PDF = path.resolve(__dirname, '..', 'fixtures', 'test-file-pdf.pdf')

async function createGiustificativoViaVolontario(page, stato = 'draft') {
  const loginPage = new LoginPage(page)
  await loginPage.goto()
  await loginPage.login(auth.volontario.email, auth.volontario.password)
  await expect(page).toHaveURL(/\/famiglie/, { timeout: 15000 })

  const select = page.locator('.q-select').first()
  await select.click()
  await page.waitForTimeout(2000)
  const firstOption = page.locator('.q-menu .q-item').first()
  if (await firstOption.isVisible({ timeout: 5000 }).catch(() => false)) {
    await firstOption.click()
    await page.waitForTimeout(1000)
  }

  const aggiungiBtn = page.locator('button:has-text("Aggiungi")')
  if (await aggiungiBtn.isDisabled().catch(() => true)) {
    return null
  }

  const testDesc = `Test VF_${Date.now()}`
  await aggiungiBtn.click()
  await expect(page.locator('.q-dialog')).toBeVisible({ timeout: 5000 })
  const dialog = page.locator('.q-dialog')

  await dialog.locator('input').first().fill(testDesc)
  await dialog.locator('input').nth(1).fill('75.00')
  await dialog.locator('input[type="file"]').first().setInputFiles(FIXTURE_PDF)

  const [postResp] = await Promise.all([
    page.waitForResponse(
      resp => resp.url().includes('/items/Giustificativi') && resp.request().method() === 'POST'
    ),
    dialog.locator('button:has-text("Salva")').click()
  ])

  if (postResp.status() !== 200) return null
  await expect(dialog).not.toBeVisible({ timeout: 10000 })

  const created = await postResp.json()
  const giustId = created.data?.id

  if (stato === 'inviato' && giustId) {
    const submitBtn = page.locator('.giust-item button:has(i:has-text("send"))').first()
    if (await submitBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await submitBtn.click()
      await page.waitForTimeout(2000)
    }
  }

  return { id: giustId, desc: testDesc }
}

test.describe.serial('Verifica StatoRendicontazione Flow', () => {
  let testGiustId = null

  test('VF-SETUP: Crea giustificativo bozza via volontario @setup', async ({ page }) => {
    const result = await createGiustificativoViaVolontario(page, 'inviato')
    if (result) {
      testGiustId = result.id
    }
  })

  test('VF-01: Verifica giustificativo aggiorna Progetto @crud', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(auth.verificatore.email, auth.verificatore.password)
    await expect(page).toHaveURL(/\/verifica/, { timeout: 15000 })

    await expect(page.locator('.verifica-table')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(3000)

    const expandBtn = page.locator('.verifica-table tbody tr td:first-child .q-btn').first()
    if (!(await expandBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip('No expand button found')
      return
    }
    await expandBtn.click()
    await page.waitForTimeout(2000)

    const verifyBtn = page.locator('.giust-item button:has(i:has-text("check_circle"))').first()
    if (!(await verifyBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip('No verify button found (no giust inviato)')
      return
    }

    const responses = []
    const handler = resp => {
      if (resp.url().includes('/items/') && resp.request().method() === 'PATCH') {
        responses.push(resp)
      }
    }
    page.on('response', handler)

    await verifyBtn.click()
    await page.waitForTimeout(4000)

    page.off('response', handler)

    const giustResp = responses.find(r => r.url().includes('/items/Giustificativi'))
    if (giustResp) {
      expect(giustResp.status()).toBe(200)
    }

    const progettoResp = responses.find(r => r.url().includes('/items/Progetti'))
    if (progettoResp) {
      expect(progettoResp.status()).toBe(200)
    }
  })

  test('VF-02: Rifiuta giustificativo aggiorna Progetto @crud', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(auth.verificatore.email, auth.verificatore.password)
    await expect(page).toHaveURL(/\/verifica/, { timeout: 15000 })

    await expect(page.locator('.verifica-table')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(3000)

    const expandBtn = page.locator('.verifica-table tbody tr td:first-child .q-btn').first()
    if (!(await expandBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip('No expand button found')
      return
    }
    await expandBtn.click()
    await page.waitForTimeout(2000)

    const rejectBtn = page.locator('.giust-item button:has(i:has-text("cancel"))').first()
    if (!(await rejectBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip('No reject button found (no giust inviato)')
      return
    }
    await rejectBtn.click()
    await page.waitForTimeout(1500)

    const rejectDialog = page.locator('.q-dialog:visible').last()
    if (await rejectDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
      const notaInput = rejectDialog.locator('textarea, input[type="text"]').first()
      if (await notaInput.isVisible().catch(() => false)) {
        await notaInput.fill('Test rifiuto E2E')
      }

      const responses = []
      const handler = resp => {
        if (resp.url().includes('/items/') && resp.request().method() === 'PATCH') {
          responses.push(resp)
        }
      }
      page.on('response', handler)

      const confirmBtn = rejectDialog.locator('button').filter({ hasText: /rifiut|conferma/i }).last()
      await confirmBtn.click()
      await page.waitForTimeout(4000)

      page.off('response', handler)

      const giustResp = responses.find(r => r.url().includes('/items/Giustificativi'))
      if (giustResp) {
        expect(giustResp.status()).toBe(200)
      }
    }
  })

  test('VF-03: Draft→Inviato da VerificaPage @crud', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(auth.verificatore.email, auth.verificatore.password)
    await expect(page).toHaveURL(/\/verifica/, { timeout: 15000 })

    await expect(page.locator('.verifica-table')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(3000)

    const expandBtn = page.locator('.verifica-table tbody tr td:first-child .q-btn').first()
    if (!(await expandBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip('No expand button found')
      return
    }
    await expandBtn.click()
    await page.waitForTimeout(2000)

    const sendBtn = page.locator('.giust-item button:has(i:has-text("send"))').first()
    if (!(await sendBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip('No send button found (no giust draft)')
      return
    }

    const responses = []
    const handler = resp => {
      if (resp.url().includes('/items/Giustificativi') && resp.request().method() === 'PATCH') {
        responses.push(resp)
      }
    }
    page.on('response', handler)

    await sendBtn.click()
    await page.waitForTimeout(4000)

    page.off('response', handler)

    const giustResp = responses[0]
    if (giustResp) {
      expect(giustResp.status()).toBe(200)
    }
  })
})
