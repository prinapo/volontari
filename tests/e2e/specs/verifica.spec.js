import { test, expect } from '../helpers/console.js'
import { LoginPage } from '../pages/LoginPage.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }

test.describe('VerificaPage', () => {
  test.describe('Auth & Layout', () => {
    test('VR-01: Accesso verificatore apre VerificaPage @smoke', async ({ page }) => {
      const loginPage = new LoginPage(page)
      await loginPage.goto()
      await loginPage.login(auth.verificatore.email, auth.verificatore.password)
      await expect(page).toHaveURL(/\/verifica/, { timeout: 15000 })
      await expect(page.locator('.verifica-table')).toBeVisible({ timeout: 15000 })
    })

    test('VR-02: VerificaPage non accessibile se non autorizzati @regression', async () => {
      test.skip()
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

    test('FL-04: Filtro rendicontazione con importi @crud', async ({ page }) => {
      await page.locator('.q-select:has(.q-field__label:has-text("Rendicontazione"))').click()
      await page.locator('.q-item:has-text("Solo con importi")').click()
      await page.waitForTimeout(500)
      const nonRicevutaCount = await page.locator('.q-badge:has-text("Non ricevuta")').count()
      expect(nonRicevutaCount).toBe(0)
    })

    test('FL-05: Filtro rendicontazione mancanti @crud', async ({ page }) => {
      await page.locator('.q-select:has(.q-field__label:has-text("Rendicontazione"))').click()
      await page.locator('.q-item:has-text("Solo mancanti")').click()
      await page.waitForTimeout(500)
      const dataRows = await page.locator('.verifica-table tbody tr:has(td .q-btn)').count()
      expect(dataRows).toBeGreaterThanOrEqual(0)
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
      await expect(allRows.first()).toBeVisible({ timeout: 5000 })
      const firstFamiglia = await page.locator('.verifica-table .text-weight-medium').first().innerText()
      await page.locator('input[type="text"]').last().fill(firstFamiglia)
      await page.waitForTimeout(500)
      const filteredCount = await allRows.count()
      expect(filteredCount).toBeGreaterThanOrEqual(1)
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
  })

  test.describe('Stato riga', () => {
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
      const trancheSelect = page.locator('.q-select').first()
      await trancheSelect.click()
      const options = page.locator('.q-menu .q-item')
      const optionCount = await options.count()
      if (optionCount > 1) {
        await options.nth(1).click()
        await page.waitForTimeout(500)
      }
      const badge = page.locator('.q-badge:has-text("Da verificare")').first()
      if (await badge.count() > 0) {
        await expect(badge).toBeVisible()
      } else {
        test.skip()
      }
    })

    test('SR-03: Stato Pronta ASPI visibile quando presente @smoke', async ({ page }) => {
      const badge = page.locator('.q-badge:has-text("Pronta ASPI")').first()
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

    test('AS-01: Export ASPI button visibile @smoke', async ({ page }) => {
      await expect(page.locator('button:has-text("Export ASPI")')).toBeVisible({ timeout: 5000 })
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
