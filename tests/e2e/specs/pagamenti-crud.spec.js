import auth from '../fixtures/auth-test.json' with { type: 'json' }
import { apiLogin } from '../helpers/api.js'
import { test, expect } from '../helpers/console.js'
import { loginAs } from '../helpers/login.js'
import { createFamigliaViaUI } from '../helpers/pagina-gestione.js'
import { createProgettoViaUI } from '../pages/CreaProgettoPage.js'

const TS = Date.now()
const NOME_FAM = `TEST_PAG_${TS}`

test.describe('Pagamenti CRUD', () => {
  let ids = { famiglia: null, progetto: null, giustificativi: [] }

  test.beforeAll(async () => {
    await apiLogin(auth.admin.email, auth.admin.password)
  })

  async function setupData(page) {
    await loginAs(page, 'admin', auth)
    await page.goto('/gestione')
    await page.waitForLoadState('networkidle')
    await page.locator('.q-tab:has-text("Famiglie")').click()
    await page.waitForLoadState('networkidle')

    await createFamigliaViaUI(page, { nomeFamiglia: NOME_FAM })
    await page.waitForLoadState('networkidle')

    ids.progetto = await createProgettoViaUI(
      page,
      {
        famigliaNome: NOME_FAM,
        Cognome_Beneficiario: 'TEST_PAG',
        Nome_Beneficiario: 'Test',
        AnnoBando: new Date().getFullYear(),
        Allocato: 5000,
        Ambito: 'Sociale',
        Titolo_Progetto: 'Test pagamenti'
      },
      auth
    )
  }

  test('PAG-31: Bonifici da fare ha tabella @smoke', async ({ page }) => {
    await setupData(page)
    await page.goto('/pagamenti')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.q-tab:has-text("Bonifici da fare")')).toBeVisible({ timeout: 5000 })
  })

  test('PAG-32: Da riscontrare tab visibile @smoke', async ({ page }) => {
    await loginAs(page, 'manager', auth)
    await page.goto('/pagamenti')
    await page.waitForLoadState('networkidle')
    await page.locator('.q-tab:has-text("Da riscontrare")').click()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.q-tab--active:has-text("Da riscontrare")')).toBeVisible({ timeout: 5000 })
  })

  test('PAG-33: Falliti tab visibile @smoke', async ({ page }) => {
    await loginAs(page, 'manager', auth)
    await page.goto('/pagamenti')
    await page.waitForLoadState('networkidle')
    await page.locator('.q-tab:has-text("Falliti")').click()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.q-tab--active:has-text("Falliti")')).toBeVisible({ timeout: 5000 })
  })

  test('PAG-34: Liste esportazione tab visibile @smoke', async ({ page }) => {
    await loginAs(page, 'manager', auth)
    await page.goto('/pagamenti')
    await page.waitForLoadState('networkidle')
    await page.locator('.q-tab:has-text("Liste esportazione")').click()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.q-tab--active:has-text("Liste esportazione")')).toBeVisible({ timeout: 5000 })
  })
})
