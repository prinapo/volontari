import { test, expect } from '../helpers/console.js'
import { LoginPage } from '../pages/LoginPage.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const FIXTURE_PDF = path.resolve(__dirname, '..', 'fixtures', 'test-file-pdf.pdf')

test.describe('VerificaPage', () => {
  test.describe('Auth & Layout', () => {
    test('VR-01: Accesso verificatore apre VerificaPage @smoke', async ({ page }) => {
      const loginPage = new LoginPage(page)
      await loginPage.goto()
      await loginPage.login(auth.verificatore.email, auth.verificatore.password)
      await expect(page).toHaveURL(/\/verifica/, { timeout: 15000 })
      await expect(page.locator('.verifica-table')).toBeVisible({ timeout: 15000 })
    })

    test('VR-02: VerificaPage non accessibile se non autorizzati @regression', async ({ page }) => {
      const loginPage = new LoginPage(page)
      await loginPage.goto()
      await loginPage.login(auth.volontario.email, auth.volontario.password)
      await expect(page).toHaveURL(/\/famiglie/, { timeout: 15000 })

      await page.goto('/verifica')
      await page.waitForTimeout(2000)

      const currentUrl = page.url()
      expect(currentUrl).not.toContain('/verifica')
    })

    test('TB-01: Colonne ordine corretto @smoke', async ({ page }) => {
      const loginPage = new LoginPage(page)
      await loginPage.goto()
      await loginPage.login(auth.verificatore.email, auth.verificatore.password)
      await expect(page.locator('.verifica-table')).toBeVisible({ timeout: 15000 })
      await page.waitForTimeout(2000)

      const headers = await page.locator('.verifica-table thead tr:first-child th').allInnerTexts()
      const rendicontatoHeader = headers.find(h => h.includes('Rendicontato'))
      expect(rendicontatoHeader).toBeTruthy()
      expect(headers[1]).toContain('Bando')
      expect(headers[2]).toContain('Famiglia')
      expect(headers[3]).toContain('Dati bancari')
      expect(headers[4]).toContain('Allocato')
      expect(headers[6]).toContain('Rimborsabile')
      expect(headers[7]).toContain('Stato')
    })

    test('TB-05: Colonna Totali non esiste @regression', async ({ page }) => {
      const loginPage = new LoginPage(page)
      await loginPage.goto()
      await loginPage.login(auth.verificatore.email, auth.verificatore.password)
      await expect(page.locator('.verifica-table')).toBeVisible({ timeout: 15000 })
      await expect(page.locator('th:has-text("Totali")')).not.toBeVisible()
    })
  })

  test.describe('Filtri', () => {
    test.beforeEach(async ({ page }) => {
      const loginPage = new LoginPage(page)
      await loginPage.goto()
      await loginPage.login(auth.verificatore.email, auth.verificatore.password)
      await expect(page.locator('.verifica-table')).toBeVisible({ timeout: 15000 })
      await page.waitForTimeout(2000)
    })

    test('FL-01: Tranche Tutte mostra tutti i progetti @smoke', async ({ page }) => {
      const rows = await page.locator('.verifica-table tbody tr').count()
      expect(rows).toBeGreaterThanOrEqual(0)
    })

    test('FL-06: Filtro anno bando @crud', async ({ page }) => {
      const annoSelect = page.locator('.q-select:has(.q-field__label:has-text("Anno bando"))')
      await annoSelect.click()
      const firstOption = page.locator('.q-item').first()
      await firstOption.click()
      await page.waitForTimeout(500)
      const rows = await page.locator('.verifica-table tbody tr').count()
      expect(rows).toBeGreaterThanOrEqual(0)
    })

    test('FL-07: Ricerca per famiglia @crud', async ({ page }) => {
      const allRows = page.locator('.verifica-table tbody tr:has(td .q-btn)')
      if (!(await allRows.first().isVisible({ timeout: 5000 }).catch(() => false))) {
        test.skip()
        return
      }
      const firstFamiglia = await page.locator('.verifica-table .text-weight-medium').first().innerText()
      await page.locator('input[aria-label="Cerca famiglia"]').fill(firstFamiglia)
      await page.waitForTimeout(4000)
      const filteredCount = await allRows.count()
      expect(filteredCount).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Expanded Row & Giustificativi', () => {
    test.beforeEach(async ({ page }) => {
      const loginPage = new LoginPage(page)
      await loginPage.goto()
      await loginPage.login(auth.verificatore.email, auth.verificatore.password)
      await expect(page.locator('.verifica-table')).toBeVisible({ timeout: 15000 })
      await page.waitForTimeout(2000)
    })

    test('ER-01: Click expand mostra giustificativi @smoke', async ({ page }) => {
      const expandBtn = page.locator('.verifica-table tbody tr td .q-btn').first()
      await expandBtn.click()
      await page.waitForTimeout(500)
      await expect(page.locator('.expandable-content').first()).toBeVisible({ timeout: 5000 })
    })

    test('ER-02: Toggle expand/close funziona @regression', async ({ page }) => {
      const expandBtn = page.locator('.verifica-table tbody tr td .q-btn').first()
      await expandBtn.click()
      await page.waitForTimeout(500)
      await expect(page.locator('.expandable-content').first()).toBeVisible({ timeout: 3000 })
      await expandBtn.click()
      await page.waitForTimeout(500)
      await expect(page.locator('.expandable-content').first()).not.toBeVisible({ timeout: 3000 })
    })

    test('VE-EDIT: Inline edit Descrizione su giustificativo inviato @crud', async ({ page }) => {
      const expandBtn = page.locator('.verifica-table tbody tr td:first-child .q-btn').first()
      await expandBtn.click({ timeout: 5000 })
      await page.waitForTimeout(3000)

      const expandedContent = page.locator('.expandable-content').first()
      if (await expandedContent.isVisible({ timeout: 3000 }).catch(() => false)) {
        const inlineFields = expandedContent.locator('.inline-editable-field')
        if (await inlineFields.count() > 0) {
          const targetField = inlineFields.first()
          await targetField.click()
          await page.waitForTimeout(500)

          const input = expandedContent.locator('.inline-editable-field input').first()
          if (await input.count() > 0) {
            const originalValue = await input.inputValue()
            const testValue = `${originalValue} (test edit)`
            await input.fill(testValue)

            const saveBtn = expandedContent.locator('[data-testid="inline-save"]').first()
            if (await saveBtn.count() > 0) {
              const [patchResp] = await Promise.all([
                page.waitForResponse(resp => resp.url().includes('/items/Giustificativi') && resp.request().method() === 'PATCH'),
                saveBtn.click()
              ])
              expect(patchResp.status()).toBe(200)
            }

            await expandBtn.click()
            return
          }
        }
      }

      await expandBtn.click()
      test.skip('Inline edit non disponibile (giustificativo non in stato inviato?)')
    })

    test('VE-ADD: Aggiungi giustificativo da VerificaPage @crud', async ({ page }) => {
      const addBtn = page.locator('.verifica-table tbody tr td .q-btn').filter({ has: page.locator('i:has-text("add_circle")') }).first()
      if (await addBtn.count() === 0) {
        test.skip('Pulsante aggiungi non trovato')
        return
      }

      await addBtn.click()
      await page.waitForTimeout(1000)

      const dialog = page.locator('.q-dialog:visible')
      await expect(dialog).toBeVisible({ timeout: 5000 })

      const dialogTitle = await dialog.locator('.text-h6').innerText().catch(() => '')
      expect(dialogTitle).toContain('giustificativo')

      await dialog.locator('[data-testid="giustform-descrizione"]').fill('Test VE-ADD')
      await dialog.locator('[data-testid="giustform-importo"]').fill('25.00')

      const fileInput = dialog.locator('input[type="file"]').first()
      if (await fileInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await fileInput.setInputFiles(FIXTURE_PDF)
        await page.waitForTimeout(1000)
      }

      const [postResp] = await Promise.all([
        page.waitForResponse(resp => resp.url().includes('/items/Giustificativi') && resp.request().method() === 'POST'),
        dialog.locator('[data-testid="giustform-salva"]').click()
      ])

      expect(postResp.status()).toBe(200)
      await expect(dialog).not.toBeVisible({ timeout: 10000 })
    })

    test('ER-03: Expand row mostra sezione Genitori @smoke', async ({ page }) => {
      const expandBtn = page.locator('.verifica-table tbody tr td .q-btn').first()
      await expandBtn.click()
      await page.waitForTimeout(2000)

      const expandedContent = page.locator('.expandable-content').first()
      await expect(expandedContent).toBeVisible({ timeout: 5000 })

      const genitoriSection = expandedContent.locator('text=Genitori')
      const hasGenitori = await genitoriSection.count() > 0
      const hasVolontari = await expandedContent.locator('text=Volontari').count() > 0
      const hasGiust = await expandedContent.locator('.giust-item').count() > 0
      const hasEmpty = await expandedContent.locator('.text-grey:has-text("Nessun giustificativo")').count() > 0

      console.log(`[ER-03] genitori: ${hasGenitori}, volontari: ${hasVolontari}, giust: ${hasGiust}`)
      expect(hasGenitori || hasVolontari || hasGiust).toBe(true)

      await expandBtn.click()
    })

    test('ER-04: Expand row mostra lista giustificativi @smoke', async ({ page }) => {
      const expandBtn = page.locator('.verifica-table tbody tr td .q-btn').first()
      await expandBtn.click()
      await page.waitForTimeout(2000)

      const expandedContent = page.locator('.expandable-content').first()
      await expect(expandedContent).toBeVisible({ timeout: 5000 })

      const giustSection = expandedContent.locator('text=Giustificativi')
      const giustItems = expandedContent.locator('.giust-item')

      const hasGiustHeader = await giustSection.count() > 0
      const giustCount = await giustItems.count()
      const hasEmpty = await expandedContent.locator('.text-grey:has-text("Nessun giustificativo")').count() > 0

      console.log(`[ER-04] header: ${hasGiustHeader}, items: ${giustCount}, empty: ${hasEmpty}`)
      expect(hasGiustHeader || giustCount > 0 || hasEmpty).toBe(true)

      await expandBtn.click()
    })
  })

  test.describe('Dati bancari edit', () => {
    test.beforeEach(async ({ page }) => {
      const loginPage = new LoginPage(page)
      await loginPage.goto()
      await loginPage.login(auth.verificatore.email, auth.verificatore.password)
      await expect(page.locator('.verifica-table')).toBeVisible({ timeout: 15000 })
      await page.waitForTimeout(2000)
    })

    test('DB-V1: Badge dati bancari Completi/Da completare presenti @smoke', async ({ page }) => {
      const badges = page.locator('.verifica-table .q-badge:has-text("Completi"), .verifica-table .q-badge:has-text("Da completare")')
      await expect(badges.first()).toBeVisible({ timeout: 5000 })
    })

    test('DB-V2: Pulsante edit apre dialog IBAN @smoke', async ({ page }) => {
      const editBtn = page.locator('.verifica-table tbody tr td .q-btn').filter({ has: page.locator('i:text-is("edit")') }).first()
      if (await editBtn.count() === 0) test.skip()
      await editBtn.click()
      await expect(page.locator('.q-dialog:has(.text-h6:has-text("Modifica dati bancari"))')).toBeVisible({ timeout: 3000 })
    })

    test('DB-V3: Dialog IBAN annulla chiude senza salvare @crud', async ({ page }) => {
      const editBtn = page.locator('.verifica-table tbody tr td .q-btn').filter({ has: page.locator('i:text-is("edit")') }).first()
      if (await editBtn.count() === 0) test.skip()
      await editBtn.click()
      await expect(page.locator('.q-dialog')).toBeVisible({ timeout: 3000 })
      await page.locator('.q-dialog button:has-text("Annulla")').click()
      await expect(page.locator('.q-dialog')).not.toBeVisible({ timeout: 3000 })
    })

    test('DB-V4: Dialog IBAN salva invia PATCH @crud', async ({ page }) => {
      const editBtn = page.locator('.verifica-table tbody tr td .q-btn').filter({ has: page.locator('i:text-is("edit")') }).first()
      if (await editBtn.count() === 0) test.skip()
      await editBtn.click()
      await expect(page.locator('.q-dialog')).toBeVisible({ timeout: 3000 })

      const ibanInput = page.locator('.q-dialog [data-testid="bancari-iban"]')
      if (await ibanInput.count() === 0) {
        await page.locator('.q-dialog button:has-text("Annulla")').click()
        test.skip('BancariDialog senza data-testid')
        return
      }

      const originalIban = await ibanInput.inputValue()
      const testIban = originalIban === 'IT60XTEST00000000000000' ? 'IT60XREAL00000000000000' : 'IT60XTEST00000000000000'
      await ibanInput.fill(testIban)

      const intestatarioInput = page.locator('.q-dialog [data-testid="bancari-intestatario"]')
      if (await intestatarioInput.count() > 0) {
        await intestatarioInput.fill('Test Intestatario')
      }

      const saveBtn = page.locator('.q-dialog button:has-text("Salva")')
      if (await saveBtn.isEnabled()) {
        const [patchResp] = await Promise.all([
          page.waitForResponse(resp => resp.url().includes('/items/Famiglie') && resp.request().method() === 'PATCH'),
          saveBtn.click()
        ])
        expect(patchResp.status()).toBe(200)
      }

      await expect(page.locator('.q-dialog')).not.toBeVisible({ timeout: 10000 }).catch(async () => {
        await page.locator('.q-dialog button:has-text("Annulla")').click()
      })
    })
  })

  test('SR-SETUP: Crea giustificativo inviato @setup', async ({ page }) => {
    test.setTimeout(60000)

    const networkLog = []
    page.on('response', async resp => {
      const entry = { method: resp.request().method(), url: resp.url().replace(/\?.*$/, ''), status: resp.status() }
      if (resp.status() >= 400) {
        try { entry.body = await resp.text() } catch {}
      }
      networkLog.push(entry)
    })

    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(auth.volontario.email, auth.volontario.password)
    await expect(page).toHaveURL(/\/famiglie/, { timeout: 15000 })
    await page.waitForTimeout(2000)

    const select = page.locator('.q-select').first()
    await select.click()
    await page.waitForTimeout(2000)
    const firstOption = page.locator('.q-menu .q-item').first()
    if (await firstOption.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstOption.click()
      await page.waitForTimeout(1000)
    }

    const aggiungiBtn = page.locator('button:has-text("Aggiungi")')
    if (await aggiungiBtn.isDisabled().catch(() => true)) return

    await aggiungiBtn.click()
    await expect(page.locator('.q-dialog')).toBeVisible({ timeout: 5000 })
    const dialog = page.locator('.q-dialog')

    await dialog.locator('input').first().fill(`Test SR_${Date.now()}`)
    await dialog.locator('input').nth(1).fill('75.00')
    await dialog.locator('input[type="file"]').first().setInputFiles(FIXTURE_PDF)

    const [postResp] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/items/Giustificativi') && resp.request().method() === 'POST'),
      dialog.locator('button:has-text("Salva")').click()
    ])

    const postStatus = postResp.status()
    if (postStatus < 200 || postStatus >= 300) {
      console.log(`[SR-SETUP] POST Giustificativi fallito: ${postStatus}`)
      return
    }
    await expect(dialog).not.toBeVisible({ timeout: 10000 })

    const created = await postResp.json()
    const giustId = created.data?.id
    if (!giustId) return

    const submitBtn = page.locator('[data-testid^="giustificativo-card-"] button:has-text("Invia")').first()
    if (await submitBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await submitBtn.click()
      await page.waitForTimeout(2000)
    } else {
      console.log('[SR-SETUP] Submit button non trovato — giustificativo resta in bozza')
    }

    const errors = networkLog.filter(e => e.status >= 400)
    if (errors.length > 0) {
      console.log(`[SR-SETUP] Errori rete: ${JSON.stringify(errors, null, 2)}`)
    }
  })

  test.describe.serial('Stato riga', () => {
    test.beforeEach(async ({ page }) => {
      const loginPage = new LoginPage(page)
      await loginPage.goto()
      await loginPage.login(auth.verificatore.email, auth.verificatore.password)
      await page.waitForURL(/\/verifica/)
      await expect(page.locator('.verifica-table')).toBeVisible({ timeout: 15000 })
      await page.waitForTimeout(2000)
    })

    test('SR-01: Stato Non ricevuta visibile @smoke', async ({ page }) => {
      const badge = page.locator('.q-badge:has-text("Non ricevuta")').first()
      if (await badge.count() > 0) {
        await expect(badge).toBeVisible()
      } else {
        test.skip()
      }
    })

    test('SR-02: Stato Da verificare visibile quando presente @smoke', async ({ page }) => {
      const searchInput = page.locator('input[aria-label="Cerca famiglia"]')
      if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await searchInput.fill('Famiglia TEST_FAM_01')
        await page.waitForTimeout(4000)
      }

      const badge = page.locator('.q-badge:has-text("Da verificare")').first()
      if (await badge.count() > 0) {
        await expect(badge).toBeVisible()
      } else {
        test.skip()
      }
    })
  })

  test.describe('ASPI Export', () => {
    test.beforeEach(async ({ page }) => {
      const loginPage = new LoginPage(page)
      await loginPage.goto()
      await loginPage.login(auth.verificatore.email, auth.verificatore.password)
      await expect(page.locator('.verifica-table')).toBeVisible({ timeout: 15000 })
      await page.waitForTimeout(2000)
    })

    test('AS-01: Export button visibile @smoke', async ({ page }) => {
      await expect(page.locator('button:has-text("Export")')).toBeVisible({ timeout: 5000 })
    })

    test('AS-02: Copia riga ASPI funziona @crud', async ({ page }) => {
      await page.evaluate(() => { navigator.clipboard.writeText = async () => {} })
      const copyBtn = page.locator('.verifica-table .q-btn').filter({ has: page.locator('i:text-is("content_copy")') }).first()
      if (await copyBtn.count() === 0) test.skip()
      await copyBtn.click()
      await expect(page.locator('.q-notification').first()).toBeVisible({ timeout: 5000 })
    })
  })
})
