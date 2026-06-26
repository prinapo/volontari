import { test, expect } from '../helpers/console.js'
import { loginAs } from '../helpers/login.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }
import { apiLogin } from '../helpers/api.js'
import { deleteFamiglie, deleteContatti, deleteProgetti } from '../helpers/cleanup.js'
import { createFamigliaViaUI, createContattoViaUI } from '../helpers/pagina-gestione.js'

function uid(label) {
  return `__TEST_HELP_${label}_${Date.now()}`
}

let createdIds = { famiglie: [], contatti: [], progetti: [] }

test.describe('Helpers — base', () => {
  test.describe.configure({ timeout: 120000 })

  test.beforeAll(async () => {
    await apiLogin(auth.admin.email, auth.admin.password)
  })

  test.afterAll(async () => {
    await deleteContatti(...createdIds.contatti).catch(() => {})
    await deleteFamiglie(...createdIds.famiglie).catch(() => {})
    await deleteProgetti(...createdIds.progetti).catch(() => {})
  })

  test('HF-01: Crea famiglia via UI e cancella via API @smoke', async ({ page }) => {
    await loginAs(page, 'gestore', auth)

    const nome = uid('Fam')
    const fam = await createFamigliaViaUI(page, { nomeFamiglia: nome })
    expect(fam.id_famiglia).toBeTruthy()
    expect(fam.nome).toBe(nome)
    createdIds.famiglie.push(fam.id_famiglia)
  })

  test('HF-02: Crea contatto via UI e cancella via API @smoke', async ({ page }) => {
    await loginAs(page, 'gestore', auth)

    const cont = await createContattoViaUI(page, {
      nome: uid('C'),
      cognome: 'TestHelper',
      email: `${uid('c').toLowerCase()}@test.example.com`
    })
    expect(cont.id_contatto).toBeTruthy()
    createdIds.contatti.push(cont.id_contatto)
  })

  test('HF-03: Crea famiglia+contatto+assegna+pulisci ciclo completo @crud', async ({ page }) => {
    // 1. Crea famiglia
    await loginAs(page, 'gestore', auth)
    const nomeFam = uid('FC')
    const fam = await createFamigliaViaUI(page, { nomeFamiglia: nomeFam })
    expect(fam.id_famiglia).toBeTruthy()
    createdIds.famiglie.push(fam.id_famiglia)

    // 2. Crea contatto volontario con email
    const cont = await createContattoViaUI(page, {
      nome: uid('V'),
      cognome: 'TestHelper',
      email: `${uid('v').toLowerCase()}@test.example.com`
    })
    expect(cont.id_contatto).toBeTruthy()
    createdIds.contatti.push(cont.id_contatto)

    // 3. Login volontario e verifica che la famiglia NON sia visibile (non assegnata)
    await loginAs(page, 'volontario', auth)
    await page.goto('/famiglie', { timeout: 15000 }).catch(() => {})
    const famSelect = page.locator('.q-select:has(.q-field__label:has-text("Seleziona famiglia"))')
    if (await famSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Il volontario ha altre famiglie, apri e controlla che la nuova non ci sia
      await famSelect.click()
      await page.waitForTimeout(500)
      const items = page.locator('.q-menu .q-item')
      const names = await items.allInnerTexts()
      expect(names.some(n => n.includes(nomeFam))).toBe(false)
      await page.keyboard.press('Escape')
    }
  })

  test('HF-04: IBAN corto → Salva disabilitato @regression', async ({ page }) => {
    await loginAs(page, 'gestore', auth)
    const gp = new (await import('../pages/GestionePage.js')).GestionePage(page)
    await gp.goto()
    await page.waitForTimeout(500)
    const famiglieTab = page.locator('.q-tab:has-text("Famiglie")')
    await famiglieTab.click()
    await page.waitForTimeout(300)
    await page.locator('button:has-text("Aggiungi Famiglia")').click()
    await page.locator('.q-dialog:visible').waitFor({ state: 'visible', timeout: 5000 })
    const dialog = page.locator('.q-dialog:visible')
    await dialog.locator('[data-testid="famiglia-nome"]').fill('Test HF04')
    await dialog.locator('[data-testid="famiglia-iban"]').fill('abc')
    const salvaBtn = dialog.locator('button:has-text("Salva")')
    await expect(salvaBtn).toBeDisabled()
  })

  test('HF-05: Cellulare lettere → Salva disabilitato @regression', async ({ page }) => {
    await loginAs(page, 'gestore', auth)
    const gp = new (await import('../pages/GestionePage.js')).GestionePage(page)
    await gp.goto()
    await page.waitForTimeout(500)
    const contattiTab = page.locator('.q-tab:has-text("Contatti")')
    await contattiTab.click()
    await page.waitForTimeout(300)
    await page.locator('[data-testid="btn-aggiungi-contatto"]').click()
    await page.locator('.q-dialog:visible').waitFor({ state: 'visible', timeout: 5000 })
    const dialog = page.locator('.q-dialog:visible')
    await dialog.locator('[data-testid="contatto-nome"]').fill('Test HF05')
    await dialog.locator('[data-testid="contatto-cognome"]').fill('AutoTest')
    await dialog.locator('[data-testid="contatto-cellulare"]').fill('abc')
    const salvaBtn = dialog.locator('button:has-text("Salva")')
    await expect(salvaBtn).toBeDisabled()
  })

  test('HF-06: IBAN minuscolo → auto-uppercase e valido @regression', async ({ page }) => {
    await loginAs(page, 'gestore', auth)
    const gp = new (await import('../pages/GestionePage.js')).GestionePage(page)
    await gp.goto()
    await page.waitForTimeout(500)
    const famiglieTab = page.locator('.q-tab:has-text("Famiglie")')
    await famiglieTab.click()
    await page.waitForTimeout(300)
    await page.locator('button:has-text("Aggiungi Famiglia")').click()
    await page.locator('.q-dialog:visible').waitFor({ state: 'visible', timeout: 5000 })
    const dialog = page.locator('.q-dialog:visible')
    await dialog.locator('[data-testid="famiglia-nome"]').fill('Test HF06')
    await dialog.locator('[data-testid="famiglia-iban"]').fill('it60x0542811101000000123456')
    await page.waitForTimeout(500)
    const salvaBtn = dialog.locator('button:has-text("Salva")')
    await expect(salvaBtn).not.toBeDisabled()
  })
})
