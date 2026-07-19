import { test, expect } from '../helpers/console.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }
import { apiLogin, apiPost } from '../helpers/api.js'
import {
  creaFamigliaVolontarioProgetto,
  loginVolontarioConFamiglia,
  pulisciIds,
  loginGestore
} from '../helpers/setup-atomico.js'

test.describe('Debug Network', () => {
  const ids = { famiglia: null, progetto: null, giustificativi: [] }

  test.beforeAll(async () => {
    await apiLogin(auth.admin.email, auth.admin.password)
  })

  test('NET-DEBUG: Intercetta tutte le richieste durante salvataggio', async ({ page }) => {
    // Intercetta TUTTE le richieste e risposte
    page.on('request', req => {
      if (req.method() !== 'OPTIONS') {
        console.log(`[REQ] ${req.method()} ${req.url().slice(0, 120)}`)
      }
    })
    page.on('response', resp => {
      if (resp.status() >= 400) {
        console.log(`[RES ${resp.status()}] ${resp.request().method()} ${resp.url().slice(0, 120)}`)
      }
    })

    // Setup dati via UI
    await loginGestore(page)
    const { nomeFam } = await creaFamigliaVolontarioProgetto(page, ids)
    ids.nomeFam = nomeFam
    await loginVolontarioConFamiglia(page, nomeFam)

    // Apri dialog
    const aggiungiBtn = page.locator('button:has-text("Aggiungi")')
    await expect(aggiungiBtn).toBeEnabled({ timeout: 15000 })
    await aggiungiBtn.click()
    await expect(page.locator('.q-dialog')).toBeVisible({ timeout: 5000 })
    const dialog = page.locator('.q-dialog')

    // Compila
    await dialog.locator('[data-testid="giustform-descrizione"]').fill(`TEST_NET_${Date.now()}`)
    await dialog.locator('[data-testid="giustform-importo"]').fill('50.00')
    await dialog.locator('input[type="file"]').first().setInputFiles('tests/e2e/fixtures/test-file-pdf.pdf')
    await page.waitForTimeout(500)

    // Verifica bottone e clicca Salva
    const salvaBtn = dialog.locator('[data-testid="giustform-salva"]')
    const isDisabled = await salvaBtn.isDisabled()
    console.log(`[DEBUG] Bottone Salva disabilitato: ${isDisabled}`)

    if (!isDisabled) {
      await salvaBtn.click()
      await page.waitForTimeout(5000)
      console.log('[DEBUG] Attesa 5s completata — controlla i log [REQ] e [RES] sopra')
    } else {
      console.log('[DEBUG] Bottone disabilitato — non posso salvare')
    }

    // Chiudi
    await dialog.locator('button:has-text("Annulla")').click().catch(() => {})
  })

  test.afterEach(async () => {
    await pulisciIds(ids)
  })
})
