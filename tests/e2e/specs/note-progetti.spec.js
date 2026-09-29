import auth from '../fixtures/auth-test.json' with { type: 'json' }
import { apiLogin } from '../helpers/api.js'
import { test, expect } from '../helpers/console.js'
import { loginAs } from '../helpers/login.js'
import { espandiSezione } from '../helpers/pagina-famiglie.js'
import { creaFamigliaVolontarioProgetto, loginVolontarioConFamiglia, pulisciIds } from '../helpers/setup-atomico.js'
import { VerificaPage } from '../pages/VerificaPage.js'

let ids = { famiglia: null, progetto: null }

test.beforeAll(async () => {
  await apiLogin(auth.admin.email, auth.admin.password)
})

async function apriPannelloNoteVolontario(page) {
  await page
    .locator('.text-h6')
    .first()
    .waitFor({ state: 'visible', timeout: 15_000 })
    .catch(() => {})
  await espandiSezione(page, 'Note')
}

test.describe('Note Progetto', () => {
  test.describe.configure({ timeout: 180_000 })

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'manager', auth)
    const r = await creaFamigliaVolontarioProgetto(page, ids)
    ids.nomeFam = r.nomeFam
  })

  test.afterEach(async () => {
    await pulisciIds(ids)
    ids = { famiglia: null, progetto: null, giustificativi: [] }
  })

  test('NT-01: Il volontario vede e crea una nota dalla FamigliePage @crud', async ({ page }) => {
    await loginVolontarioConFamiglia(page, ids.nomeFam)

    await apriPannelloNoteVolontario(page)

    const noteSection = page.locator('.q-expansion-item:has-text("Note")').first()
    await expect(noteSection).toBeVisible()
    await expect(noteSection.getByText('Nessuna nota')).toBeVisible()

    const testo = `TEST_Nota_Volontario_${Date.now()}`
    const input = page.locator('[data-testid="note-input"]')
    await expect(input).toBeVisible({ timeout: 5000 })
    await input.fill(testo)
    await page.locator('[data-testid="note-add"]').click()

    await expect(noteSection.getByText(testo)).toBeVisible({ timeout: 5000 })
    // Autore (nome reale dall'utente loggato) + data compilati
    await expect(noteSection.getByText('Volontario Test ·').first()).toBeVisible({ timeout: 5000 })
  })

  test('NT-02: Il manager vede e crea una nota dal Dettaglio progetto @crud', async ({ page }) => {
    await loginAs(page, 'manager', auth)
    await page.goto('/verifica')
    await expect(page.locator('.verifica-table')).toBeVisible({ timeout: 15_000 })
    await page.waitForLoadState('networkidle').catch(() => {})

    const verifica = new VerificaPage(page)
    const viewport = await page.viewportSize()
    const isMobile = viewport && viewport.width < 600

    let detailBtn
    if (isMobile) {
      const expItem = page.locator('.q-expansion-item').first()
      await expItem.waitFor({ state: 'attached', timeout: 15_000 })
      await expItem.click()
      await page.waitForLoadState('networkidle').catch(() => {})
      detailBtn = page.locator('button[aria-label="Dettaglio progetto"]').first()
    } else {
      detailBtn = page.locator('[data-testid="btn-detail-row"]').first()
      await verifica.waitForTable()
    }
    await expect(detailBtn).toBeVisible({ timeout: 5000 })
    await detailBtn.click()

    const dialog = page.locator('[data-testid="progetto-detail-dialog"]')
    await expect(dialog).toBeVisible({ timeout: 3000 })

    const testo = `TEST_Nota_Manager_${Date.now()}`
    const input = dialog.locator('[data-testid="note-input"]')
    await expect(input).toBeVisible({ timeout: 5000 })
    await input.fill(testo)
    await dialog.locator('[data-testid="note-add"]').click()

    await expect(dialog.getByText(testo).first()).toBeVisible({ timeout: 5000 })
    await expect(dialog.locator('.text-caption:has-text("Manager ·")').first()).toBeVisible({ timeout: 5000 })

    await dialog.locator('[data-testid="detail-chiudi"]').click()
    await expect(dialog).not.toBeVisible({ timeout: 3000 })
  })

  test('NT-03: Il manager vede e usa la sezione Note nella riga espansa @crud', async ({ page }) => {
    await loginAs(page, 'manager', auth)
    await page.goto('/verifica')
    await expect(page.locator('.verifica-table')).toBeVisible({ timeout: 15_000 })
    await page.waitForLoadState('networkidle').catch(() => {})

    const viewport = await page.viewportSize()
    const isMobile = viewport && viewport.width < 600

    // Espande la prima riga
    if (isMobile) {
      const expItem = page.locator('.q-expansion-item').first()
      await expItem.waitFor({ state: 'attached', timeout: 15_000 })
      await expItem.click()
      await page.waitForLoadState('networkidle').catch(() => {})
    } else {
      await page.locator('[data-testid="expand-row"]').first().click()
      await page
        .locator('.expandable-content')
        .first()
        .waitFor({ state: 'visible', timeout: 5000 })
        .catch(() => {})
    }

    // Sezione Note visibile sotto i giustificativi
    const noteSection = isMobile
      ? page.locator('.q-expansion-item').first().locator('.text-subtitle2:has-text("Note")').first()
      : page.locator('.expandable-content').first().locator('.text-subtitle2:has-text("Note")').first()
    await expect(noteSection).toBeVisible({ timeout: 5000 })

    // Aggiunge una nota inline
    const input = page.locator('[data-testid="note-input"]').first()
    await expect(input).toBeVisible({ timeout: 5000 })
    const testo = `TEST_Nota_Inline_${Date.now()}`
    await input.fill(testo)
    await page.locator('[data-testid="note-add"]').first().click()

    await expect(page.locator(`text=${testo}`).first()).toBeVisible({ timeout: 5000 })
    await expect(page.locator('.text-caption:has-text("·")').first()).toBeVisible({ timeout: 5000 })
  })

  test('NT-04: Bottone rapido aggiunge una nota dal dialog @crud', async ({ page }) => {
    await loginAs(page, 'manager', auth)
    await page.goto('/verifica')
    await expect(page.locator('.verifica-table')).toBeVisible({ timeout: 15_000 })
    await page.waitForLoadState('networkidle').catch(() => {})

    const viewport = await page.viewportSize()
    const isMobile = viewport && viewport.width < 600

    // Espande la riga per poter vedere la nota dopo il salvataggio
    if (isMobile) {
      const expItem = page.locator('.q-expansion-item').first()
      await expItem.waitFor({ state: 'attached', timeout: 15_000 })
      await expItem.click()
      await page.waitForLoadState('networkidle').catch(() => {})
    } else {
      await page.locator('[data-testid="expand-row"]').first().click()
      await page
        .locator('.expandable-content')
        .first()
        .waitFor({ state: 'visible', timeout: 5000 })
        .catch(() => {})
    }

    let btn
    if (isMobile) {
      btn = page.locator('button[aria-label="Aggiungi nota"]').first()
    } else {
      btn = page.locator('[data-testid="btn-add-note"]').first()
    }
    await expect(btn).toBeVisible({ timeout: 5000 })
    await btn.click()

    const testo = `TEST_Nota_Rapida_${Date.now()}`
    const input = page.locator('[data-testid="nota-rapida-input"]')
    await expect(input).toBeVisible({ timeout: 5000 })
    await input.fill(testo)
    await page.locator('[data-testid="nota-rapida-salva"]').click()

    await expect(page.locator(`text=${testo}`).first()).toBeVisible({ timeout: 5000 })
    await expect(page.locator('.text-caption:has-text("·")').first()).toBeVisible({ timeout: 5000 })
  })
})
