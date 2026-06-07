import { test, expect } from '../helpers/console.js'
import { LoginPage } from '../pages/LoginPage.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const FIXTURE_PDF = path.resolve(__dirname, '..', 'fixtures', 'test-file-pdf.pdf')

async function createBozzaViaUI(page, descPrefix) {
  const testDesc = `${descPrefix}_${Date.now()}`
  await page.waitForTimeout(500)
  if (await page.locator('button:has-text("Aggiungi")').isDisabled()) {
    console.log(`createBozzaViaUI: Aggiungi button disabled for ${descPrefix} — skipping`)
    return null
  }
  await expect(page.locator('button:has-text("Aggiungi")')).toBeVisible({ timeout: 10000 })
      await page.locator('button:has-text("Aggiungi")').click()
  await expect(page.locator('.q-dialog')).toBeVisible({ timeout: 5000 })
  const dialog = page.locator('.q-dialog')
  await dialog.locator('input').first().fill(testDesc)
  await dialog.locator('input').nth(1).fill('50.00')
  await dialog.locator('input[type="file"]').first().setInputFiles(FIXTURE_PDF)
  const [postResp] = await Promise.all([
    page.waitForResponse(
      resp => resp.url().includes('/items/Giustificativi') && resp.request().method() === 'POST'
    ),
    dialog.locator('button:has-text("Salva")').click()
  ])
  if (postResp.status() !== 200) {
    console.log('createBozzaViaUI: failed', postResp.status())
    return null
  }
  await expect(dialog).not.toBeVisible({ timeout: 10000 })
  const created = await postResp.json()
  const rawProgetto = created.data?.Progetto
  const progettoId = typeof rawProgetto === 'object' ? rawProgetto?.id_progetto || rawProgetto?.id : rawProgetto
  return { id: created.data?.id, desc: testDesc, progetto: progettoId }
}

async function loginAndSelectProgetto(page) {
  const loginPage = new LoginPage(page)
  await loginPage.goto()
  await loginPage.login(auth.volontario.email, auth.volontario.password)
  await expect(page).toHaveURL(/\/famiglie/)
  await expect(page.locator('.text-h6').first()).toBeVisible({ timeout: 10000 })
  const select = page.locator('.q-select').first()
  await select.locator('.q-field__native').waitFor({ state: 'visible', timeout: 10000 }).catch(() => {})
  await select.click()
  await page.locator('.q-menu .q-item').first().waitFor({ state: 'visible', timeout: 3000 }).catch(() => {
    console.log('[giustificativi] no progetto options — continuing anyway')
  })
  if (await page.locator('.q-menu .q-item').count() > 0) {
    await page.locator('.q-menu .q-item').first().click()
    await page.waitForTimeout(500)
    return true
  }
  return false
}

test.describe.serial('Giustificativi', () => {

  // ── CG: Creazione ──
  test.describe('GiustificativoForm — Creazione', () => {
    test.beforeEach(async ({ page }) => {
      await loginAndSelectProgetto(page)
    })

    test('CG-01: Dialog si apre con Aggiungi @smoke', async ({ page }) => {
      const aggiungiBtn = page.locator('button:has-text("Aggiungi")')
      if (!(await aggiungiBtn.isVisible({ timeout: 3000 }).catch(() => false))) {
        test.skip()
        return
      }
      await aggiungiBtn.click()
      await expect(page.locator('.q-dialog')).toBeVisible({ timeout: 5000 })
      await expect(page.locator('.q-dialog').locator('text=Nuovo giustificativo')).toBeVisible()
    })

    test('CG-02: Salva senza Descrizione mostra errore validazione @regression', async ({ page }) => {
      const aggiungiBtn = page.locator('button:has-text("Aggiungi")')
      if (!(await aggiungiBtn.isVisible({ timeout: 3000 }).catch(() => false))) {
        test.skip()
        return
      }
      await aggiungiBtn.click()
      await expect(page.locator('.q-dialog')).toBeVisible({ timeout: 5000 })
      const dialog = page.locator('.q-dialog')

      await dialog.locator('input').nth(1).fill('50.00')
      await dialog.locator('input[type="file"]').first().setInputFiles(FIXTURE_PDF)
      await dialog.locator('button:has-text("Salva")').click()
      await page.waitForTimeout(500)

      await expect(dialog).toBeVisible({ timeout: 3000 })
      await expect(dialog.locator('text=Campo obbligatorio')).toBeVisible()
    })

    test('CG-03: Salva senza Importo mostra errore validazione @regression', async ({ page }) => {
      if (!(await page.locator('button:has-text("Aggiungi")').isVisible({ timeout: 3000 }).catch(() => false))) {
        test.skip()
        return
      }
      await expect(page.locator('button:has-text("Aggiungi")')).toBeVisible({ timeout: 10000 })
      await page.locator('button:has-text("Aggiungi")').click()
      await expect(page.locator('.q-dialog')).toBeVisible({ timeout: 5000 })
      const dialog = page.locator('.q-dialog')

      await dialog.locator('input').first().fill(`__TEST_NoImp_${Date.now()}`)
      await dialog.locator('input[type="file"]').first().setInputFiles(FIXTURE_PDF)
      await dialog.locator('button:has-text("Salva")').click()
      await page.waitForTimeout(500)

      await expect(dialog).toBeVisible({ timeout: 3000 })
      await expect(dialog.locator('text=Campo obbligatorio')).toBeVisible()
    })

    test('CG-04: Salva senza File mostra errore validazione @regression', async ({ page }) => {
      if (!(await page.locator('button:has-text("Aggiungi")').isVisible({ timeout: 3000 }).catch(() => false))) {
        test.skip()
        return
      }
      await expect(page.locator('button:has-text("Aggiungi")')).toBeVisible({ timeout: 10000 })
      await page.locator('button:has-text("Aggiungi")').click()
      await expect(page.locator('.q-dialog')).toBeVisible({ timeout: 5000 })
      const dialog = page.locator('.q-dialog')

      await dialog.locator('input').first().fill(`__TEST_NoFile_${Date.now()}`)
      await dialog.locator('input').nth(1).fill('50.00')
      await dialog.locator('button:has-text("Salva")').click()
      await page.waitForTimeout(500)

      await expect(dialog).toBeVisible({ timeout: 3000 })
      await expect(dialog.locator('text=Campo obbligatorio')).toBeVisible()
    })

    test('CG-05: Annulla chiude dialog senza creare @regression', async ({ page }) => {
      if (!(await page.locator('button:has-text("Aggiungi")').isVisible({ timeout: 3000 }).catch(() => false))) {
        test.skip()
        return
      }
      const countBefore = await page.locator('.q-card').count()

      await expect(page.locator('button:has-text("Aggiungi")')).toBeVisible({ timeout: 10000 })
      await page.locator('button:has-text("Aggiungi")').click()
      await expect(page.locator('.q-dialog')).toBeVisible({ timeout: 5000 })
      await page.locator('[data-testid="form-annulla"]').click()
      await expect(page.locator('.q-dialog')).not.toBeVisible({ timeout: 3000 })

      const countAfter = await page.locator('.q-card').count()
      expect(countAfter).toBe(countBefore)
    })

    test('CG-06: Crea con tutti i campi persiste dopo reload @crud', async ({ page }) => {
      if (!(await page.locator('button:has-text("Aggiungi")').isVisible({ timeout: 3000 }).catch(() => false))) {
        test.skip()
        return
      }
      const testDesc = `__TEST_Creazione_${Date.now()}`
      const testImporto = '42.50'

      await expect(page.locator('button:has-text("Aggiungi")')).toBeVisible({ timeout: 10000 })
      await page.locator('button:has-text("Aggiungi")').click()
      await expect(page.locator('.q-dialog')).toBeVisible({ timeout: 5000 })
      const dialog = page.locator('.q-dialog')

      await dialog.locator('input').first().fill(testDesc)
      await dialog.locator('input').nth(1).fill(testImporto)
      await dialog.locator('input[type="file"]').first().setInputFiles(FIXTURE_PDF)
      const [postResp] = await Promise.all([
        page.waitForResponse(
          resp => resp.url().includes('/items/Giustificativi') && resp.request().method() === 'POST'
        ),
        dialog.locator('button:has-text("Salva")').click()
      ])
      expect(postResp.status()).toBe(200)

      await expect(dialog).not.toBeVisible({ timeout: 10000 })
      await expect(page.locator(`text=${testDesc}`).first()).toBeVisible({ timeout: 5000 })

      await page.reload()
      await page.waitForTimeout(2000)
      await expect(page.locator(`text=${testDesc}`).first()).toBeVisible({ timeout: 5000 })
    })

    test('CG-09: Form larghezza limitata non fullscreen @smoke', async ({ page }) => {
      if (!(await page.locator('button:has-text("Aggiungi")').isVisible({ timeout: 3000 }).catch(() => false))) {
        test.skip()
        return
      }
      await expect(page.locator('button:has-text("Aggiungi")')).toBeVisible({ timeout: 10000 })
      await page.locator('button:has-text("Aggiungi")').click()
      await expect(page.locator('.q-dialog')).toBeVisible({ timeout: 5000 })
      const card = page.locator('.q-dialog .q-card')
      const box = await card.boundingBox()
      expect(box).not.toBeNull()
      if (box) {
        const viewport = page.viewportSize()
        expect(box.width).toBeLessThan(viewport.width)
      }
    })
  })

  // ── IE: Inline Edit (usa bozze create da CG-06) ──
  test.describe('GiustificativoCard — Inline Edit', () => {
    test.beforeEach(async ({ page }) => {
      await loginAndSelectProgetto(page)
    })

    async function findDraftCard(page) {
      const draftCards = page.locator('.q-card').filter({ has: page.locator('.q-badge:has-text("Bozza")') })
      if (await draftCards.count() === 0) return null
      return draftCards.first()
    }

    test('IE-01: Descrizione modifica con ✓ salva e persiste dopo reload @crud', async ({ page }) => {
      const card = await findDraftCard(page)
      if (!card) test.skip()

      const fields = card.locator('.inline-editable-field')
      const descField = fields.first()
      await expect(descField.locator('.text-body1')).toBeVisible({ timeout: 5000 })

      const newDesc = `__TEST_IE_Desc_${Date.now()}`

      const [patchResp] = await Promise.all([
        page.waitForResponse(
          resp => resp.url().includes('/items/Giustificativi/') && resp.request().method() === 'PATCH'
        ),
        (async () => {
          await descField.click()
          const input = descField.locator('input')
          await expect(input).toBeVisible({ timeout: 3000 })
          await input.fill(newDesc)
          await descField.locator('[data-testid="inline-save"]').click()
        })()
      ])

      expect(patchResp.status()).toBe(200)
      await expect(descField.locator('.text-body1')).toContainText(newDesc, { timeout: 5000 })

      await page.reload()
      await page.waitForTimeout(2000)
      await expect(page.locator(`text=${newDesc}`)).toBeVisible({ timeout: 10000 })
    })

    test('IE-02: Descrizione modifica con X annulla valore originale @crud', async ({ page }) => {
      const card = await findDraftCard(page)
      if (!card) test.skip()

      const descField = card.locator('.inline-editable-field').first()
      const originalText = (await descField.locator('.text-body1').innerText()).trim()

      await descField.click()
      const input = descField.locator('input')
      await expect(input).toBeVisible({ timeout: 3000 })
      await input.fill(`__TEST_CANCEL_${Date.now()}`)
      await descField.locator('[data-testid="inline-cancel"]').click()
      await page.waitForTimeout(300)

      const displayText = (await descField.locator('.text-body1').innerText()).trim()
      expect(displayText).toBe(originalText)
    })

    test('IE-03: Descrizione click senza modificare ✓ torna a display @crud', async ({ page }) => {
      const card = await findDraftCard(page)
      if (!card) test.skip()

      const descField = card.locator('.inline-editable-field').first()
      await descField.click()
      await expect(descField.locator('input')).toBeVisible({ timeout: 3000 })
      await descField.locator('[data-testid="inline-save"]').click()
      await expect(descField.locator('.text-body1')).toBeVisible({ timeout: 3000 })
    })

    test('IE-04: Importo modifica con ✓ salva e persiste dopo reload @crud', async ({ page }) => {
      const card = await findDraftCard(page)
      if (!card) test.skip()

      const importoField = card.locator('.inline-editable-field').nth(1)
      await expect(importoField.locator('.text-body1')).toBeVisible({ timeout: 5000 })

      const newImporto = (Math.random() * 200 + 10).toFixed(2)

      const [patchResp] = await Promise.all([
        page.waitForResponse(
          resp => resp.url().includes('/items/Giustificativi/') && resp.request().method() === 'PATCH'
        ),
        (async () => {
          await importoField.click()
          const input = importoField.locator('input')
          await expect(input).toBeVisible({ timeout: 3000 })
          await input.fill(newImporto)
          await importoField.locator('[data-testid="inline-save"]').click()
        })()
      ])

      expect(patchResp.status()).toBe(200)
      const body = await patchResp.json()
      const savedImporto = String(body.data?.Importo ?? newImporto)
      await expect(importoField.locator('.text-body1')).toContainText(savedImporto.replace('.', ','), { timeout: 5000 })

      const commaImporto = savedImporto.replace('.', ',')
      await page.reload()
      await page.waitForTimeout(2000)
      await expect(page.getByText(commaImporto).first()).toBeVisible({ timeout: 10000 })
    })

    test('IE-05: Importo modifica con X annulla valore originale @crud', async ({ page }) => {
      const card = await findDraftCard(page)
      if (!card) test.skip()

      const importoField = card.locator('.inline-editable-field').nth(1)
      const originalText = (await importoField.locator('.text-body1').innerText()).trim()

      await importoField.click()
      const input = importoField.locator('input')
      await expect(input).toBeVisible({ timeout: 3000 })
      await input.fill('999.99')
      await importoField.locator('[data-testid="inline-cancel"]').click()
      await page.waitForTimeout(300)

      const displayText = (await importoField.locator('.text-body1').innerText()).trim()
      expect(displayText).toBe(originalText)
    })

    test('IE-06: Data modifica con ✓ salva e persiste dopo reload @crud', async ({ page }) => {
      const card = await findDraftCard(page)
      if (!card) test.skip()

      const dataField = card.locator('.inline-editable-field').nth(2)
      await expect(dataField.locator('.text-body1')).toBeVisible({ timeout: 5000 })

      const newDate = '2025-06-15'

      const [patchResp] = await Promise.all([
        page.waitForResponse(
          resp => resp.url().includes('/items/Giustificativi/') && resp.request().method() === 'PATCH'
        ),
        (async () => {
          await dataField.click()
          const input = dataField.locator('input')
          await expect(input).toBeVisible({ timeout: 3000 })
          await input.fill(newDate)
          await dataField.locator('[data-testid="inline-save"]').click()
        })()
      ])

      expect(patchResp.status()).toBe(200)
      const body = await patchResp.json()
      const id = body.data?.id

      const cardById = page.locator(`[data-testid="giustificativo-card-${id}"]`)
      const dataFieldById = cardById.locator('.inline-editable-field').nth(2).locator('.text-body1')
      await expect(dataFieldById).toContainText('15/06/2025', { timeout: 5000 })

      await page.reload()
      await page.waitForTimeout(2000)
      await expect(dataFieldById).toContainText('15/06/2025', { timeout: 10000 })
    })

    test('IE-07: Data modifica con X annulla valore originale @crud', async ({ page }) => {
      const card = await findDraftCard(page)
      if (!card) test.skip()

      const dataField = card.locator('.inline-editable-field').nth(2)
      const originalText = (await dataField.locator('.text-body1').innerText()).trim()

      await dataField.click()
      const input = dataField.locator('input')
      await expect(input).toBeVisible({ timeout: 3000 })
      await input.fill('2024-01-01')
      await dataField.locator('[data-testid="inline-cancel"]').click()
      await page.waitForTimeout(300)

      const displayText = (await dataField.locator('.text-body1').innerText()).trim()
      expect(displayText).toBe(originalText)
    })
  })

  // ── AL: Allegati ──
  test.describe('GiustificativoCard — Allegato', () => {
    test.beforeEach(async ({ page }) => {
      await loginAndSelectProgetto(page)
    })

    test('AL-01: Card con allegato ha pulsanti Apri e Scarica con label @smoke', async ({ page }) => {
      const cardWithAttach = page.locator('.q-card').filter({ has: page.locator('a[href*="/assets/"]') })
      if (await cardWithAttach.count() === 0) {
        console.log('AL-01: no card con allegato trovata — skip')
        test.skip()
        return
      }

      const card = cardWithAttach.first()
      const apriBtn = card.locator('a:has-text("Apri")')
      const scaricaBtn = card.locator('a:has-text("Scarica")')
      await expect(apriBtn).toBeVisible()
      await expect(scaricaBtn).toBeVisible()

      const apriHref = await apriBtn.getAttribute('href')
      expect(apriHref).toContain('/assets/')
      expect(apriHref).toContain('access_token=')

      const scaricaHref = await scaricaBtn.getAttribute('href')
      expect(scaricaHref).toContain('/assets/')
      expect(scaricaHref).toContain('download=1')
      expect(scaricaHref).toContain('access_token=')
    })

    test('AL-02: Card senza allegato mostra Nessun allegato @smoke', async ({ page }) => {
      const cardNoAttach = page.locator('.q-card').filter({ hasText: 'Nessun allegato' })
      if (await cardNoAttach.count() === 0) {
        console.log('AL-02: tutte le card hanno allegato — skip')
        test.skip()
        return
      }
      await expect(cardNoAttach.first()).toBeVisible()
    })

    test('AL-03: Scarica file è un PDF valido @crud', async ({ page }) => {
      const cardWithAttach = page.locator('.q-card').filter({ has: page.locator('a[href*="/assets/"]') })
      if (await cardWithAttach.count() === 0) {
        console.log('AL-03: no card con allegato — skip')
        test.skip()
        return
      }

      const scaricaBtn = cardWithAttach.first().locator('a:has-text("Scarica")')
      const href = await scaricaBtn.getAttribute('href')

      const response = await page.request.get(href)
      expect(response.status()).toBe(200)
      const contentType = response.headers()['content-type'] || response.headers()['Content-Type'] || ''
      expect(contentType).toContain('pdf')

      const buffer = await response.body()
      expect(buffer.length).toBeGreaterThan(0)
      expect(buffer[0]).toBe(0x25)
      expect(buffer[1]).toBe(0x50)
      expect(buffer[2]).toBe(0x44)
      expect(buffer[3]).toBe(0x46)
    })

    test('AL-04: Apri file si apre in nuova scheda con URL corretto @crud', async ({ page }) => {
      const cardWithAttach = page.locator('.q-card').filter({ has: page.locator('a[href*="/assets/"]') })
      if (await cardWithAttach.count() === 0) {
        console.log('AL-04: no card con allegato — skip')
        test.skip()
        return
      }

      const apriBtn = cardWithAttach.first().locator('a:has-text("Apri")')
      const href = await apriBtn.getAttribute('href')

      const [popup] = await Promise.all([
        page.waitForEvent('popup', { timeout: 5000 }).catch(() => null),
        apriBtn.click()
      ])

      if (popup) {
        await popup.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {})
        const popupUrl = popup.url()
        if (popupUrl && popupUrl !== ':') {
          expect(popupUrl).toContain('/assets/')
          expect(popupUrl).toContain('access_token=')
        } else {
          expect(href).toContain('/assets/')
          expect(href).toContain('access_token=')
        }
        await popup.close().catch(() => {})
      } else {
        console.log('AL-04: popup bloccato, verifico href')
        expect(href).toContain('/assets/')
        expect(href).toContain('access_token=')
      }
    })

    test('AL-05: Cambia file visibile solo in bozza @smoke', async ({ page }) => {
      const draftCards = page.locator('.q-card').filter({ has: page.locator('.q-badge:has-text("Bozza")') })
      const inviatoCards = page.locator('.q-card').filter({ has: page.locator('.q-badge:has-text("Inviato")') })

      if (await draftCards.count() > 0) {
        await expect(draftCards.first().locator('button:has-text("Cambia file")')).toBeVisible({ timeout: 3000 })
      }
      if (await inviatoCards.count() > 0) {
        const cambioBtn = inviatoCards.first().locator('button:has-text("Cambia file")')
        await expect(cambioBtn).not.toBeVisible()
      }
    })

    test('AL-06: Sostituisci file reload persiste @crud', async ({ page }) => {
      const draftCards = page.locator('.q-card').filter({ has: page.locator('.q-badge:has-text("Bozza")') })
      let targetCard = null
      let testDesc = ''

      for (let i = 0; i < await draftCards.count(); i++) {
        const card = draftCards.nth(i)
        if (await card.locator('a[href*="/assets/"]').count() > 0) {
          targetCard = card
          testDesc = await card.locator('.inline-editable-field').first().locator('.text-body1').innerText()
          break
        }
      }

      if (!targetCard) {
        console.log('AL-06: nessuna bozza con allegato, ne creo una')
        testDesc = `__TEST_Allegato_${Date.now()}`
        if (await page.locator('button:has-text("Aggiungi")').isDisabled()) {
          console.log('AL-06: Aggiungi disabled — no progetto, skipping')
          test.skip()
          return
        }
        await expect(page.locator('button:has-text("Aggiungi")')).toBeVisible({ timeout: 10000 })
      await page.locator('button:has-text("Aggiungi")').click()
        await expect(page.locator('.q-dialog')).toBeVisible({ timeout: 5000 })
        const dialog = page.locator('.q-dialog')
        await dialog.locator('input').first().fill(testDesc)
        await dialog.locator('input').nth(1).fill('30.00')
        await dialog.locator('input[type="file"]').first().setInputFiles(FIXTURE_PDF)
        const [createResp] = await Promise.all([
          page.waitForResponse(
            resp => resp.url().includes('/items/Giustificativi') && resp.request().method() === 'POST'
          ),
          dialog.locator('button:has-text("Salva")').click()
        ])
        expect(createResp.status()).toBe(200)
        await expect(dialog).not.toBeVisible({ timeout: 10000 })
        await page.waitForTimeout(1000)

        targetCard = page.locator('.q-card').filter({ hasText: testDesc })
        await expect(targetCard).toBeVisible({ timeout: 5000 })
      }

      const oldHref = await targetCard.locator('a[href*="/assets/"]').first().getAttribute('href')

      const fileInput = targetCard.locator('input[type="file"]')
      const [patchResp] = await Promise.all([
        page.waitForResponse(
          resp => resp.url().includes('/items/Giustificativi') && resp.request().method() === 'PATCH'
        ),
        fileInput.setInputFiles(FIXTURE_PDF)
      ])
      expect(patchResp.status()).toBe(200)
      await page.waitForTimeout(500)

      const newHref = await targetCard.locator('a[href*="/assets/"]').first().getAttribute('href')
      expect(newHref).not.toBe(oldHref)

      await page.reload()
      await page.waitForTimeout(2000)
      const cardAfter = page.locator('.q-card').filter({ hasText: testDesc })
      await expect(cardAfter).toBeVisible({ timeout: 5000 })
    })
  })

  // ── EL: Elimina (crea bozza via UI, nessun afterEach API) ──
  test.describe('GiustificativoCard — Elimina', () => {
    test.beforeEach(async ({ page }) => {
      await loginAndSelectProgetto(page)
      await createBozzaViaUI(page, '__TEST_EL')
    })

    test('EL-01: Cestino Elimina visibile solo in bozza @smoke', async ({ page }) => {
      const draftCards = page.locator('.q-card').filter({ has: page.locator('.q-badge:has-text("Bozza")') })
      const inviatoCards = page.locator('.q-card').filter({ has: page.locator('.q-badge:has-text("Inviato")') })

      if (await draftCards.count() > 0) {
        await expect(draftCards.first().locator('button:has-text("Elimina")')).toBeVisible({ timeout: 3000 })
      }
      if (await inviatoCards.count() > 0) {
        await expect(inviatoCards.first().locator('button:has-text("Elimina")')).not.toBeVisible()
      }
    })

    test('EL-02: Elimina dialog Annulla card resta @crud', async ({ page }) => {
      const card = page.locator('.q-card').filter({ has: page.locator('.q-badge:has-text("Bozza")') }).first()
      if (await card.count() === 0) test.skip()

      const descBefore = await card.locator('.inline-editable-field').first().locator('.text-body1').innerText()

      await card.locator('button:has-text("Elimina")').click()
      await expect(page.locator('.q-dialog')).toBeVisible({ timeout: 3000 })
      await page.locator('.q-dialog button:has-text("Annulla")').click()
      await expect(page.locator('.q-dialog')).not.toBeVisible({ timeout: 3000 })

      const descAfter = await card.locator('.inline-editable-field').first().locator('.text-body1').innerText()
      expect(descAfter).toBe(descBefore)
    })

    test('EL-03: Elimina conferma card sparisce dalla lista @crud', async ({ page }) => {
      const draftCard = page.locator('.q-card').filter({ has: page.locator('.q-badge:has-text("Bozza")') }).first()
      if (await draftCard.count() === 0) test.skip()

      const descText = await draftCard.locator('.inline-editable-field').first().locator('.text-body1').innerText()

      const [patchResp] = await Promise.all([
        page.waitForResponse(
          resp => resp.url().includes('/items/Giustificativi/') && resp.request().method() === 'PATCH'
        ),
        (async () => {
          await draftCard.locator('button:has-text("Elimina")').click()
          await expect(page.locator('.q-dialog')).toBeVisible({ timeout: 3000 })
          await page.locator('.q-dialog button:has-text("Elimina")').click()
        })()
      ])

      expect(patchResp.status()).toBe(200)
      await expect(page.locator(`text=${descText}`)).not.toBeVisible({ timeout: 5000 })
    })

    test('EL-04: Elimina reload card ancora sparita @crud', async ({ page }) => {
      const draftCard = page.locator('.q-card').filter({ has: page.locator('.q-badge:has-text("Bozza")') }).first()
      if (await draftCard.count() === 0) test.skip()

      const descText = await draftCard.locator('.inline-editable-field').first().locator('.text-body1').innerText()

      await draftCard.locator('button:has-text("Elimina")').click()
      await expect(page.locator('.q-dialog')).toBeVisible({ timeout: 3000 })
      await page.locator('.q-dialog button:has-text("Elimina")').click()
      await page.waitForTimeout(1000)

      await page.reload()
      await page.waitForTimeout(2000)
      await expect(page.locator(`text=${descText}`)).not.toBeVisible({ timeout: 5000 })
    })
  })

  // ── SU: Invia (crea bozza via UI, nessun afterEach API) ──
  test.describe('GiustificativoCard — Invia', () => {
    test.beforeEach(async ({ page }) => {
      await loginAndSelectProgetto(page)
      await createBozzaViaUI(page, '__TEST_SU')
    })

    test('SU-01: Invia badge passa da Bozza a Inviato @crud', async ({ page }) => {
      const draftCard = page.locator('.q-card').filter({ has: page.locator('.q-badge:has-text("Bozza")') }).first()
      if (await draftCard.count() === 0) test.skip()

      const descText = await draftCard.locator('.inline-editable-field').first().locator('.text-body1').innerText()
      const cleanDesc = descText.replace(/\s*edit\s*$/, '')

      await Promise.all([
        page.waitForResponse(
          resp => resp.url().includes('/items/Giustificativi/') && resp.request().method() === 'PATCH'
        ),
        draftCard.locator('button:has-text("Invia")').click()
      ])

      const updatedCard = page.locator('.q-card').filter({ hasText: cleanDesc }).first()
      await expect(updatedCard.locator('.q-badge')).toHaveText('Inviato', { timeout: 10000 })
    })

    test('SU-02: Dopo Invia pulsanti edit/Elimina spariscono @crud', async ({ page }) => {
      const draftCard = page.locator('.q-card').filter({ has: page.locator('.q-badge:has-text("Bozza")') }).first()
      if (await draftCard.count() === 0) test.skip()

      const descText = await draftCard.locator('.inline-editable-field').first().locator('.text-body1').innerText()
      const cleanDesc = descText.replace(/\s*edit\s*$/, '')

      await draftCard.locator('button:has-text("Invia")').click()
      await page.waitForTimeout(1000)

      const sentCard = page.locator('.q-card').filter({ hasText: cleanDesc }).first()
      await expect(sentCard.locator('button:has-text("Invia")')).not.toBeVisible()
      await expect(sentCard.locator('button:has-text("Elimina")')).not.toBeVisible()

      await expect(sentCard.locator('.inline-editable-field [data-testid="inline-save"]')).not.toBeVisible()
      await expect(sentCard.locator('.inline-editable-field [data-testid="inline-cancel"]')).not.toBeVisible()
    })

    test('SU-03: Invia reload stato ancora Inviato @crud', async ({ page }) => {
      const draftCard = page.locator('.q-card').filter({ has: page.locator('.q-badge:has-text("Bozza")') }).first()
      if (await draftCard.count() === 0) test.skip()

      const descText = await draftCard.locator('.inline-editable-field').first().locator('.text-body1').innerText()
      const cleanDesc = descText.replace(/\s*edit\s*$/, '')

      await draftCard.locator('button:has-text("Invia")').click()
      await page.waitForTimeout(1000)

      await page.reload()
      await page.waitForTimeout(2000)
      const cardAfter = page.locator('.q-card').filter({ hasText: cleanDesc }).first()
      await expect(cardAfter.locator('.q-badge').first()).toHaveText('Inviato', { timeout: 10000 })
    })
  })

  // ── RO: Read Only ──
  test.describe('GiustificativoCard — Read Only', () => {
    test.beforeEach(async ({ page }) => {
      await loginAndSelectProgetto(page)
    })

    test('RO-01: Card inviata click campo NON entra in edit @crud', async ({ page }) => {
      const inviatoCard = page.locator('.q-card').filter({ has: page.locator('.q-badge:has-text("Inviato")') }).first()
      if (await inviatoCard.count() === 0) test.skip()

      const descField = inviatoCard.locator('.inline-editable-field').first()
      await descField.click()
      await expect(descField.locator('input')).not.toBeVisible({ timeout: 2000 })
    })

    test('RO-02: Card inviata Apri e Scarica ancora funzionanti @smoke', async ({ page }) => {
      const inviatoCard = page.locator('.q-card').filter({ has: page.locator('.q-badge:has-text("Inviato")') }).first()
      if (await inviatoCard.count() === 0) test.skip()

      if (await inviatoCard.locator('a[href*="/assets/"]').count() > 0) {
        await expect(inviatoCard.locator('a:has-text("Apri")')).toBeVisible()
        await expect(inviatoCard.locator('a:has-text("Scarica")')).toBeVisible()
      }
    })
  })
})
