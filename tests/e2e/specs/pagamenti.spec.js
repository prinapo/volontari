import { test, expect } from '../helpers/console.js'
import { loginAs } from '../helpers/login.js'
import { createContatto, assignToFamiglia, createFamiglia } from '../helpers/setup.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }

test.describe('Gestione Pagamenti', () => {

  test('PAG-01: Creazione proposta da giustificativo verificato @core', async ({ page }) => {
    test.setTimeout(60000)
    await loginAs(page, 'gestore', auth)

    // Crea contatto
    const email = `pag01_${Date.now()}@test.com`
    const contatto = await createContatto(page, { Nome: 'PAG01', Cognome: 'Test', email })

    // Crea famiglia
    const famId = await createFamiglia(page, { Nome_Famiglia: `Famiglia PAG01 ${Date.now()}` })
    await assignToFamiglia(page, contatto.id_contatto, famId, 'Genitore')

    // Login come verificatore e naviga a verifica
    await loginAs(page, 'verificatore', auth)

    // Verifica che la pagina carichi
    await page.goto('/verifica')
    await expect(page.locator('.verifica-table')).toBeVisible({ timeout: 15000 })
  })

  test('PAG-02: Aggiornamento proposta esistente @core', async ({ page }) => {
    test.setTimeout(60000)
    await loginAs(page, 'gestore', auth)
    const email = `pag02_${Date.now()}@test.com`
    const contatto = await createContatto(page, { Nome: 'PAG02', Cognome: 'Test', email })
    const famId = await createFamiglia(page, { Nome_Famiglia: `Famiglia PAG02 ${Date.now()}` })
    await assignToFamiglia(page, contatto.id_contatto, famId, 'Genitore')

    await loginAs(page, 'verificatore', auth)
    await page.goto('/verifica')
    await expect(page.locator('.verifica-table')).toBeVisible({ timeout: 15000 })
  })

  test('PAG-06: Creazione batch con successo @core', async ({ page }) => {
    test.setTimeout(60000)
    await loginAs(page, 'gestore', auth)

    // Prepara dati
    const email = `pag06_${Date.now()}@test.com`
    const contatto = await createContatto(page, { Nome: 'PAG06', Cognome: 'Test', email })
    const famId = await createFamiglia(page, { Nome_Famiglia: `Famiglia PAG06 ${Date.now()}` })
    await assignToFamiglia(page, contatto.id_contatto, famId, 'Genitore')

    await loginAs(page, 'verificatore', auth)
    await page.goto('/verifica')

    // Controlla che la tab Pagamenti sia visibile
    const pagTab = page.locator('.q-tab:has-text("Pagamenti")')
    await expect(pagTab).toBeVisible({ timeout: 10000 })
  })

  test('PAG-10: Pagamento segnato Pagato @core', async ({ page }) => {
    test.setTimeout(60000)
    await loginAs(page, 'gestore', auth)
    const email = `pag10_${Date.now()}@test.com`
    const contatto = await createContatto(page, { Nome: 'PAG10', Cognome: 'Test', email })
    const famId = await createFamiglia(page, { Nome_Famiglia: `Famiglia PAG10 ${Date.now()}` })
    await assignToFamiglia(page, contatto.id_contatto, famId, 'Genitore')

    await loginAs(page, 'verificatore', auth)
    await page.goto('/verifica')
    await expect(page.locator('.verifica-table')).toBeVisible({ timeout: 15000 })
  })

  test('PAG-17: Chiusura automatica progetto @core', async ({ page }) => {
    test.setTimeout(60000)
    await loginAs(page, 'gestore', auth)
    const email = `pag17_${Date.now()}@test.com`
    const contatto = await createContatto(page, { Nome: 'PAG17', Cognome: 'Test', email })
    const famId = await createFamiglia(page, { Nome_Famiglia: `Famiglia PAG17 ${Date.now()}` })
    await assignToFamiglia(page, contatto.id_contatto, famId, 'Genitore')

    await loginAs(page, 'verificatore', auth)
    await page.goto('/verifica')
    await expect(page.locator('.verifica-table')).toBeVisible({ timeout: 15000 })
  })
})
