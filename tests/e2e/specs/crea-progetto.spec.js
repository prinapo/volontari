import { test, expect } from '../helpers/console.js'
import { loginAs } from '../helpers/login.js'
import { apiLogin } from '../helpers/api.js'
import { deleteFamiglie, deleteProgetti } from '../helpers/cleanup.js'
import { createFamigliaViaUI } from '../helpers/pagina-gestione.js'
import { CreaProgettoPage } from '../pages/CreaProgettoPage.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }

let ids = { famiglia: null, progetto: null }

test.describe('CreaProgettoPage', () => {
  test.describe.configure({ timeout: 180000 })

  test.beforeAll(async () => {
    await apiLogin(auth.admin.email, auth.admin.password)
  })

  test.afterEach(async () => {
    if (ids.progetto) await deleteProgetti(ids.progetto).catch(() => {})
    if (ids.famiglia) await deleteFamiglie(ids.famiglia).catch(() => {})
    ids = { famiglia: null, progetto: null }
  })

  test('CP-01: Admin può aprire la pagina crea progetto @smoke', async ({ page }) => {
    await loginAs(page, 'admin', auth)

    const cp = new CreaProgettoPage(page)
    await cp.goto()

    await expect(page.locator('.text-h5:has-text("Crea progetto di test")')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('[data-testid="btn-crea-progetto"]')).toBeVisible()
    await expect(page.locator('[data-testid="file-allegato-progetto"]')).toBeVisible()
    await expect(page.locator('[data-testid="file-allegato-isee"]')).toBeVisible()
    await expect(page.locator('[data-testid="file-allegato-giustificativi"]')).toBeVisible()
  })

  test('CP-02: Crea progetto completo con tutti i campi e allegati @crud', async ({ page }) => {
    const nomeFamiglia = `TEST_CP_${Date.now()}`

    await loginAs(page, 'manager', auth)
    const fam = await createFamigliaViaUI(page, { nomeFamiglia })
    ids.famiglia = fam.id_famiglia

    await loginAs(page, 'admin', auth)
    const cp = new CreaProgettoPage(page)
    await cp.goto()
    await cp.fillForm({
      famigliaNome: nomeFamiglia,
      Cognome_Beneficiario: `TEST_CP_COG_${Date.now()}`,
      Nome_Beneficiario: 'Beneficiario',
      AnnoBando: new Date().getFullYear(),
      Allocato: 5000,
      Eta: 14,
      Data_Inizio_Progetto: '2026-01-01',
      Data_Fine_Progetto: '2026-12-31',
      Titolo_Progetto: 'TEST Titolo progetto completo',
      Ambito: 'TEST Ambito progetto',
      Relazione_con_il_soggetto_richiedente: 'Genitore',
      Descrizione_Progetto: 'TEST Descrizione progetto completa',
      Descrizione_Condizione: 'TEST Descrizione condizione completa',
      Dettaglio_Costi: 'TEST Dettaglio costi completo',
      attachments: {
        progetto: 'tests/e2e/fixtures/test-file-pdf.pdf',
        isee: 'tests/e2e/fixtures/test-file-pdf.pdf',
        giustificativi: 'tests/e2e/fixtures/test-file-pdf.pdf'
      }
    })

    const uploadResponses = [
      page.waitForResponse(resp => resp.url().includes('/files') && resp.request().method() === 'POST', { timeout: 20000 }),
      page.waitForResponse(resp => resp.url().includes('/files') && resp.request().method() === 'POST', { timeout: 20000 }),
      page.waitForResponse(resp => resp.url().includes('/files') && resp.request().method() === 'POST', { timeout: 20000 })
    ]

    await cp.uploadAttachments({
      progetto: 'tests/e2e/fixtures/test-file-pdf.pdf',
      isee: 'tests/e2e/fixtures/test-file-pdf.pdf',
      giustificativi: 'tests/e2e/fixtures/test-file-pdf.pdf'
    })

    ids.progetto = await cp.submit()
    await Promise.all(uploadResponses)

    expect(ids.progetto).toBeTruthy()
    await expect(page).toHaveURL(/\/admin/, { timeout: 20000 })
  })

  test('CP-03: Submit senza campi obbligatori non crea il progetto @regression', async ({ page }) => {
    await loginAs(page, 'admin', auth)

    const cp = new CreaProgettoPage(page)
    await cp.goto()

    let projectPostCount = 0
    page.on('request', req => {
      if (req.url().includes('/items/Progetti') && req.method() === 'POST') {
        projectPostCount += 1
      }
    })

    await cp.submitButton.click()
    await page.waitForLoadState("networkidle").catch(() => {})

    expect(projectPostCount).toBe(0)
    await expect(page.locator('.text-h5:has-text("Crea progetto di test")')).toBeVisible()
  })
})
