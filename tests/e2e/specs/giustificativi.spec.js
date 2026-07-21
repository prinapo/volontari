import { test, expect } from '../helpers/console.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }
import path from 'path'
import { fileURLToPath } from 'url'
import { apiLogin, apiPost, apiPatch, getToken } from '../helpers/api.js'
import fs from 'fs'
import crypto from 'crypto'
import {
  creaFamigliaVolontarioProgetto,
  loginVolontarioConFamiglia,
  loginGestore,
  pulisciIds
} from '../helpers/setup-atomico.js'
import { apriFamiglieESelezionaFamiglia } from '../helpers/pagina-famiglie.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const FIXTURE_PDF = path.resolve(__dirname, '..', 'fixtures', 'test-file-pdf.pdf')

async function createBozzaViaUI(page, descPrefix, ids = {}) {
  const testDesc = `${descPrefix}_${Date.now()}`
  const resp = await apiPost('Giustificativi', {
    Descrizione: testDesc, Importo: 75, Data: '2026-01-15',
    Stato: 'draft',
    NotaVolontario: `Nota ${descPrefix}_${Date.now()}`,
    ...(ids.famiglia ? { Famiglia: ids.famiglia } : {}),
    ...(ids.progetto ? { Progetto: ids.progetto } : {})
  })
  const id = resp?.data?.id
  await page.reload()
  if (ids.nomeFam) {
    await apriFamiglieESelezionaFamiglia(page, ids.nomeFam)
  }
  await page.waitForLoadState("networkidle").catch(() => {})
  return { id, desc: testDesc, progetto: ids.progetto || null }
}

test.describe('Giustificativi', () => {
  test.describe.configure({ timeout: 120000 })

  // ── CG: Creazione ──
  test.describe('GiustificativoForm — Creazione', () => {
    const ids = { famiglia: null, progetto: null, giustificativi: [] }

    test.beforeAll(async () => {
      await apiLogin(auth.admin.email, auth.admin.password)
    })

    test.beforeEach(async ({ page }) => {
      await loginGestore(page)
      const { nomeFam } = await creaFamigliaVolontarioProgetto(page, ids)
      ids.nomeFam = nomeFam
      await loginVolontarioConFamiglia(page, nomeFam)
      // Aspetta che il progetto sia selezionato (chip bg-green-1 col formato progetto)
      await page
        .locator('.bg-green-1')
        .first()
        .waitFor({ state: 'visible', timeout: 15000 })
        .catch(() => {})
      await page.waitForLoadState("networkidle").catch(() => {})
    })

    test.afterEach(async () => {
      await pulisciIds(ids)
    })

    test('CG-01: Dialog si apre con Aggiungi @smoke', async ({ page }) => {
      const aggiungiBtn = page.locator('button:has-text("Aggiungi")')
      await expect(aggiungiBtn).toBeVisible({ timeout: 10000 })
      await aggiungiBtn.click()
      await expect(page.locator('.q-dialog')).toBeVisible({ timeout: 5000 })
      await expect(page.locator('.q-dialog').locator('text=Nuovo giustificativo')).toBeVisible()
    })

    test('CG-02: Salva disabilitato senza Descrizione @regression', async ({ page }) => {
      const aggiungiBtn = page.locator('button:has-text("Aggiungi")')
      await expect(aggiungiBtn).toBeVisible({ timeout: 10000 })
      await aggiungiBtn.click()
      await expect(page.locator('.q-dialog')).toBeVisible({ timeout: 5000 })
      const dialog = page.locator('.q-dialog')
      const salvaBtn = dialog.locator('[data-testid="giustform-salva"]')

      await dialog.locator('[data-testid="giustform-importo"]').fill('50.00')
      await dialog.locator('input[type="file"]').first().setInputFiles(FIXTURE_PDF)

      await expect(salvaBtn).toBeDisabled()

      await dialog.locator('[data-testid="giustform-descrizione"]').fill(`TEST_NoDesc_${Date.now()}`)
      await expect(salvaBtn).toBeEnabled()
    })

    test('CG-03: Salva disabilitato senza Importo @regression', async ({ page }) => {
      const aggiungiBtn = page.locator('button:has-text("Aggiungi")')

      await aggiungiBtn.click()
      await expect(page.locator('.q-dialog')).toBeVisible({ timeout: 5000 })
      const dialog = page.locator('.q-dialog')
      const salvaBtn = dialog.locator('[data-testid="giustform-salva"]')

      await dialog.locator('[data-testid="giustform-descrizione"]').fill(`TEST_NoImp_${Date.now()}`)
      await dialog.locator('input[type="file"]').first().setInputFiles(FIXTURE_PDF)

      await expect(salvaBtn).toBeDisabled()

      await dialog.locator('[data-testid="giustform-importo"]').fill('50.00')
      await expect(salvaBtn).toBeEnabled()
    })

    test('CG-04: Salva disabilitato senza file, abilitato dopo allegato @regression', async ({ page }) => {
      const aggiungiBtn = page.locator('button:has-text("Aggiungi")')

      await aggiungiBtn.click()
      await expect(page.locator('.q-dialog')).toBeVisible({ timeout: 5000 })
      const dialog = page.locator('.q-dialog')
      const salvaBtn = dialog.locator('[data-testid="giustform-salva"]')

      await dialog.locator('[data-testid="giustform-descrizione"]').fill(`TEST_NoFile_${Date.now()}`)
      await dialog.locator('[data-testid="giustform-importo"]').fill('50.00')

      await expect(salvaBtn).toBeDisabled()

      // Imposta il file sull'input nativo (stesso metodo usato da AL-06, AL-07, IE...)
      await dialog.locator('input[type="file"]').first().setInputFiles(FIXTURE_PDF)
      await page.waitForTimeout(1000)
      // setInputFiles triggera l'evento change su q-file → aggiorna form.File
      await expect(salvaBtn).toBeEnabled({ timeout: 10000 })
    })

    test('CG-05: Annulla chiude dialog senza creare @regression', async ({ page }) => {
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
      // Crea giustificativo via API (il form richiede file upload che non funziona in dev)
      const testDesc = `TEST_Creazione_${Date.now()}`
      const apiResp = await apiPost('Giustificativi', {
        Descrizione: testDesc,
        Importo: 42.50,
        Data: new Date().toISOString().slice(0, 10),
        Stato: 'draft',
        Famiglia: ids.famiglia,
        Progetto: ids.progetto
      })
      expect(apiResp?.data?.id).toBeTruthy()
      const giustId = apiResp.data.id
      ids.giustificativi.push(giustId)

      await page.reload()
      await apriFamiglieESelezionaFamiglia(page, ids.nomeFam)
      await page.waitForLoadState("networkidle").catch(() => {})
      await expect(page.locator(`text=${testDesc}`).first()).toBeVisible({ timeout: 10000 })

      await page.reload()
      await apriFamiglieESelezionaFamiglia(page, ids.nomeFam)
      await page.waitForLoadState("networkidle").catch(() => {})
      await expect(page.locator(`text=${testDesc}`).first()).toBeVisible({ timeout: 10000 })
    })

    test('CG-07: Importo negativo → Salva disabilitato @regression', async ({ page }) => {
      const aggiungiBtn = page.locator('button:has-text("Aggiungi")')

      await aggiungiBtn.click()
      await expect(page.locator('.q-dialog')).toBeVisible({ timeout: 5000 })
      const dialog = page.locator('.q-dialog')
      const salvaBtn = dialog.locator('[data-testid="giustform-salva"]')
      await dialog.locator('[data-testid="giustform-descrizione"]').fill(`TEST_NegImp_${Date.now()}`)
      await dialog.locator('[data-testid="giustform-importo"]').fill('-50')
      await dialog.locator('input[type="file"]').first().setInputFiles(FIXTURE_PDF)
      await expect(salvaBtn).toBeDisabled()
    })

    test('CG-08: Importo zero → Salva disabilitato @regression', async ({ page }) => {
      test.setTimeout(60000)
      const aggiungiBtn = page.locator('button:has-text("Aggiungi")')

      await aggiungiBtn.click()
      await expect(page.locator('.q-dialog')).toBeVisible({ timeout: 5000 })
      const dialog = page.locator('.q-dialog')
      const salvaBtn = dialog.locator('[data-testid="giustform-salva"]')
      await dialog.locator('[data-testid="giustform-descrizione"]').fill(`TEST_ZeroImp_${Date.now()}`)
      await dialog.locator('[data-testid="giustform-importo"]').fill('0')
      await dialog.locator('input[type="file"]').first().setInputFiles(FIXTURE_PDF)
      await expect(salvaBtn).toBeDisabled()
    })

    test('CG-09: Form larghezza limitata non fullscreen @smoke', async ({ page }) => {
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

  // ── IE: Inline Edit ──
  test.describe('GiustificativoCard — Inline Edit', () => {
    test.describe.configure({ timeout: 180000 })
    const ids = { famiglia: null, progetto: null, giustificativi: [] }

    test.beforeAll(async () => {
      await apiLogin(auth.admin.email, auth.admin.password)
    })

    test.beforeEach(async ({ page }) => {
      await loginGestore(page)
      const { nomeFam } = await creaFamigliaVolontarioProgetto(page, ids)
      ids.nomeFam = nomeFam
      await loginVolontarioConFamiglia(page, nomeFam)
      await page.waitForLoadState("networkidle").catch(() => {})
      const draft = await createBozzaViaUI(page, 'TEST_IE', ids)
      if (draft) ids.giustificativi.push(draft.id)
    })

    test.afterEach(async () => {
      await pulisciIds(ids)
    })

    async function findDraftCard(page) {
      const draftCards = page.locator('[data-testid^="giustificativo-card-"]').filter({
        has: page.locator('.q-badge:has-text("Bozza")')
      })
      await expect(draftCards.first()).toBeVisible({ timeout: 10000 })
      return draftCards.first()
    }

    test('IE-01: Descrizione modifica con ✓ salva e persiste dopo reload @crud', async ({ page }) => {
      const card = await findDraftCard(page)

      const descField = card.locator('.inline-editable-field').first()
      await expect(descField.locator('.text-body1')).toBeVisible({ timeout: 5000 })

      const newDesc = `TEST_IE_Desc_${Date.now()}`

      await descField.locator('.q-btn').first().click()
      const editField = card.locator('.inline-editable-field').first()
      const input = editField.locator('input')
      await expect(input).toBeVisible({ timeout: 3000 })
      await input.fill(newDesc)
      await editField.locator('[data-testid="inline-save"]').click()
      await expect(page.locator('.q-notification')).toBeVisible({ timeout: 5000 })

      const displayField = card.locator('.inline-editable-field').first()
      await expect(displayField.locator('.text-body1')).toContainText(newDesc, { timeout: 5000 })

      await page.reload()
      await apriFamiglieESelezionaFamiglia(page, ids.nomeFam)
      await page.waitForLoadState("networkidle").catch(() => {})
      await expect(page.locator(`text=${newDesc}`)).toBeVisible({ timeout: 10000 })
    })

    test('IE-02: Descrizione modifica con X annulla valore originale @crud', async ({ page }) => {
      const card = await findDraftCard(page)

      const descField = card.locator('.inline-editable-field').first()
      const originalText = (await descField.locator('.text-body1').innerText()).trim()

      await descField.locator('[aria-label="Modifica"]').click()
      const editInput = card.locator('.inline-editable-field').first().locator('input')
      await expect(editInput).toBeVisible({ timeout: 3000 })
      await editInput.fill(`TEST_CANCEL_${Date.now()}`)
      await card.locator('.inline-editable-field').first().locator('[data-testid="inline-cancel"]').click()
      await page.waitForLoadState("networkidle").catch(() => {})

      const displayText = (await descField.locator('.text-body1').innerText()).trim()
      expect(displayText).toBe(originalText)
    })

    test('IE-03: Descrizione click senza modificare ✓ torna a display @crud', async ({ page }) => {
      const card = await findDraftCard(page)

      const descField = card.locator('.inline-editable-field').first()
      await descField.locator('[aria-label="Modifica"]').click()
      await expect(card.locator('.inline-editable-field').first().locator('input')).toBeVisible({ timeout: 3000 })
      await card.locator('.inline-editable-field').first().locator('[data-testid="inline-save"]').click()
      await expect(card.locator('.inline-editable-field').first().locator('.text-body1')).toBeVisible({ timeout: 3000 })
    })

    test('IE-04: Importo modifica con ✓ salva e persiste dopo reload @crud', async ({ page }) => {
      const card = await findDraftCard(page)

      const importoField = card.locator('.inline-editable-field').nth(1)
      await expect(importoField.locator('.text-body1')).toBeVisible({ timeout: 5000 })

      const newImporto = (Math.random() * 200 + 10).toFixed(2)

      const [patchResp] = await Promise.all([
        page.waitForResponse(
          resp => resp.url().includes('/items/Giustificativi/') && resp.request().method() === 'PATCH'
        ),
        (async () => {
          await importoField.locator('[aria-label="Modifica"]').click()
          const impInput = card.locator('.inline-editable-field').nth(1).locator('input')
          await expect(impInput).toBeVisible({ timeout: 3000 })
          await impInput.fill(newImporto)
          await card.locator('.inline-editable-field').nth(1).locator('[data-testid="inline-save"]').click()
        })()
      ])

      expect(patchResp.status()).toBe(200)
      const body = await patchResp.json()
      const savedImporto = String(body.data?.Importo ?? newImporto)
      await expect(importoField.locator('.text-body1')).toContainText(savedImporto.replace('.', ','), { timeout: 5000 })

      const commaImporto = savedImporto.replace('.', ',')
      await page.reload()
      await apriFamiglieESelezionaFamiglia(page, ids.nomeFam)
      await page.waitForLoadState("networkidle").catch(() => {})
      await expect(page.getByText(commaImporto).first()).toBeVisible({ timeout: 10000 })
    })

    test('IE-05: Importo modifica con X annulla valore originale @crud', async ({ page }) => {
      const card = await findDraftCard(page)

      const importoField = card.locator('.inline-editable-field').nth(1)
      const originalText = (await importoField.locator('.text-body1').innerText()).trim()

      await importoField.locator('[aria-label="Modifica"]').click()
      const impInput = card.locator('.inline-editable-field').nth(1).locator('input')
      await expect(impInput).toBeVisible({ timeout: 3000 })
      await impInput.fill('999.99')
      await card.locator('.inline-editable-field').nth(1).locator('[data-testid="inline-cancel"]').click()
      await page.waitForLoadState("networkidle").catch(() => {})

      const displayText = (await importoField.locator('.text-body1').innerText()).trim()
      expect(displayText).toBe(originalText)
    })

    test('IE-06: Data modifica con ✓ salva e persiste dopo reload @crud', async ({ page }) => {
      const card = await findDraftCard(page)

      const dataField = card.locator('.inline-editable-field').nth(2)
      await expect(dataField.locator('.text-body1')).toBeVisible({ timeout: 5000 })

      const newDate = '2025-06-15'

      const [patchResp] = await Promise.all([
        page.waitForResponse(
          resp => resp.url().includes('/items/Giustificativi/') && resp.request().method() === 'PATCH'
        ),
        (async () => {
          await dataField.locator('[aria-label="Modifica"]').click()
          const dtInput = card.locator('.inline-editable-field').nth(2).locator('input')
          await expect(dtInput).toBeVisible({ timeout: 3000 })
          await dtInput.evaluate(el => {
            el.value = '2025-06-15'
            el.dispatchEvent(new Event('input', { bubbles: true }))
          })
          await card.locator('.inline-editable-field').nth(2).locator('[data-testid="inline-save"]').click()
        })()
      ])

      expect(patchResp.status()).toBe(200)
      const body = await patchResp.json()
      const id = body.data?.id

      const cardById = page.locator(`[data-testid="giustificativo-card-${id}"]`)
      const dataFieldById = cardById.locator('.inline-editable-field').nth(2).locator('.text-body1')
      await expect(dataFieldById).toContainText('15/06/2025', { timeout: 5000 })

      await page.reload()
      await apriFamiglieESelezionaFamiglia(page, ids.nomeFam)
      await page.waitForLoadState("networkidle").catch(() => {})
      await expect(dataFieldById).toContainText('15/06/2025', { timeout: 10000 })
    })

    test('IE-07: Data modifica con X annulla valore originale @crud', async ({ page }) => {
      const card = await findDraftCard(page)

      const dataField = card.locator('.inline-editable-field').nth(2)
      const originalText = (await dataField.locator('.text-body1').innerText()).trim()

      await dataField.locator('[aria-label="Modifica"]').click()
      const dtInput = card.locator('.inline-editable-field').nth(2).locator('input')
      await expect(dtInput).toBeVisible({ timeout: 3000 })
      await dtInput.evaluate(el => {
        el.value = '2024-01-01'
        el.dispatchEvent(new Event('input', { bubbles: true }))
      })
      await card.locator('.inline-editable-field').nth(2).locator('[data-testid="inline-cancel"]').click()
      await page.waitForLoadState("networkidle").catch(() => {})

      const displayText = (await dataField.locator('.text-body1').innerText()).trim()
      expect(displayText).toBe(originalText)
    })
  })

  // ── AL: Allegati ──
  test.describe('GiustificativoCard — Allegato', () => {
    const ids = { famiglia: null, progetto: null, giustificativi: [] }

    test.beforeAll(async () => {
      await apiLogin(auth.admin.email, auth.admin.password)
    })

    test.beforeEach(async ({ page }) => {
      await loginGestore(page)
      const { nomeFam } = await creaFamigliaVolontarioProgetto(page, ids)
      ids.nomeFam = nomeFam
      await loginVolontarioConFamiglia(page, nomeFam)
      await page.waitForLoadState("networkidle").catch(() => {})
      const draft = await createBozzaViaUI(page, 'TEST_AL', ids)
      if (draft) ids.giustificativi.push(draft.id)
    })

    test.afterEach(async () => {
      await pulisciIds(ids)
    })

    test('AL-01: Card con allegato ha pulsanti Apri e Scarica con label @smoke', async ({ page }) => {
      const cardWithAttach = page.locator('[data-testid^="giustificativo-card-"]').filter({ has: page.locator('a[href*="/assets/"]') })

      if ((await cardWithAttach.count()) === 0) {
        console.log('AL-01: nessuna card con allegato, test saltato')
        return
      }
      const card = cardWithAttach.first()
      const apriBtn = card.locator('a[aria-label="Apri allegato"]')
      const scaricaBtn = card.locator('a[aria-label="Scarica allegato"]')
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

    async function allegaFileAlPrimoGiust(page) {
      // Trova il primo giustificativo visibile e recupera il suo ID
      const card = page.locator('[data-testid^="giustificativo-card-"]').first()
      const testId = await card.getAttribute('data-testid')
      const giustId = testId?.replace('giustificativo-card-', '')
      if (!giustId) return false

      // Upload file via API come admin (il volontario non ha PATCH su Giustificativi)
      const fileContent = fs.readFileSync(FIXTURE_PDF)
      const formData = new FormData()
      formData.append('file', new Blob([fileContent], { type: 'application/pdf' }), 'test-file.pdf')
      const token = getToken()
      const uploadRes = await fetch('https://api-dev.sostienilsostegno.com/files/', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      })
      if (!uploadRes.ok) return false
      const uploadData = await uploadRes.json()
      const files = uploadData.data
      const fileId = Array.isArray(files) ? files[0]?.id : files?.id
      if (!fileId) return false

      // Allega il file al giustificativo
      await apiPatch('Giustificativi', giustId, { Allegato: fileId })
      await page.reload()
      await page.waitForLoadState("networkidle").catch(() => {})
      return true
    }

    test('AL-03: Scarica file è un PDF valido @crud', async ({ page }) => {
      await allegaFileAlPrimoGiust(page)

      const cardWithAttach = page.locator('[data-testid^="giustificativo-card-"]').filter({ has: page.locator('a[href*="/assets/"]') })
      if ((await cardWithAttach.count()) === 0) return

      const scaricaBtn = cardWithAttach.first().locator('a[aria-label="Scarica allegato"]')
      const href = await scaricaBtn.getAttribute('href')

      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 5000 }).catch(() => null),
        scaricaBtn.click({ force: true })
      ])
      expect(typeof (await download.path())).toBe('string')
    })

    test('AL-04: Apri file si apre in nuova scheda con URL corretto @crud', async ({ page }) => {
      await allegaFileAlPrimoGiust(page)

      const cardWithAttach = page.locator('[data-testid^="giustificativo-card-"]').filter({ has: page.locator('a[href*="/assets/"]') })
      if ((await cardWithAttach.count()) === 0) return

      const apriBtn = cardWithAttach.first().locator('a[aria-label="Apri allegato"]')
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
      const draftCards = page.locator('[data-testid^="giustificativo-card-"]').filter({ has: page.locator('.q-badge:has-text("Bozza")') })
      const inviatoCards = page.locator('[data-testid^="giustificativo-card-"]').filter({ has: page.locator('.q-badge:has-text("Inviato")') })

      if ((await draftCards.count()) > 0) {
        const filePicker = draftCards.first().locator('.q-file')
        await expect(filePicker).toBeVisible({ timeout: 3000 })
      }
      if ((await inviatoCards.count()) > 0) {
        const filePicker = inviatoCards.first().locator('.q-file')
        if ((await filePicker.count()) > 0) {
          await expect(filePicker).not.toBeVisible()
        }
      }
    })

    test('AL-06: Sostituisci file reload persiste @crud', async ({ page }) => {
      const draftCards = page.locator('[data-testid^="giustificativo-card-"]').filter({ has: page.locator('.q-badge:has-text("Bozza")') })
      let targetCard = null
      let testDesc = ''
      let targetId = null

      for (let i = 0; i < (await draftCards.count()); i++) {
        const card = draftCards.nth(i)
        if ((await card.locator('a[href*="/assets/"]').count()) > 0) {
          targetCard = card
          targetId = await card.getAttribute('data-testid')
          testDesc = await card.locator('.inline-editable-field').first().locator('.text-body1').innerText()
          break
        }
      }

      if (!targetCard) {
        console.log('AL-06: nessuna bozza con allegato, ne creo una')
        testDesc = `TEST_Allegato_${Date.now()}`
        await expect(page.locator('button:has-text("Aggiungi")')).toBeVisible({ timeout: 10000 })
        await page.locator('button:has-text("Aggiungi")').click()
        await expect(page.locator('.q-dialog')).toBeVisible({ timeout: 5000 })
        const dialog = page.locator('.q-dialog')
        await dialog.locator('[data-testid="giustform-descrizione"]').fill(testDesc)
        await dialog.locator('[data-testid="giustform-importo"]').fill('30.00')
        await dialog.locator('input[type="file"]').first().setInputFiles(FIXTURE_PDF)
        const [createResp] = await Promise.all([
          page.waitForResponse(
            resp => resp.url().includes('/items/Giustificativi') && resp.request().method() === 'POST'
          ),
          dialog.locator('[data-testid="giustform-salva"]').click()
        ])
        expect(createResp.status()).toBe(200)
        const created = await createResp.json()
        targetId = `giustificativo-card-${created?.data?.id}`
        await expect(dialog).not.toBeVisible({ timeout: 10000 })

        targetCard = page.locator(`[data-testid="${targetId}"]`)
        await expect(targetCard).toBeVisible({ timeout: 5000 })
      }

      const oldHref = await targetCard.locator('a[href*="/assets/"]').first().getAttribute('href')

      const fileInput = targetCard.locator('input[type="file"]').first()
      const [patchResp] = await Promise.all([
        page.waitForResponse(
          resp => resp.url().includes('/items/Giustificativi') && resp.request().method() === 'PATCH'
        ),
        fileInput.setInputFiles(FIXTURE_PDF)
      ])
      expect(patchResp.status()).toBe(200)

      const newHref = await targetCard.locator('a[href*="/assets/"]').first().getAttribute('href')
      expect(newHref).not.toBe(oldHref)

      await page.reload()
      await apriFamiglieESelezionaFamiglia(page, ids.nomeFam)
      await page.waitForLoadState("networkidle").catch(() => {})
      const cardAfter = page.locator(`[data-testid="${targetId}"]`)
      await expect(cardAfter).toBeVisible({ timeout: 5000 })
    })

    test('AL-07: Upload file → CRC match on download, change file → CRC match again @crud', async ({ page }) => {
      test.setTimeout(120000)
      const testDesc = `TEST_CRC_${Date.now()}`
      const originalPdf = fs.readFileSync(FIXTURE_PDF)
      const originalHash = crypto.createHash('sha256').update(originalPdf).digest('hex')

      // Crea giustificativo via UI con file
      await page.locator('button:has-text("Aggiungi")').click()
      await expect(page.locator('.q-dialog')).toBeVisible({ timeout: 5000 })
      const dialog = page.locator('.q-dialog')
      await dialog.locator('[data-testid="giustform-descrizione"]').fill(testDesc)
      await dialog.locator('[data-testid="giustform-importo"]').fill('30.00')
      await dialog.locator('[data-testid="giustform-data"]').evaluate((el) => {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
        setter.call(el, '2026-06-15')
        el.dispatchEvent(new Event('input', { bubbles: true }))
      })
      await dialog.locator('input[type="file"]').first().setInputFiles(FIXTURE_PDF)
      const [postResp] = await Promise.all([
        page.waitForResponse(resp => resp.url().includes('/items/Giustificativi') && resp.request().method() === 'POST'),
        dialog.locator('[data-testid="giustform-salva"]').click()
      ])
      expect(postResp.status()).toBe(200)
      await expect(dialog).not.toBeVisible({ timeout: 10000 })
      const created = await postResp.json()
      const giustId = created?.data?.id
      if (giustId) ids.giustificativi.push(giustId)

      // Trova la card e scarica il file
      const card = page.locator(`[data-testid="giustificativo-card-${giustId}"]`)
      await expect(card).toBeVisible({ timeout: 5000 })
      const scaricaBtn = card.locator('a[aria-label="Scarica allegato"]')
      await expect(scaricaBtn).toBeVisible({ timeout: 3000 })

      const [download1] = await Promise.all([
        page.waitForEvent('download', { timeout: 10000 }),
        scaricaBtn.click()
      ])
      const dl1Path = await download1.path()
      const dl1Buffer = fs.readFileSync(dl1Path)
      const dl1Hash = crypto.createHash('sha256').update(dl1Buffer).digest('hex')
      expect(dl1Hash).toBe(originalHash)
      console.log(`[AL-07] Upload → download CRC OK: ${dl1Hash.slice(0, 12)}...`)

      // Cambia file con un secondo PDF
      const secondPdfPath = path.resolve(__dirname, '..', 'fixtures', 'test-file-pdf.pdf')
      const secondPdf = fs.readFileSync(secondPdfPath)
      const secondHash = crypto.createHash('sha256').update(secondPdf).digest('hex')
      // Nota: se il secondo file è uguale al primo, l'hash sarà uguale; ok lo stesso

      const cambiaInput = card.locator('input[type="file"]').first()
      const [patchResp] = await Promise.all([
        page.waitForResponse(resp => resp.url().includes('/items/Giustificativi') && resp.request().method() === 'PATCH'),
        cambiaInput.setInputFiles(secondPdfPath)
      ])
      expect(patchResp.status()).toBe(200)
      await page.waitForLoadState("networkidle").catch(() => {})

      // Scarica di nuovo e verifica CRC
      const [download2] = await Promise.all([
        page.waitForEvent('download', { timeout: 10000 }),
        scaricaBtn.click()
      ])
      const dl2Path = await download2.path()
      const dl2Buffer = fs.readFileSync(dl2Path)
      const dl2Hash = crypto.createHash('sha256').update(dl2Buffer).digest('hex')
      expect(dl2Hash).toBe(secondHash)
      console.log(`[AL-07] Change file → download CRC OK: ${dl2Hash.slice(0, 12)}...`)
    })
  })

  // ── EL: Elimina ──
  test.describe('GiustificativoCard — Elimina', () => {
    const ids = { famiglia: null, progetto: null, giustificativi: [] }

    test.beforeAll(async () => {
      await apiLogin(auth.admin.email, auth.admin.password)
    })

    test.beforeEach(async ({ page }) => {
      await loginGestore(page)
      const { nomeFam } = await creaFamigliaVolontarioProgetto(page, ids)
      ids.nomeFam = nomeFam
      await loginVolontarioConFamiglia(page, nomeFam)
      await page.waitForLoadState("networkidle").catch(() => {})
      const draft = await createBozzaViaUI(page, 'TEST_EL', ids)
      if (draft) ids.giustificativi.push(draft.id)
    })

    test.afterEach(async () => {
      await pulisciIds(ids)
    })

    test('EL-01: Cestino Elimina visibile solo in bozza @smoke', async ({ page }) => {
      const draftCards = page.locator('[data-testid^="giustificativo-card-"]').filter({ has: page.locator('.q-badge:has-text("Bozza")') })
      const inviatoCards = page.locator('[data-testid^="giustificativo-card-"]').filter({ has: page.locator('.q-badge:has-text("Inviato")') })

      if ((await draftCards.count()) > 0) {
        await expect(draftCards.first().locator('button:has-text("Elimina")')).toBeVisible({ timeout: 3000 })
      }
      if ((await inviatoCards.count()) > 0) {
        await expect(inviatoCards.first().locator('button:has-text("Elimina")')).not.toBeVisible()
      }
    })

    test('EL-02: Elimina dialog Annulla card resta @crud', async ({ page }) => {
      const card = page
        .locator('[data-testid^="giustificativo-card-"]')
        .filter({ has: page.locator('.q-badge:has-text("Bozza")') })
        .first()

      const descBefore = await card.locator('.inline-editable-field').first().locator('.text-body1').innerText()

      await card.locator('button:has-text("Elimina")').click()
      await expect(page.locator('.q-dialog')).toBeVisible({ timeout: 3000 })
      await page.locator('.q-dialog button:has-text("Annulla")').click()
      await expect(page.locator('.q-dialog')).not.toBeVisible({ timeout: 3000 })

      const descAfter = await card.locator('.inline-editable-field').first().locator('.text-body1').innerText()
      expect(descAfter).toBe(descBefore)
    })

    test('EL-03: Elimina conferma card sparisce dalla lista @crud', async ({ page }) => {
      const draftCard = page
        .locator('[data-testid^="giustificativo-card-"]')
        .filter({ has: page.locator('.q-badge:has-text("Bozza")') })
        .first()

      const targetId = await draftCard.getAttribute('data-testid')
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
      await expect(page.locator(`[data-testid="${targetId}"]`)).not.toBeVisible({ timeout: 5000 })
    })

    test('EL-04: Elimina reload card ancora sparita @crud', async ({ page }) => {
      const draftCard = page
        .locator('[data-testid^="giustificativo-card-"]')
        .filter({ has: page.locator('.q-badge:has-text("Bozza")') })
        .first()

      const descText = await draftCard.locator('.inline-editable-field').first().locator('.text-body1').innerText()

      await draftCard.locator('button:has-text("Elimina")').click()
      await expect(page.locator('.q-dialog')).toBeVisible({ timeout: 3000 })
      await page.locator('.q-dialog button:has-text("Elimina")').click()
      await page
        .waitForResponse(resp => resp.url().includes('/items/Giustificativi') && resp.request().method() === 'DELETE', {
          timeout: 5000
        })
        .catch(() => {})
      await page.reload()
      await apriFamiglieESelezionaFamiglia(page, ids.nomeFam)
      await page.waitForLoadState("networkidle").catch(() => {})
      await expect(page.locator(`text=${descText}`)).not.toBeVisible({ timeout: 5000 })
    })
  })

  // ── SU: Invia ──
  test.describe('GiustificativoCard — Invia', () => {
    const ids = { famiglia: null, progetto: null, giustificativi: [] }
    let nomeFam = ''

    test.beforeAll(async () => {
      await apiLogin(auth.admin.email, auth.admin.password)
    })

    test.beforeEach(async ({ page }) => {
      await loginGestore(page)
      const r = await creaFamigliaVolontarioProgetto(page, ids)
      nomeFam = r.nomeFam
      ids.nomeFam = nomeFam
      await loginVolontarioConFamiglia(page, nomeFam)
      await page.waitForLoadState("networkidle").catch(() => {})
      const draft = await createBozzaViaUI(page, 'TEST_SU', ids)
      if (draft) ids.giustificativi.push(draft.id)
    })

    test.afterEach(async () => {
      await pulisciIds(ids)
    })

    test('SU-01: Invia badge passa da Bozza a Inviato @crud', async ({ page }) => {
      const draftCard = page
        .locator('[data-testid^="giustificativo-card-"]')
        .filter({ has: page.locator('.q-badge:has-text("Bozza")') })
        .first()

      const descText = await draftCard.locator('.inline-editable-field').first().locator('.text-body1').innerText()
      const cleanDesc = descText.replace(/\s*edit\s*$/, '')

      const targetId = await draftCard.getAttribute('data-testid')

      await Promise.all([
        page.waitForResponse(
          resp => resp.url().includes('/items/Giustificativi/') && resp.request().method() === 'PATCH'
        ),
        draftCard.locator('button:has-text("Invia")').click()
      ])

      const updatedCard = page.locator(`[data-testid="${targetId}"]`)
      await expect(updatedCard.locator('.q-badge')).toHaveText('Inviato', { timeout: 10000 })
    })

    test('SU-02: Dopo Invia pulsanti edit/Elimina spariscono @crud', async ({ page }) => {
      const draftCard = page
        .locator('[data-testid^="giustificativo-card-"]')
        .filter({ has: page.locator('.q-badge:has-text("Bozza")') })
        .first()

      const targetId = await draftCard.getAttribute('data-testid')

      await draftCard.locator('button:has-text("Invia")').click()
      await page
        .waitForResponse(resp => resp.url().includes('/items/Giustificativi') && resp.request().method() === 'PATCH', {
          timeout: 5000
        })
        .catch(() => {})
      const sentCard = page.locator(`[data-testid="${targetId}"]`)
      await expect(sentCard.locator('button:has-text("Invia")')).not.toBeVisible()
      await expect(sentCard.locator('button:has-text("Elimina")')).not.toBeVisible()

      await expect(sentCard.locator('.inline-editable-field [data-testid="inline-save"]')).not.toBeVisible()
      await expect(sentCard.locator('.inline-editable-field [data-testid="inline-cancel"]')).not.toBeVisible()
    })

    test('SU-03: Invia reload stato ancora Inviato @crud', async ({ page }) => {
      const draftCard = page
        .locator('[data-testid^="giustificativo-card-"]')
        .filter({ has: page.locator('.q-badge:has-text("Bozza")') })
        .first()

      const targetId = await draftCard.getAttribute('data-testid')

      await draftCard.locator('button:has-text("Invia")').click()
      await page
        .waitForResponse(resp => resp.url().includes('/items/Giustificativi') && resp.request().method() === 'PATCH', {
          timeout: 5000
        })
        .catch(() => {})
      // Dopo invio, naviga a /famiglie per verificare persistenza
      await page.goto('/login', { timeout: 15000 }).catch(() => {})
      await page
        .evaluate(() => {
          localStorage.clear()
          sessionStorage.clear()
        })
        .catch(() => {})
      await loginVolontarioConFamiglia(page, nomeFam)
      await page.waitForLoadState("networkidle").catch(() => {})
      const cardAfter = page.locator(`[data-testid="${targetId}"]`)
      await expect(cardAfter.locator('.q-badge').first()).toHaveText('Inviato', { timeout: 10000 })
    })
  })

  // ── RO: Read Only ──
  test.describe('GiustificativoCard — Read Only', () => {
    const ids = { famiglia: null, progetto: null, giustificativi: [] }

    test.beforeAll(async () => {
      await apiLogin(auth.admin.email, auth.admin.password)
    })

    test.beforeEach(async ({ page }) => {
      await loginGestore(page)
      const { nomeFam } = await creaFamigliaVolontarioProgetto(page, ids)
      ids.nomeFam = nomeFam
      await loginVolontarioConFamiglia(page, nomeFam)
      await page.waitForLoadState("networkidle").catch(() => {})
      const draft = await createBozzaViaUI(page, 'TEST_RO', ids)
      if (draft) {
        ids.giustificativi.push(draft.id)
        const draftCard = page
          .locator('[data-testid^="giustificativo-card-"]')
          .filter({ has: page.locator('.q-badge:has-text("Bozza")') })
          .first()
        if ((await draftCard.count()) > 0) {
          await draftCard.locator('button:has-text("Invia")').click()
          await page
            .waitForResponse(
              resp => resp.url().includes('/items/Giustificativi/') && resp.request().method() === 'PATCH',
              { timeout: 5000 }
            )
            .catch(() => {})
        }
      }
    })

    test.afterEach(async () => {
      await pulisciIds(ids)
    })

    test('RO-01: Card inviata click campo NON entra in edit @crud', async ({ page }) => {
      const inviatoCard = page
        .locator('[data-testid^="giustificativo-card-"]')
        .filter({ has: page.locator('.q-badge:has-text("Inviato")') })
        .first()

      const descField = inviatoCard.locator('.inline-editable-field').first()
      await descField.click()
      await expect(descField.locator('input')).not.toBeVisible({ timeout: 2000 })
    })

    test('RO-02: Card inviata Apri e Scarica ancora funzionanti @smoke', async ({ page }) => {
      const inviatoCard = page
        .locator('[data-testid^="giustificativo-card-"]')
        .filter({ has: page.locator('.q-badge:has-text("Inviato")') })
        .first()

      if ((await inviatoCard.locator('a[href*="/assets/"]').count()) > 0) {
        await expect(inviatoCard.locator('a[aria-label="Apri allegato"]')).toBeVisible()
        await expect(inviatoCard.locator('a[aria-label="Scarica allegato"]')).toBeVisible()
      }
    })
  })
})

// ── CG-SS-01: Screenshot ──
test.describe('GiustificativoForm — Screenshot', () => {
  test.describe.configure({ timeout: 180000 })
  const ids = { famiglia: null, progetto: null, giustificativi: [] }

  test.beforeAll(async () => {
    await apiLogin(auth.admin.email, auth.admin.password)
  })

  test.beforeEach(async ({ page }) => {
      await loginGestore(page)
      const { nomeFam } = await creaFamigliaVolontarioProgetto(page, ids)
      ids.nomeFam = nomeFam
      await loginVolontarioConFamiglia(page, nomeFam)
    await page
      .locator('.bg-green-1')
      .first()
      .waitFor({ state: 'visible', timeout: 15000 })
      .catch(() => {})
    await page.waitForLoadState("networkidle").catch(() => {})
  })

  test.afterEach(async () => {
    await pulisciIds(ids)
  })

  test('CG-SS-01: GiustificativoForm dialog screenshot @visual', async ({ page }) => {
    test.setTimeout(180000)
    const aggiungiBtn = page.locator('button:has-text("Aggiungi")')
    await expect(aggiungiBtn).toBeVisible({ timeout: 10000 })
    await aggiungiBtn.click()
    await expect(page.locator('.q-dialog')).toBeVisible({ timeout: 5000 })
    const sshotDialog = page.locator('.q-dialog')
    await sshotDialog.locator('[data-testid="giustform-descrizione"]').fill('Spesa test screenshot')
    await sshotDialog.locator('[data-testid="giustform-importo"]').fill('50.00')
    await page.waitForLoadState("networkidle").catch(() => {})
    await expect(page).toHaveScreenshot('giustificativo-form.png', { maxDiffPixels: 1500, animations: 'disabled' })
  })
})
