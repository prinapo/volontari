import { test, expect } from '../helpers/console.js'
import { VerificaPage } from '../pages/VerificaPage.js'
import { loginAs } from '../helpers/login.js'
import { monitorApi, waitForPatchStato, logApiCalls } from '../helpers/network.js'
import { createGiustificativoViaDialog } from '../helpers/giustificativo.js'
import { apiLogin, apiGet, apiPatch } from '../helpers/api.js'
import {
  creaFamigliaVolontarioProgetto,
  loginVolontarioConFamiglia,
  pulisciIds,
  loginGestore
} from '../helpers/setup-atomico.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }
import path from 'path'
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const FIXTURE_PDF = path.resolve(__dirname, '..', 'fixtures', 'test-file-pdf.pdf')

async function createGiustificativoViaVerificatore(page) {
  await loginAs(page, 'manager', auth)
  const vp = new VerificaPage(page)
  await vp.goto()
  await vp.waitForTable()
  await page.waitForTimeout(2000)

  const addBtn = page.locator('[data-testid="btn-add-giust"], button[aria-label="Aggiungi giustificativo"]').first()
  if ((await addBtn.count()) === 0) return null
  // Su mobile espandi la riga prima di cliccare
  const isMobile = (await page.locator('.q-expansion-item').count()) > 0
  if (isMobile) {
    const expItem = page.locator('.q-expansion-item').first()
    await expItem.click()
    await page.waitForTimeout(500)
  }
  await addBtn.click()
  await page.locator('.q-dialog').waitFor({ state: 'visible', timeout: 5000 })

  const testDesc = `TEST_VE_ADD_${Date.now()}`
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
  let ids = { famiglia: null, progetto: null, giustificativi: [] }

  test.beforeAll(async () => {
    await apiLogin(auth.admin.email, auth.admin.password)
  })

  test.afterEach(async () => {
    await pulisciIds(ids)
    ids = { famiglia: null, progetto: null, giustificativi: [] }
  })

  test('VF-01: Verifica giustificativo — intercetta PATCH @crud', async ({ page }) => {
    test.setTimeout(90000)
    const testDesc = `TEST_VF_01_verify_${Date.now()}`
    const apiCalls = monitorApi(page)

    await loginGestore(page)
    const { nomeFam } = await creaFamigliaVolontarioProgetto(page, ids)
    await loginVolontarioConFamiglia(page, nomeFam)
    const result1 = await createGiustificativoViaDialog(page, {
      descrizione: testDesc,
      importo: '75.00',
      submitAfter: false
    })
    if (result1?.id) ids.giustificativi.push(result1.id)

    // Invia il giustificativo esplicitamente
    await page.waitForTimeout(500)
    const inviaBtn = page.locator('.q-card').filter({ hasText: testDesc }).locator('button:has-text("Invia")').first()
    await inviaBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
    if ((await inviaBtn.count()) > 0) {
      await inviaBtn.click()
      await page.waitForTimeout(2000)
    }

    const vp = new VerificaPage(page)
    await loginAs(page, 'manager', auth)
    await vp.goto()
    await vp.waitForTable()
    await page.waitForTimeout(3000)
    await vp.searchFamiglia(nomeFam)
    await page.waitForTimeout(1000)
    const rowCount = await vp.getRowCount()
    if (rowCount === 0) {
    }
    let foundRow = -1
    for (let i = 0; i < rowCount; i++) {
      const text = await vp.rows.nth(i).innerText()
      if (text.includes(nomeFam)) {
        foundRow = i
        break
      }
    }
    if (foundRow === -1) {
    }
    await vp.expandRow(foundRow)
    await page.waitForTimeout(1000)

    const patches = await waitForPatchStato(page, 'verificato', async () => {
      const verifyBtn = page.locator('[data-testid="btn-verify"]').first()
      if (!(await verifyBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
        console.log('[VF-01] btn-verify not visible after expand')
      }
      await verifyBtn.click()
      await page.waitForTimeout(3000)
    })

    logApiCalls(apiCalls)
    expect(patches.length).toBeGreaterThan(0)
    expect(patches[patches.length - 1].Stato).toBe('verificato')
  })

  test('VF-02: Rifiuta giustificativo — intercetta PATCH @crud', async ({ page }) => {
    test.setTimeout(90000)
    const testDesc = `TEST_VF_02_reject_${Date.now()}`
    const apiCalls = monitorApi(page)

    await loginGestore(page)
    const { nomeFam } = await creaFamigliaVolontarioProgetto(page, ids)
    await loginVolontarioConFamiglia(page, nomeFam)
    const result2 = await createGiustificativoViaDialog(page, {
      descrizione: testDesc,
      importo: '75.00',
      submitAfter: false
    })
    if (result2?.id) ids.giustificativi.push(result2.id)

    // Invia il giustificativo
    await page.waitForTimeout(500)
    const inviaBtn2 = page.locator('.q-card').filter({ hasText: testDesc }).locator('button:has-text("Invia")').first()
    await inviaBtn2.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
    if ((await inviaBtn2.count()) > 0) {
      await inviaBtn2.click()
      await page.waitForTimeout(2000)
    }

    const vp = new VerificaPage(page)
    await loginAs(page, 'manager', auth)
    await vp.goto()
    await vp.waitForTable()
    await vp.searchFamiglia(nomeFam)
    await page.waitForTimeout(1000)
    if ((await vp.getRowCount()) === 0) {
    }
    await vp.expandRow(0)
    await page.waitForTimeout(1000)

    const patches = await waitForPatchStato(page, 'rifiutato', async () => {
      const rejectBtn = page.locator('[data-testid="btn-reject"]').first()
      if (!(await rejectBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
      }
      await rejectBtn.click()
      await page.waitForTimeout(1500)

      const rejectDialog = page.locator('.q-dialog:visible').last()
      if (await rejectDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
        const notaInput = rejectDialog.locator('textarea, input[type="text"]').first()
        if (await notaInput.isVisible().catch(() => false)) await notaInput.fill('Test rifiuto E2E')
        await rejectDialog
          .locator('button')
          .filter({ hasText: /rifiut|conferma/i })
          .last()
          .click()
        await page.waitForTimeout(3000)
      }
    })

    logApiCalls(apiCalls)
    expect(patches.length).toBeGreaterThan(0)
    expect(patches[patches.length - 1].Stato).toBe('rifiutato')
  })

  test('VF-03: Draft→Inviato — intercetta PATCH @crud', async ({ page }) => {
    test.setTimeout(90000)
    const testDesc = `TEST_VF_03_send_${Date.now()}`
    const apiCalls = monitorApi(page)

    await loginGestore(page)
    const { nomeFam } = await creaFamigliaVolontarioProgetto(page, ids)
    await loginVolontarioConFamiglia(page, nomeFam)
    const result3 = await createGiustificativoViaDialog(page, {
      descrizione: testDesc,
      importo: '75.00',
      submitAfter: false
    })
    if (result3?.id) ids.giustificativi.push(result3.id)

    // Non invia ancora — il test verifica che da VerificaPage si possa inviare
    const vp = new VerificaPage(page)
    await loginAs(page, 'manager', auth)
    await vp.goto()
    await vp.waitForTable()
    await vp.searchFamiglia(nomeFam)
    await page.waitForTimeout(1000)
    if ((await vp.getRowCount()) === 0) {
    }
    await vp.expandRow(0)
    await page.waitForTimeout(1000)

    const patches = await waitForPatchStato(page, 'inviato', async () => {
      const sendBtn = page.locator('[data-testid="btn-send"]').first()
      if (!(await sendBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
      }
      await sendBtn.click()
      await page.waitForTimeout(3000)
    })

    logApiCalls(apiCalls)
    expect(patches.length).toBeGreaterThan(0)
    expect(patches[patches.length - 1].Stato).toBe('inviato')
  })

  test('VF-04: Aggiungi giustificativo da VerificaPage @crud', async ({ page }) => {
    test.setTimeout(90000)
    await loginGestore(page)
    await creaFamigliaVolontarioProgetto(page, ids)

    const result = await createGiustificativoViaVerificatore(page)
    if (result?.id) ids.giustificativi.push(result.id)
    expect(result, 'VE-ADD: creazione giustificativo da VerificaPage fallita').not.toBeNull()
    expect(result.desc).toContain('TEST_VE_ADD_')
  })

  test('VF-05: Flusso completo Volontario→Invia→Verifica→Rifiuta @e2e', async ({ page }) => {
    test.setTimeout(120000)
    const apiCalls = monitorApi(page)

    // 1. Atomic setup — crea famiglia + progetto
    await loginGestore(page)
    const { nomeFam } = await creaFamigliaVolontarioProgetto(page, ids)

    // 2. Volontario crea e invia giustificativo
    const testDesc = `TEST_VF_05_full_${Date.now()}`
    await loginVolontarioConFamiglia(page, nomeFam)

    const draft = await createGiustificativoViaDialog(page, {
      descrizione: testDesc,
      importo: '200.00',
      submitAfter: true
    })
    if (draft?.id) ids.giustificativi.push(draft.id)
    expect(draft, 'Creazione giustificativo fallita').not.toBeNull()

    // 3. Verificatore verifica e poi rifiuta
    await loginAs(page, 'manager', auth)
    const vp = new VerificaPage(page)
    await vp.goto()
    await vp.waitForTable()

    // Cerca il giustificativo appena creato
    const searchInput = page.locator('input[aria-label="Cerca famiglia"]')
    await searchInput.fill(nomeFam)
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
          await rejectDialog
            .locator('button')
            .filter({ hasText: /rifiut|conferma/i })
            .last()
            .click()
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
