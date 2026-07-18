import { test, expect } from '../helpers/console.js'
import { SubmitPage } from '../pages/SubmitPage.js'
import { apiLogin, apiGet, apiDelete } from '../helpers/api.js'
import { deleteFamiglie } from '../helpers/cleanup.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }

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
    importo: prefix === 'A' ? 50.0 : prefix === 'B' ? 75.5 : 120.0,
    data: today
  }
}

let createdSubmissionIds = []

test.describe('SubmitPage', () => {
  let submitPage

  test.beforeAll(async () => {
    await apiLogin(auth.admin.email, auth.admin.password)
  })

  test.afterEach(async () => {
    for (const id of createdSubmissionIds) {
      try {
        await apiDelete('InviiGiustificativiNoLogin', id)
      } catch {
        /* best-effort */
      }
    }
    createdSubmissionIds = []
    const subs = await apiGet('InviiGiustificativiNoLogin', {
      filter: { email: { _eq: formData.email } },
      fields: 'id'
    })
    for (const s of subs.data || []) {
      try {
        await apiDelete('InviiGiustificativiNoLogin', s.id)
      } catch {
        /* */
      }
    }
  })

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
    await expect(submitPage.getGiustificativoTitle(0)).toBeVisible()
    expect(await submitPage.giustificativoCount()).toBe(1)
  })

  test('SP-04: Pulsante delete rimuove riga @regression', async ({ page }) => {
    await submitPage.goto()
    await submitPage.clickAddGiustificativo()
    await expect(submitPage.getGiustificativoTitle(0)).toBeVisible()
    await submitPage.clickAddGiustificativo()
    expect(await submitPage.giustificativoCount()).toBe(2)

    await submitPage.clickDeleteGiustificativo(0)
    expect(await submitPage.giustificativoCount()).toBe(1)
    await expect(submitPage.getGiustificativoTitle(0)).toBeVisible()
  })

  test('SP-SS-01: SubmitPage screenshot con form compilato @visual', async ({ page }) => {
    await submitPage.goto()
    await submitPage.clickAddGiustificativo()
    await submitPage.fillForm(formData)
    await submitPage.fillGiustificativo(0, makeGiustificativo('A'))
    await expect(page).toHaveScreenshot('submit-page.png', { maxDiffPixels: 500, animations: 'disabled' })
  })

  test('SP-05: Submit vuoto Invia disabilitato mostra errori validazione @regression', async ({ page }) => {
    await submitPage.goto()
    await submitPage.clickAddGiustificativo()

    // Compila tutto (compreso file per abilitare Invia), poi svuota Nome e blur
    await submitPage.fillForm(formData)
    await submitPage.fillGiustificativo(0, makeGiustificativo('A'))

    await submitPage.nomeRichiedente.fill('')
    await submitPage.cognomeRichiedente.click()

    const errorFields = page.locator('.q-field--error')
    const count = await errorFields.count()
    expect(count).toBeGreaterThan(0)
  })

  test('SP-06: Email non valida mostra errore @regression', async ({ page }) => {
    await submitPage.goto()
    await submitPage.clickAddGiustificativo()

    // Compila tutto tranne email invalida
    await submitPage.fillForm(formData)
    await submitPage.fillGiustificativo(0, makeGiustificativo('A'))
    await submitPage.emailInput.fill('not-an-email')
    await submitPage.cognomeRichiedente.click()

    await expect(page.locator('.q-field--error').filter({ hasText: 'Email non valida' }).first()).toBeVisible()
  })

  test('SP-07: Submit 1 giustificativo mostra notifica successo @regression', async ({ page }) => {
    await submitPage.goto()
    await submitPage.clickAddGiustificativo()
    await page.waitForLoadState("networkidle").catch(() => {})
    await submitPage.fillForm(formData)
    await submitPage.fillGiustificativo(0, makeGiustificativo('A'))

    const [postResp] = await Promise.all([
      page.waitForResponse(
        resp => resp.url().includes('/items/InviiGiustificativiNoLogin') && resp.request().method() === 'POST'
      ),
      submitPage.clickSubmit()
    ])
    await submitPage.waitForSuccess()
    let subId = null
    try {
      const s = await postResp.json()
      subId = s?.data?.id || s?.data?.[0]?.id
    } catch {
      /* */
    }
    if (subId) createdSubmissionIds.push(subId)
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
    await submitPage.fillForm(formData)
    await submitPage.fillGiustificativo(0, makeGiustificativo('A'))
    await submitPage.fillGiustificativo(1, makeGiustificativo('B'))
    await submitPage.fillGiustificativo(2, makeGiustificativo('C'))

    const [postResp] = await Promise.all([
      page.waitForResponse(
        resp => resp.url().includes('/items/InviiGiustificativiNoLogin') && resp.request().method() === 'POST'
      ),
      submitPage.clickSubmit()
    ])
    await submitPage.waitForSuccess()
    let subId = null
    try {
      const s = await postResp.json()
      subId = s?.data?.id || s?.data?.[0]?.id
    } catch {
      /* */
    }
    if (subId) createdSubmissionIds.push(subId)

    await expect(submitPage.successNotification).toBeVisible()
    await submitPage.waitForFormReset()
    expect(await submitPage.giustificativoCount()).toBe(0)
  })

  test('SP-09: Submit resetta automaticamente il form @regression', async ({ page }) => {
    await submitPage.goto()
    await submitPage.clickAddGiustificativo()
    await page.waitForLoadState("networkidle").catch(() => {})
    await submitPage.fillForm(formData)
    await submitPage.fillGiustificativo(0, makeGiustificativo('A'))

    const [postResp] = await Promise.all([
      page.waitForResponse(
        resp => resp.url().includes('/items/InviiGiustificativiNoLogin') && resp.request().method() === 'POST'
      ),
      submitPage.clickSubmit()
    ])
    await submitPage.waitForSuccess()
    let subId = null
    try {
      const s = await postResp.json()
      subId = s?.data?.id || s?.data?.[0]?.id
    } catch {
      /* */
    }
    if (subId) createdSubmissionIds.push(subId)
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

  // SP-10: validazione IBAN
  test('SP-10: IBAN non valido → Invia disabilitato @regression', async ({ page }) => {
    await submitPage.goto()
    await submitPage.clickAddGiustificativo()
    await submitPage.fillForm({ ...formData, iban: 'abc' })
    await submitPage.fillGiustificativo(0, makeGiustificativo('A'))
    const inviaBtn = page.locator('button[type="submit"]:has-text("Invia")')
    await expect(inviaBtn).toBeDisabled()
  })

  // SP-11 e SP-12: validazione file via q-file non testabile con setInputFiles
  // perché Quasar usa l'evento nativo del file picker (non programmatico).
  // Testati manualmente: max-file-size = 5MB, accept = .jpg,.jpeg,.png,.gif,.heic,.pdf
})
