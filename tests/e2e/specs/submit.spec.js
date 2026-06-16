import { Buffer } from 'buffer'
import { test, expect } from '../helpers/console.js'
import { SubmitPage } from '../pages/SubmitPage.js'

const formData = {
  nome_richiedente: 'Mario',
  cognome_richiedente: 'Rossi',
  email: 'mario.rossi@test.com',
  telefono: '1234567890',
  iban: 'IT60X12345678901234567890',
  intestatario: 'Mario Rossi',
  nome_beneficiario: 'Luigi',
  cognome_beneficiario: 'Rossi'
}

const today = new Date().toISOString().slice(0, 10)

function makeGiustificativo(prefix = 'A') {
  return {
    descrizione: `Spesa ${prefix} - Acquisto materiale`,
    importo: prefix === 'A' ? 50.00 : prefix === 'B' ? 75.50 : 120.00,
    data: today
  }
}

test.describe('SubmitPage', () => {
  let submitPage

  test.beforeEach(async ({ page }) => {
    submitPage = new SubmitPage(page)
  })

  test('SP-02: Torna al login naviga a /login @smoke', async ({ page }) => {
    await submitPage.goto()
    await expect(page.locator('.submit-page')).toBeVisible({ timeout: 10000 })
    await expect(submitPage.tornaAlLoginLink).toBeVisible()

    await submitPage.clickTornaAlLogin()
    await expect(page).toHaveURL(/\/login/)
  })

  test('SP-03: "+ Aggiungi" aggiunge una riga giustificativo @regression', async ({ page }) => {
    await submitPage.goto()
    expect(await submitPage.giustificativoCount()).toBe(0)

    await submitPage.clickAddGiustificativo()
    await page.waitForTimeout(300)
    expect(await submitPage.giustificativoCount()).toBe(1)
    await expect(submitPage.getGiustificativoTitle(0)).toBeVisible()
  })

  test('SP-04: Pulsante delete rimuove riga @regression', async ({ page }) => {
    await submitPage.goto()
    await submitPage.clickAddGiustificativo()
    await page.waitForTimeout(300)
    await submitPage.clickAddGiustificativo()
    await page.waitForTimeout(300)
    expect(await submitPage.giustificativoCount()).toBe(2)

    await submitPage.clickDeleteGiustificativo(0)
    await page.waitForTimeout(300)
    expect(await submitPage.giustificativoCount()).toBe(1)
    await expect(submitPage.getGiustificativoTitle(0)).toBeVisible()
  })

  test('SP-05: Submit vuoto mostra errori validazione @regression', async ({ page }) => {
    await submitPage.goto()
    await submitPage.clickAddGiustificativo()
    await page.waitForTimeout(300)
    await submitPage.clickSubmit()
    await page.waitForTimeout(500)

    const errorFields = page.locator('.q-field--error')
    const count = await errorFields.count()
    expect(count).toBeGreaterThan(0)
  })

  test('SP-06: Email non valida mostra errore @regression', async ({ page }) => {
    await submitPage.goto()
    await submitPage.clickAddGiustificativo()
    await page.waitForTimeout(300)
    await submitPage.emailInput.fill('not-an-email')
    await page.locator('text=Chi sei').click()
    await submitPage.clickSubmit()
    await page.waitForTimeout(500)

    await expect(page.locator('.q-field--error').filter({ hasText: 'Email non valida' }).first()).toBeVisible()
  })

  test('SP-07: Submit 1 giustificativo mostra notifica successo @regression', async ({ page }) => {
    await submitPage.goto()
    await submitPage.clickAddGiustificativo()
    await page.waitForTimeout(300)
    await submitPage.fillForm(formData)
    await submitPage.fillGiustificativo(0, makeGiustificativo('A'))

    await submitPage.clickSubmit()
    await submitPage.waitForSuccess()

    await expect(submitPage.successNotification).toBeVisible()
    await submitPage.waitForFormReset()
    expect(await submitPage.giustificativoCount()).toBe(0)
  })

  test('SP-08: Submit 3 giustificativi mostra notifica successo @regression', async ({ page }) => {
    await submitPage.goto()
    await submitPage.fillForm(formData)

    await submitPage.clickAddGiustificativo()
    await submitPage.clickAddGiustificativo()
    await submitPage.clickAddGiustificativo()
    await page.waitForTimeout(300)

    await submitPage.fillGiustificativo(0, makeGiustificativo('A'))
    await submitPage.fillGiustificativo(1, makeGiustificativo('B'))
    await submitPage.fillGiustificativo(2, makeGiustificativo('C'))

    await submitPage.clickSubmit()
    await submitPage.waitForSuccess()

    await expect(submitPage.successNotification).toBeVisible()
    await submitPage.waitForFormReset()
    expect(await submitPage.giustificativoCount()).toBe(0)
  })

  test('SP-09: Submit resetta automaticamente il form @regression', async ({ page }) => {
    await submitPage.goto()
    await submitPage.clickAddGiustificativo()
    await page.waitForTimeout(300)
    await submitPage.fillForm(formData)
    await submitPage.fillGiustificativo(0, makeGiustificativo('A'))

    await submitPage.clickSubmit()
    await submitPage.waitForSuccess()

    await expect(submitPage.successNotification).toBeVisible()
    await submitPage.waitForFormReset()
    const vals = await submitPage.getFormValues()
    expect(vals.nome_richiedente).toBe('')
    expect(vals.cognome_richiedente).toBe('')
    expect(vals.email).toBe('')
    expect(vals.telefono).toBe('')
    expect(vals.iban).toBe('')
    expect(vals.intestatario).toBe('')
    expect(vals.nome_beneficiario).toBe('')
    expect(vals.cognome_beneficiario).toBe('')
    expect(await submitPage.giustificativoCount()).toBe(0)
  })

  test('SP-10: File troppo grande mostra errore @regression', async ({ page }) => {
    const submitPage = new SubmitPage(page)
    await submitPage.goto()
    await submitPage.fillForm(formData)
    await submitPage.clickAddGiustificativo()
    await page.waitForTimeout(300)

    // Crea file virtuale > 5MB
    const bigFile = {
      name: 'test.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.alloc(6 * 1024 * 1024)
    }

    // Il q-file ha un input file nascosto
    const fileInput = page.locator('.q-file input[type="file"]').first()
    await fileInput.setInputFiles([bigFile])

    // q-file mostra errore "File size exceeds the limit"
    await expect(page.locator('.q-field__messages .q-field__messages-error').first()).toBeVisible({ timeout: 5000 })
  })

  test('SP-11: Estensione non valida mostra errore @regression', async ({ page }) => {
    const submitPage = new SubmitPage(page)
    await submitPage.goto()
    await submitPage.fillForm(formData)
    await submitPage.clickAddGiustificativo()
    await page.waitForTimeout(300)

    // Crea file con estensione non consentita
    const invalidFile = {
      name: 'test.exe',
      mimeType: 'application/x-msdownload',
      buffer: Buffer.alloc(100)
    }

    const fileInput = page.locator('.q-file input[type="file"]').first()
    await fileInput.setInputFiles([invalidFile])

    // Verifica errore visibile (accett solo .jpg,.jpeg,.png,.gif,.heic,.pdf)
    await expect(page.locator('.q-field__messages .text-negative').first()).toBeVisible({ timeout: 5000 })
  })
})
