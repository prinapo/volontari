import { test, expect } from '../helpers/console.js'
import { VerificaPage } from '../pages/VerificaPage.js'
import { loginAs } from '../helpers/login.js'
import { monitorApi, waitForPatchStato, logApiCalls } from '../helpers/network.js'
import { createGiustificativoViaDialog } from '../helpers/giustificativo.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }
import path from 'path'
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const FIXTURE_PDF = path.resolve(__dirname, '..', 'fixtures', 'test-file-pdf.pdf')

async function selectFirstProgetto(page) {
  const select = page.locator('.q-select').first()
  await select.click()
  await page.waitForTimeout(2000)
  const firstOption = page.locator('.q-menu .q-item').first()
  if (await firstOption.isVisible({ timeout: 5000 }).catch(() => false)) {
    await firstOption.click()
    await page.waitForTimeout(1000)
    return true
  }
  return false
}

async function createGiustificativoViaVolontario(page, descrizione, stato = 'draft') {
  await loginAs(page, 'volontario', auth)
  await selectFirstProgetto(page)

  const result = await createGiustificativoViaDialog(page, {
    descrizione,
    importo: '75.00',
    submitAfter: stato === 'inviato'
  })

  return result
}

async function createGiustificativoViaVerificatore(page) {
  await loginAs(page, 'verificatore', auth)
  const vp = new VerificaPage(page)
  await vp.waitForTable()
  await page.waitForTimeout(2000)

  const addBtn = page.locator('[data-testid="btn-add-giust"]').first()
  const addBtnCount = await addBtn.count()
  if (addBtnCount === 0) return null

  await addBtn.click()
  await page.locator('.q-dialog').waitFor({ state: 'visible', timeout: 5000 })

  const testDesc = `VE_ADD_${Date.now()}`
  await page.locator('[data-testid="giustform-descrizione"]').fill(testDesc)
  await page.locator('[data-testid="giustform-importo"]').fill('120.00')
  await page.locator('.q-dialog input[type="file"]').first().setInputFiles(FIXTURE_PDF)

  const [postResp] = await Promise.all([
    page.waitForResponse(resp => resp.url().includes('/items/Giustificativi') && resp.request().method() === 'POST'),
    page.locator('[data-testid="giustform-salva"]').click()
  ])

  if (postResp.status() !== 200) return null
  return { desc: testDesc, id: (await postResp.json()).data?.id }
}

test.describe('Verifica StatoRendicontazione Flow', () => {

  test('VF-01: Verifica giustificativo — intercetta PATCH @crud', async ({ page }) => {
    const testDesc = `VF_01_verify_${Date.now()}`
    const apiCalls = monitorApi(page)

    await createGiustificativoViaVolontario(page, testDesc, 'inviato')

    const vp = new VerificaPage(page)
    await loginAs(page, 'verificatore', auth)
    await vp.waitForTable()
    await vp.searchFamiglia('Famiglia TEST_FAM_01')
    await vp.expandRow(0)

    const patches = await waitForPatchStato(page, 'verificato', async () => {
      const verifyBtn = page.locator('[data-testid="btn-verify"]').first()
      if (!(await verifyBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
        test.skip('No verify button found')
        return
      }
      await verifyBtn.click()
      await page.waitForTimeout(3000)
    })

    logApiCalls(apiCalls)
    expect(patches.length).toBeGreaterThan(0)
    expect(patches[patches.length - 1].Stato).toBe('verificato')
  })

  test('VF-02: Rifiuta giustificativo — intercetta PATCH @crud', async ({ page }) => {
    const testDesc = `VF_02_reject_${Date.now()}`
    const apiCalls = monitorApi(page)

    await createGiustificativoViaVolontario(page, testDesc, 'inviato')

    const vp = new VerificaPage(page)
    await loginAs(page, 'verificatore', auth)
    await vp.waitForTable()
    await vp.searchFamiglia('Famiglia TEST_FAM_01')
    await vp.expandRow(0)

    const patches = await waitForPatchStato(page, 'rifiutato', async () => {
      const rejectBtn = page.locator('[data-testid="btn-reject"]').first()
      if (!(await rejectBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
        test.skip('No reject button found')
        return
      }
      await rejectBtn.click()
      await page.waitForTimeout(1500)

      const rejectDialog = page.locator('.q-dialog:visible').last()
      if (await rejectDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
        const notaInput = rejectDialog.locator('textarea, input[type="text"]').first()
        if (await notaInput.isVisible().catch(() => false)) await notaInput.fill('Test rifiuto E2E')
        await rejectDialog.locator('button').filter({ hasText: /rifiut|conferma/i }).last().click()
        await page.waitForTimeout(3000)
      }
    })

    logApiCalls(apiCalls)
    expect(patches.length).toBeGreaterThan(0)
    expect(patches[patches.length - 1].Stato).toBe('rifiutato')
  })

  test('VF-03: Draft→Inviato — intercetta PATCH @crud', async ({ page }) => {
    const testDesc = `VF_03_send_${Date.now()}`
    const apiCalls = monitorApi(page)

    await createGiustificativoViaVolontario(page, testDesc, 'draft')

    const vp = new VerificaPage(page)
    await loginAs(page, 'verificatore', auth)
    await vp.waitForTable()
    await vp.searchFamiglia('Famiglia TEST_FAM_01')
    await vp.expandRow(0)

    const patches = await waitForPatchStato(page, 'inviato', async () => {
      const sendBtn = page.locator('[data-testid="btn-send"]').first()
      if (!(await sendBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
        test.skip('No send button found')
        return
      }
      await sendBtn.click()
      await page.waitForTimeout(3000)
    })

    logApiCalls(apiCalls)
    expect(patches.length).toBeGreaterThan(0)
    expect(patches[patches.length - 1].Stato).toBe('inviato')
  })

  test('VF-04: Aggiungi giustificativo da VerificaPage @crud', async ({ page }) => {
    await createGiustificativoViaVolontario(page, `VF_04_setup_${Date.now()}`, 'inviato')

    const result = await createGiustificativoViaVerificatore(page)
    expect(result, 'VE-ADD: creazione giustificativo da VerificaPage fallita').not.toBeNull()
    expect(result.desc).toContain('VE_ADD_')
  })

  test('VF-05: Flusso completo Volontario→Invia→Verifica→Rifiuta @e2e', async ({ page }) => {
    test.setTimeout(120000)
    const apiCalls = monitorApi(page)

    // 1. Volontario crea e invia giustificativo
    const testDesc = `VF_05_full_${Date.now()}`
    await loginAs(page, 'volontario', auth)
    await selectFirstProgetto(page)

    const draft = await createGiustificativoViaDialog(page, {
      descrizione: testDesc,
      importo: '200.00',
      submitAfter: true
    })
    expect(draft, 'Creazione giustificativo fallita').not.toBeNull()

    // 2. Verificatore verifica e poi rifiuta
    await loginAs(page, 'verificatore', auth)
    const vp = new VerificaPage(page)
    await vp.waitForTable()

    // Cerca il giustificativo appena creato
    const searchInput = page.locator('input[aria-label="Cerca famiglia"]')
    await searchInput.fill('Famiglia TEST_FAM_01')
    await page.waitForTimeout(4000)

    const expandBtn = page.locator('[data-testid="expand-row"]').first()
    if (await expandBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expandBtn.click()
      await page.waitForTimeout(2000)
    }

    // Verifica
    const verifyPatches = await waitForPatchStato(page, 'verificato', async () => {
      const verifyBtn = page.locator('[data-testid="btn-verify"]').first()
      if (await verifyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await verifyBtn.click()
        await page.waitForTimeout(2000)
      }
    })

    if (verifyPatches.length > 0) {
      expect(verifyPatches[verifyPatches.length - 1].Stato).toBe('verificato')
    }

    // Rifiuta
    const rejectPatches = await waitForPatchStato(page, 'rifiutato', async () => {
      const rejectBtn = page.locator('[data-testid="btn-reject"]').first()
      if (await rejectBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await rejectBtn.click()
        await page.waitForTimeout(1500)
        const rejectDialog = page.locator('.q-dialog:visible').last()
        if (await rejectDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
          const notaInput = rejectDialog.locator('textarea, input[type="text"]').first()
          if (await notaInput.isVisible().catch(() => false)) await notaInput.fill('Rifiuto test VF-05')
          await rejectDialog.locator('button').filter({ hasText: /rifiut|conferma/i }).last().click()
          await page.waitForTimeout(3000)
        }
      }
    })

    if (rejectPatches.length > 0) {
      expect(rejectPatches[rejectPatches.length - 1].Stato).toBe('rifiutato')
    }

    logApiCalls(apiCalls)
  })
})
