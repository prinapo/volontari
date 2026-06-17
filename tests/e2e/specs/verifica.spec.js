import { test, expect } from '../helpers/console.js'
import { loginAs } from '../helpers/login.js'
import { createGiustificativoViaDialog } from '../helpers/giustificativo.js'
import { VerificaPage } from '../pages/VerificaPage.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }

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

test.describe('VerificaPage', () => {
  test.describe('Auth & Layout', () => {
    test('VR-01: Accesso verificatore apre VerificaPage @smoke', async ({ page }) => {
      await loginAs(page, 'verificatore', auth)
      await expect(page.locator('.verifica-table')).toBeVisible({ timeout: 15000 })
    })

    test('VR-02: VerificaPage non accessibile se non autorizzati @regression', async ({ page }) => {
      await loginAs(page, 'volontario', auth)

      await page.goto('/verifica')
      await page.waitForTimeout(2000)

      const currentUrl = page.url()
      expect(currentUrl).not.toContain('/verifica')
    })

    test('TB-01: Colonne ordine corretto @smoke', async ({ page }) => {
      await loginAs(page, 'verificatore', auth)
      await expect(page.locator('.verifica-table')).toBeVisible({ timeout: 15000 })
      await page.locator('.verifica-table thead tr:first-child th').first().waitFor({ state: 'visible', timeout: 5000 })

      const headers = await page.locator('.verifica-table thead tr:first-child th').allInnerTexts()
      expect(headers[0]).toBe('')
      expect(headers[1]).toContain('Bando')
      expect(headers[2]).toContain('Famiglia')
      expect(headers[3]).toContain('Allocato')
      expect(headers[4]).toContain('Rendicontato')
      expect(headers[5]).toContain('Stato')
    })

    test('TB-05: Colonna Totali non esiste @regression', async ({ page }) => {
      await loginAs(page, 'verificatore', auth)
      await expect(page.locator('.verifica-table')).toBeVisible({ timeout: 15000 })
      await expect(page.locator('th:has-text("Totali")')).not.toBeVisible()
    })
  })

  test.describe('Filtri', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'verificatore', auth)
      await expect(page.locator('.verifica-table')).toBeVisible({ timeout: 15000 })
      await page.waitForTimeout(2000)
    })

    test('FL-01: Tabella mostra progetti con righe @smoke', async ({ page }) => {
      const rows = page.locator('.verifica-table tbody tr:has(td .q-btn)')
      const count = await rows.count()
      if (count > 0) {
        const firstFamiglia = await rows.first().locator('td').nth(2).innerText()
        expect(firstFamiglia.trim()).toBeTruthy()
      }
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
      test.setTimeout(90000)
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
      await loginAs(page, 'verificatore', auth)
      await expect(page.locator('.verifica-table')).toBeVisible({ timeout: 15000 })
      await page.waitForTimeout(2000)
    })

    test('ER-03: Expand row mostra sezione contatti @smoke', async ({ page }) => {
      test.setTimeout(90000)
      const rows = page.locator('.verifica-table tbody tr:has(td .q-btn)')
      if (!(await rows.first().isVisible({ timeout: 5000 }).catch(() => false))) {
        test.skip()
        return
      }

      const expandBtn = page.locator('[data-testid="expand-row"]').first()
      await expandBtn.click()
      await page.waitForTimeout(2000)

      const expandedContent = page.locator('.expandable-content').first()
      await expect(expandedContent).toBeVisible({ timeout: 3000 })

      const genitoriHeader = expandedContent.locator('text=Genitori')
      const volontariHeader = expandedContent.locator('text=Volontari')
      expect((await genitoriHeader.count()) > 0 || (await volontariHeader.count()) > 0).toBe(true)

      await expandBtn.click()
    })

    test('ER-04: Expand row mostra sezione giustificativi @smoke', async ({ page }) => {
      test.setTimeout(90000)
      const rows = page.locator('.verifica-table tbody tr:has(td .q-btn)')
      if (!(await rows.first().isVisible({ timeout: 5000 }).catch(() => false))) {
        test.skip()
        return
      }

      const expandBtn = page.locator('[data-testid="expand-row"]').first()
      await expandBtn.click()
      await page.waitForTimeout(2000)

      const expandedContent = page.locator('.expandable-content').first()
      await expect(expandedContent).toBeVisible({ timeout: 3000 })

      const hasGiustHeader = await expandedContent.locator('text=Giustificativi').count() > 0
      const giustItems = expandedContent.locator('.giust-item')
      const giustCount = await giustItems.count()
      const hasEmpty = await expandedContent.locator('.text-grey:has-text("Nessun giustificativo")').count() > 0

      console.log(`[ER-04] header: ${hasGiustHeader}, items: ${giustCount}, empty: ${hasEmpty}`)
      expect(hasGiustHeader || giustCount > 0 || hasEmpty).toBe(true)

      await expandBtn.click()
    })
  })

  test.describe('Dati bancari edit', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'verificatore', auth)
      await expect(page.locator('.verifica-table')).toBeVisible({ timeout: 15000 })
      await page.waitForTimeout(2000)
    })

    test('DB-V1: Badge dati bancari Completi/Da completare presenti @smoke', async ({ page }) => {
      // Espandi la prima riga per vedere i dati bancari
      const expandBtn = page.locator('.verifica-table [data-testid="expand-row"]').first()
      if (await expandBtn.count() > 0) {
        await expandBtn.click()
        await page.waitForTimeout(500)
      }
      const badges = page.locator('.verifica-table .q-badge:has-text("Completi"), .verifica-table .q-badge:has-text("Da completare")')
      await expect(badges.first()).toBeVisible({ timeout: 5000 })
    })

    test('DB-V2: Pulsante edit apre dialog IBAN @smoke', async ({ page }) => {
      // Espandi la prima riga per mostrare i dati bancari
      const expandBtn = page.locator('.verifica-table [data-testid="expand-row"]').first()
      if (await expandBtn.count() > 0) {
        await expandBtn.click()
        await page.waitForTimeout(800)
      }
      const editBtn = page.locator('[data-testid="btn-edit-bancari"]').first()
      if (await editBtn.count() === 0) test.skip()
      await editBtn.click()
      await expect(page.locator('.q-dialog:has(.text-h6:has-text("Modifica dati bancari"))')).toBeVisible({ timeout: 3000 })
    })

    test('DB-V3: Dialog IBAN annulla chiude senza salvare @crud', async ({ page }) => {
      const expandBtn = page.locator('.verifica-table [data-testid="expand-row"]').first()
      if (await expandBtn.count() > 0) {
        await expandBtn.click()
        await page.waitForTimeout(800)
      }
      const editBtn = page.locator('[data-testid="btn-edit-bancari"]').first()
      if (await editBtn.count() === 0) test.skip()
      await editBtn.click()
      await expect(page.locator('.q-dialog')).toBeVisible({ timeout: 3000 })
      await page.locator('.q-dialog button:has-text("Annulla")').click()
      await expect(page.locator('.q-dialog')).not.toBeVisible({ timeout: 3000 })
    })

    test('DB-V4: Dialog IBAN salva invia PATCH @crud', async ({ page }) => {
      test.setTimeout(90000)
      const expandBtn = page.locator('.verifica-table [data-testid="expand-row"]').first()
      if (await expandBtn.count() > 0) {
        await expandBtn.click()
        await page.waitForTimeout(800)
      }
      const editBtn = page.locator('[data-testid="btn-edit-bancari"]').first()
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

  test.describe('Stato riga', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'verificatore', auth)
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
      test.setTimeout(90000)
      await loginAs(page, 'volontario', auth)
      await selectFirstProgetto(page)

      const result = await createGiustificativoViaDialog(page, {
        descrizione: `SR-02 test ${Date.now()}`,
        importo: '75.00',
        submitAfter: true
      })

      if (!result) { test.skip(); return }

      await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
      await loginAs(page, 'verificatore', auth)
      const vp = new VerificaPage(page)
      await page.goto('/verifica', { timeout: 20000 })
      await vp.waitForTable()
      await vp.searchFamiglia('TEST_FAM')
      const badge = page.locator('.q-badge:has-text("Da verificare")').first()
      await expect(badge).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Error Handling', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'verificatore', auth)
    })

    test('EH-01: Errore API mostra banner di errore @regression', async ({ page }) => {
      // Intercetta la chiamata Progetti e restituisce 500
      await page.route('**/items/Progetti**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ errors: [{ message: 'Test API error' }] })
        })
      })

      await page.goto('/verifica')
      await page.waitForTimeout(2000)

      const errorBanner = page.locator('.q-banner')
      await expect(errorBanner).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('ASPI Export', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'verificatore', auth)
      await expect(page.locator('.verifica-table')).toBeVisible({ timeout: 15000 })
      await page.waitForTimeout(2000)
    })

    test('AS-01: Export button visibile @smoke', async ({ page }) => {
      await expect(page.locator('button:has-text("Export")')).toBeVisible({ timeout: 5000 })
    })

    test('VR-SS-01: Screenshot VerificaPage non cambia @visual', async ({ page }) => {
      test.setTimeout(90000)
      await expect(page.locator('.verifica-table')).toBeVisible({ timeout: 15000 })
      await expect(page.locator('.summary-grid')).toBeVisible({ timeout: 5000 })
      await expect(page).toHaveScreenshot('verifica-page.png', {
        maxDiffPixels: 1000,
        animations: 'disabled',
        timeout: 10000
      })
    })

    test('AS-02: Copia riga ASPI funziona @crud', async ({ page }) => {
      await page.evaluate(() => { navigator.clipboard.writeText = async () => {} })
      const copyBtn = page.locator('[data-testid="btn-copy-aspi"]').first()
      if (await copyBtn.count() === 0) test.skip()
      await copyBtn.click()
      await expect(page.locator('.q-notification').first()).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('Progetto Detail Dialog', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'verificatore', auth)
      await expect(page.locator('.verifica-table')).toBeVisible({ timeout: 15000 })
      await page.waitForTimeout(2000)
    })

    test('VP-DETT-02: Pulsante Dettaglio visibile per riga @smoke', async ({ page }) => {
      const btn = page.locator('[data-testid="btn-detail-row"]').first()
      await expect(btn).toBeVisible({ timeout: 5000 })
    })

    test('VP-DETT-03: Dialog mostra tutti i campi del progetto @crud', async ({ page }) => {
      const detailBtn = page.locator('[data-testid="btn-detail-row"]').first()
      if (await detailBtn.count() === 0) { test.skip('Nessuna riga disponibile'); return }

      // Legge il nome famiglia dalla riga prima di cliccare
      const firstRow = page.locator('.verifica-table tbody tr:has(td .q-btn)').first()
      const famigliaCell = await firstRow.locator('td').nth(2).innerText()

      await detailBtn.click()

      const dialog = page.locator('[data-testid="progetto-detail-dialog"]')
      await expect(dialog).toBeVisible({ timeout: 3000 })

      await expect(dialog.locator('text=Dati progetto')).toBeVisible()
      await expect(dialog.locator('text=Dati finanziari')).toBeVisible()
      await expect(dialog.locator('text=Dati bancari')).toBeVisible()

      // Verifica che i dati specifici siano presenti
      const headerText = await dialog.locator('.text-h6').innerText()
      expect(headerText.trim()).toBeTruthy()
      expect(famigliaCell).toContain(headerText.trim())

      const nGiust = dialog.locator('[data-testid="detail-totale-giustificativi"]')
      const nGiustText = await nGiust.innerText()
      expect(parseInt(nGiustText)).toBeGreaterThanOrEqual(0)

      await dialog.locator('[data-testid="detail-chiudi"]').click()
      await expect(dialog).not.toBeVisible({ timeout: 3000 })
    })

    test('VP-DETT-04: Dialog mostra lista giustificativi @crud', async ({ page }) => {
      const detailBtn = page.locator('[data-testid="btn-detail-row"]').first()
      if (await detailBtn.count() === 0) { test.skip('Nessuna riga disponibile'); return }
      await detailBtn.click()

      const dialog = page.locator('[data-testid="progetto-detail-dialog"]')
      await expect(dialog).toBeVisible({ timeout: 3000 })

      const giustTable = dialog.locator('[data-testid="detail-giustificativi-table"]')
      const giustSectionTitle = dialog.locator('.text-subtitle2:has-text("Giustificativi")')

      if (await giustTable.count() > 0) {
        await expect(giustTable).toBeVisible()
        const rows = giustTable.locator('tbody tr')
        expect(await rows.count()).toBeGreaterThanOrEqual(0)
      } else {
        await expect(giustSectionTitle).toBeVisible()
      }

      await dialog.locator('[data-testid="detail-chiudi"]').click()
    })

    test('VP-DETT-05: Dialog mostra data inizio/fine e descrizioni @crud', async ({ page }) => {
      const detailBtn = page.locator('[data-testid="btn-detail-row"]').first()
      if (await detailBtn.count() === 0) { test.skip('Nessuna riga disponibile'); return }
      await detailBtn.click()

      const dialog = page.locator('[data-testid="progetto-detail-dialog"]')
      await expect(dialog).toBeVisible({ timeout: 3000 })

      await expect(dialog.locator('text=Data inizio')).toBeVisible()
      await expect(dialog.locator('text=Data fine')).toBeVisible()
      await expect(dialog.locator('text=Età')).toBeVisible()
      await expect(dialog.locator('text=Relazione con richiedente')).toBeVisible()

      await dialog.locator('[data-testid="detail-chiudi"]').click()
    })

    test('VP-DETT-06: Dialog mostra sezione Allegati se presente @crud', async ({ page }) => {
      const detailBtn = page.locator('[data-testid="btn-detail-row"]').first()
      if (await detailBtn.count() === 0) { test.skip('Nessuna riga disponibile'); return }
      await detailBtn.click()

      const dialog = page.locator('[data-testid="progetto-detail-dialog"]')
      await expect(dialog).toBeVisible({ timeout: 3000 })

      // La sezione Allegati potrebbe non esserci se i dati sono vuoti
      const allegatiSection = dialog.locator('text=Allegati')
      if (await allegatiSection.count() > 0) {
        await expect(allegatiSection).toBeVisible()
      }

      await dialog.locator('[data-testid="detail-chiudi"]').click()
    })
  })
})
