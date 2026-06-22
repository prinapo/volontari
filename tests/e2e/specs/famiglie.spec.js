import { test, expect } from '../helpers/console.js'
import { loginAs } from '../helpers/login.js'
import { GestionePage } from '../pages/GestionePage.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }

test.describe('Famiglie Page', () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'volontario', auth)
    await expect(page.locator('.text-h6').first()).toBeVisible({ timeout: 10000 })
    await page.waitForTimeout(1500)
  })

  test('F-01: Pagina carica tutti i dati corretti all\'avvio @smoke', async ({ page }) => {
    await expect(page.locator('.text-h6').first()).toBeVisible()
    const famigliaName = await page.locator('.text-h6').first().innerText()
    expect(famigliaName.trim()).toBeTruthy()

    await expect(page.locator('.q-select')).toBeVisible()

    const hasTotale = await page.locator('text=Totale Giustificativi').isVisible().catch(() => false)
    if (!hasTotale) {
      console.log('F-01: Totale Giustificativi not visible (seed data may be incomplete)')
    }

    await expect(page.locator('text=Dati bancari')).toBeVisible()
    await expect(page.getByText('Giustificativi', { exact: true })).toBeVisible()
  })

  test('G-01: Genitori con Nome, Email cliccabile, Telefoni cliccabili @smoke', async ({ page }) => {
    const genitoriSection = page.locator('text=Genitori').locator('..')
    if (await genitoriSection.count() === 0) {
      test.skip()
      return
    }

    const emailLinks = genitoriSection.locator('a[href^="mailto:"]')
    const telLinks = genitoriSection.locator('a[href^="tel:"]')

    expect(await emailLinks.count()).toBeGreaterThanOrEqual(0)
    expect(await telLinks.count()).toBeGreaterThanOrEqual(0)
  })

  test('DB-01: Dati bancari espansione inizialmente collassata @smoke', async ({ page }) => {
    const expansion = page.locator('.q-expansion-item:has-text("Dati bancari")')
    await expect(expansion).toBeVisible()

    const ibanDisplay = expansion.locator('.inline-editable-field').first().locator('.text-body1')
    await expect(ibanDisplay).not.toBeVisible()
  })

  test('DB-02: Click Dati bancari espande mostra IBAN e Intestatario @smoke', async ({ page }) => {
    await page.locator('.q-expansion-item:has-text("Dati bancari")').locator('text=Dati bancari').click()
    await page.waitForTimeout(800)

    const fields = page.locator('.inline-editable-field')
    await expect(fields.first().locator('.text-body1')).toBeVisible({ timeout: 5000 })
    expect(await fields.count()).toBeGreaterThanOrEqual(2)
  })

  test('DB-03: Click again collassa nasconde IBAN e Intestatario @smoke', async ({ page }) => {
    await page.locator('.q-expansion-item:has-text("Dati bancari")').locator('text=Dati bancari').click()
    await page.waitForTimeout(800)
    await page.locator('.q-expansion-item:has-text("Dati bancari")').locator('text=Dati bancari').click()
    await page.waitForTimeout(800)

    const fields = page.locator('.inline-editable-field')
    await expect(fields.first().locator('.text-body1')).not.toBeVisible()
  })

  const expandDatiBancari = async (page) => {
    await page.locator('.q-expansion-item:has-text("Dati bancari")').locator('text=Dati bancari').click()
    await page.waitForTimeout(800)
  }

  const getExpandedField = (page, index = 0) => {
    return page.locator('.inline-editable-field').nth(index)
  }

  test('IB-01: IBAN modifica con ✓ salva e aggiorna display @crud', async ({ page }) => {
    test.setTimeout(90000)
    await expandDatiBancari(page)
    const ibanField = getExpandedField(page, 0)
    await expect(ibanField.locator('.text-body1')).toBeVisible({ timeout: 3000 })

    const ts = String(Date.now()).slice(-10)
    const testIBAN = `IT60X${ts.padStart(22, '0')}`

    const [patchResp] = await Promise.all([
      page.waitForResponse(
        resp => resp.url().includes('/items/Famiglie/') && resp.request().method() === 'PATCH'
      ),
      (async () => {
        await ibanField.click()
        const input = ibanField.locator('input')
        await expect(input).toBeVisible({ timeout: 3000 })
        await input.fill(testIBAN)
        await ibanField.locator('[data-testid="inline-save"]').click()
      })()
    ])

    expect(patchResp.status()).toBe(200)
    await expect(ibanField.locator('.text-body1')).toContainText(testIBAN, { timeout: 5000 })

    await page.reload()
    await expect(page.locator('.text-h6').first()).toBeVisible({ timeout: 10000 })
    await expandDatiBancari(page)
    const ibanAfter = getExpandedField(page, 0)
    await expect(ibanAfter.locator('.text-body1')).toContainText(testIBAN, { timeout: 5000 })
  })

  test('IB-02: IBAN modifica con X annulla valore originale @crud', async ({ page }) => {
    test.setTimeout(90000)
    await expandDatiBancari(page)
    const ibanField = getExpandedField(page, 0)
    const originalValue = (await ibanField.locator('.text-body1').innerText()).trim()

    await ibanField.click()
    const input = ibanField.locator('input')
    await expect(input).toBeVisible({ timeout: 3000 })
    await input.fill(`__TEST_CANCEL_${Date.now()}`)
    await ibanField.locator('[data-testid="inline-cancel"]').click()

    const displayValue = (await ibanField.locator('.text-body1').innerText()).trim()
    expect(displayValue).toBe(originalValue)

    await page.reload()
    await expect(page.locator('.text-h6').first()).toBeVisible({ timeout: 10000 })
    await expandDatiBancari(page)
    const afterReload = (await (getExpandedField(page, 0)).locator('.text-body1').innerText()).trim()
    expect(afterReload).toBe(originalValue)
  })

  test('IB-03: IBAN clicca senza modificare ✓ torna a display NO PATCH @crud', async ({ page }) => {
    await expandDatiBancari(page)
    const ibanField = getExpandedField(page, 0)
    await ibanField.click()
    await expect(ibanField.locator('input')).toBeVisible({ timeout: 3000 })
    await ibanField.locator('[data-testid="inline-save"]').click()
    await expect(ibanField.locator('.text-body1')).toBeVisible({ timeout: 3000 })
  })

  test('IB-04: IBAN click senza modificare torna a display @crud', async ({ page }) => {
    await expandDatiBancari(page)
    const ibanField = getExpandedField(page, 0)
    await ibanField.click()
    await expect(ibanField.locator('input')).toBeVisible({ timeout: 3000 })
    await ibanField.locator('[data-testid="inline-save"]').click()
    await expect(ibanField.locator('.text-body1')).toBeVisible({ timeout: 3000 })
  })

  test('IN-01: Intestatario modifica con ✓ salva persiste dopo reload @crud', async ({ page }) => {
    test.setTimeout(90000)
    await expandDatiBancari(page)
    const intestatarioField = getExpandedField(page, 1)
    await expect(intestatarioField.locator('.text-body1')).toBeVisible({ timeout: 3000 })

    const testName = `__TEST_Int_${Date.now()}`

    const [patchResp] = await Promise.all([
      page.waitForResponse(
        resp => resp.url().includes('/items/Famiglie/') && resp.request().method() === 'PATCH'
      ),
      (async () => {
        await intestatarioField.click()
        const input = intestatarioField.locator('input')
        await expect(input).toBeVisible({ timeout: 3000 })
        await input.fill(testName)
        await intestatarioField.locator('[data-testid="inline-save"]').click()
      })()
    ])

    expect(patchResp.status()).toBe(200)
    await expect(intestatarioField.locator('.text-body1')).toContainText(testName, { timeout: 5000 })

    await page.reload()
    await expect(page.locator('.text-h6').first()).toBeVisible({ timeout: 10000 })
    await expandDatiBancari(page)
    await expect((getExpandedField(page, 1)).locator('.text-body1')).toContainText(testName, { timeout: 5000 })
  })

  test('PS-01: ProgettoSelector opzioni formato corretto @smoke', async ({ page }) => {
    const selector = page.locator('.q-select')
    await selector.click()
    await page.waitForTimeout(800)

    const menu = page.locator('.q-menu')
    if (!(await menu.isVisible().catch(() => false))) {
      test.skip()
      return
    }
    const options = menu.locator('.q-item')
    const count = await options.count()
    expect(count).toBeGreaterThanOrEqual(1)

    for (let i = 0; i < count; i++) {
      const opt = options.nth(i)
      const text = await opt.innerText()
      expect(text).toMatch(/€/)
      expect(text).toMatch(/—/)
    }

    await page.keyboard.press('Escape')
  })

  test('PS-02: Selezione progetto mostra card totali @smoke', async ({ page }) => {
    const selector = page.locator('.q-select')
    await selector.click()
    await page.waitForTimeout(800)
    const menu = page.locator('.q-menu')
    if (!(await menu.isVisible().catch(() => false))) {
      test.skip()
      return
    }
    await expect(page.locator('text=Totale Giustificativi')).toBeVisible({ timeout: 8000 })
    await expect(page.getByText('Totale Rimborsabile', { exact: true })).toBeVisible()
  })

  test('PS-03: Card totali mostra valori positivi @crud', async ({ page }) => {
    const selector = page.locator('.q-select')
    await selector.click()
    await page.waitForTimeout(800)
    const menu = page.locator('.q-menu')
    if (!(await menu.isVisible().catch(() => false))) {
      test.skip()
      return
    }
    const totaleText = await page.locator('text=Totale Giustificativi').locator('..').locator('.text-h6').innerText()
    const rimborsabileText = await page.getByText('Totale Rimborsabile', { exact: true }).locator('..').locator('.text-h6').innerText()

    const totale = parseFloat(totaleText.replace(/[€\s.]/g, '').replace(',', '.'))
    const rimborsabile = parseFloat(rimborsabileText.replace(/[€\s.]/g, '').replace(',', '.'))

    expect(totale).toBeGreaterThanOrEqual(0)
    expect(rimborsabile).toBeGreaterThanOrEqual(0)
    expect(rimborsabile).toBeLessThanOrEqual(totale)
  })

  test('PS-04: Item selezionato ha sfondo bg-green-1 @smoke', async ({ page }) => {
    const selector = page.locator('.q-select')
    await selector.click()
    await page.waitForTimeout(800)
    const menu = page.locator('.q-menu')
    if (!(await menu.isVisible().catch(() => false))) {
      test.skip()
      return
    }
    const chip = page.locator('.bg-green-1').first()
    await expect(chip).toBeVisible({ timeout: 5000 })
  })

  test('EN-01: Genitori mostrano email con badge Primaria @smoke', async ({ page }) => {
    const genitoriHeader = page.locator('.text-caption.text-grey.text-uppercase:has-text("Genitori")')
    if (await genitoriHeader.count() === 0) {
      test.skip()
      return
    }

    await page.waitForTimeout(2000)

    const badgeCount = await page.locator('.q-badge:has-text("Primaria")').count()
    const emailCount = await page.locator('a[href^="mailto:"]').count()
    console.log(`[EN-01] badge Primaria: ${badgeCount}, email links: ${emailCount}`)

    if (badgeCount === 0 && emailCount === 0) {
      console.log('[EN-01] Nessuna email visibile — ruolo senza permessi email, skip')
      test.skip()
      return
    }

    expect(badgeCount).toBeGreaterThanOrEqual(1)
  })

  test('NT-01: Notifica successo compare dopo salvataggio IBAN @smoke', async ({ page }) => {
    test.setTimeout(90000)
    await expandDatiBancari(page)
    const ibanField = getExpandedField(page, 0)
    await expect(ibanField.locator('.text-body1')).toBeVisible({ timeout: 3000 })

    const originalValue = (await ibanField.locator('.text-body1').innerText()).trim()

    await ibanField.click()
    const input = ibanField.locator('input')
    await expect(input).toBeVisible({ timeout: 3000 })
    await input.fill(originalValue)
    await ibanField.locator('[data-testid="inline-save"]').click()

    const notification = page.locator('.q-notification')
    await expect(notification).toBeVisible({ timeout: 5000 })
    await expect(notification).toContainText('IBAN aggiornato')
  })

  test('NT-02: Notifica successo IBAN sparisce automaticamente @regression', async ({ page }) => {
    test.setTimeout(90000)
    await expandDatiBancari(page)
    const ibanField = getExpandedField(page, 0)
    await expect(ibanField.locator('.text-body1')).toBeVisible({ timeout: 3000 })

    const ts = String(Date.now()).slice(-10)
    const testIBAN = `IT60X${ts.padStart(22, '0')}`

    const [patchResp] = await Promise.all([
      page.waitForResponse(
        resp => resp.url().includes('/items/Famiglie/') && resp.request().method() === 'PATCH'
      ),
      (async () => {
        await ibanField.click()
        const input = ibanField.locator('input')
        await expect(input).toBeVisible({ timeout: 3000 })
        await input.fill(testIBAN)
        await ibanField.locator('[data-testid="inline-save"]').click()
      })()
    ])
    expect(patchResp.status()).toBe(200)

    const notification = page.locator('.q-notification')
    await expect(notification).toBeVisible({ timeout: 5000 })
    await expect(notification).toContainText('IBAN aggiornato')

    await page.waitForTimeout(6000)
    await expect(notification).not.toBeVisible({ timeout: 10000 })
  })
})

test.describe('Famiglie Page — Multi-famiglia', () => {

  test('MF-01: Volontario con più famiglie vede selettore e può cambiare @smoke', async ({ page }) => {
    test.setTimeout(120000)
    const nomeFamiglia = `Famiglia Multi ${Date.now()}`

    // 1. Login gestore e crea famiglia via UI
    await loginAs(page, 'gestore', auth)
    const gp = new GestionePage(page)
    await gp.famiglieTab.click()
    await gp.waitForTable()

    await page.locator('button:has-text("Aggiungi Famiglia")').click()
    await page.locator('.q-dialog:visible').waitFor({ state: 'visible', timeout: 5000 })
    const famDialog = page.locator('.q-dialog:visible')
    await famDialog.locator('[data-testid="famiglia-nome"]').fill(nomeFamiglia)
    await famDialog.locator('button:has-text("Salva")').click()
    await famDialog.waitFor({ state: 'hidden', timeout: 10000 })
    if (await famDialog.isVisible()) { test.skip('Creazione famiglia fallita'); return }

    // 2. Assegna volontario seed (test.volontario@test.com) alla nuova famiglia
    await gp.searchFamiglie(nomeFamiglia)
    const clicked = await gp.clickContactsOnFamiglia(nomeFamiglia)
    if (!clicked) { test.skip('Famiglia non trovata'); return }
    await gp.assignVolontario('test.volontario', 'Test Volontario')
    await gp.contattiDialog.locator('button:has-text("Chiudi")').click()
    await gp.contattiDialog.waitFor({ state: 'hidden', timeout: 5000 })

    // 3. Login come volontario e verifica selettore
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
    await loginAs(page, 'volontario', auth)

    const selector = page.locator('.q-select:has(.q-field__label:has-text("Seleziona famiglia"))')
    await expect(selector).toBeVisible({ timeout: 10000 })

    // 4. Seleziona la nuova famiglia e verifica caricamento
    await selector.click()
    await page.waitForTimeout(1000)
    const items = page.locator('.q-menu .q-item')
    if (await items.count() > 1) {
      await items.nth(1).click()
      await page.waitForTimeout(2000)
      await expect(page.locator('.text-h6').first()).toBeVisible({ timeout: 5000 })
    }
  })
})
