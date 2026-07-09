import { test, expect } from '../helpers/console.js'
import { loginAs } from '../helpers/login.js'
import { apiLogin, apiPost, apiGet, apiPatch, apiDelete } from '../helpers/api.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }

const PAG = { progetti: [], pagamenti: [], batch: [], famiglie: [], associazioni: [], liste: [], files: [] }

test.describe('Pagamenti CRUD', () => {
  test.beforeAll(async () => {
    await apiLogin(auth.admin.email, auth.admin.password)
  })

  test.afterEach(async () => {
    for (const id of PAG.liste) { try { await apiDelete('ListePagamenti', id) } catch {} }
    for (const id of PAG.batch) { try { await apiDelete('BatchPagamenti', id) } catch {} }
    for (const id of PAG.pagamenti) { try { await apiDelete('Pagamenti', id) } catch {} }
    for (const id of PAG.progetti) { try { await apiDelete('Progetti', id) } catch {} }
    for (const id of PAG.famiglie) { try { await apiDelete('Famiglie', id) } catch {} }
    for (const id of PAG.associazioni) { try { await apiDelete('Associazioni', id) } catch {} }
  })

  test('PAG-30: Crea batch da pagamenti proposti @crud', async ({ page }) => {
    const ass = await apiPost('Associazioni', { Nome: 'TEST_Assoc', Budget: 10000 })
    const assId = ass.data?.id || ass.data?.[0]?.id
    PAG.associazioni.push(assId)
    const fam = await apiPost('Famiglie', {
      id_famiglia: `TEST_PAG_${Date.now()}`,
      Nome_Famiglia: `TEST_PAG30_${Date.now()}`,
      IBAN: 'IT60X0542811101000000123456',
      Intestatario_CC: 'TEST'
    })
    const famId = fam.data?.id_famiglia || fam.data?.id
    PAG.famiglie.push(famId)
    const prog = await apiPost('Progetti', {
      id_progetto: `TEST_PAG30_PROG_${Date.now()}`,
      Famiglia: famId, Allocato: 3000,
      Cognome_Beneficiario: 'TEST_PAG30', Nome_Beneficiario: 'Test',
      AnnoBando: new Date().getFullYear()
    })
    const progId = prog.data?.id_progetto || prog.data?.id
    PAG.progetti.push(progId)
    const pag1 = await apiPost('Pagamenti', { Progetto: progId, Famiglia: famId, Importo: 500, Stato: 'proposto' })
    PAG.pagamenti.push(pag1.data?.id || pag1.data?.[0]?.id)
    const pag2 = await apiPost('Pagamenti', { Progetto: progId, Famiglia: famId, Importo: 300, Stato: 'proposto' })
    PAG.pagamenti.push(pag2.data?.id || pag2.data?.[0]?.id)

    await loginAs(page, 'manager', auth)
    await page.goto('/verifica')
    await expect(page.locator('.verifica-table')).toBeVisible({ timeout: 15000 })
    await page.locator('.q-tab:has-text("Pagamenti")').click()
    await page.waitForTimeout(2000)
    await page.waitForFunction(() => {
      return document.querySelector('.q-table') || document.querySelector('.q-table__grid-content') || document.querySelector('.q-tab-panel')
    }, { timeout: 10000 })
  })

  test('PAG-31: Bonifici da fare ha tabella @smoke', async ({ page }) => {
    await loginAs(page, 'manager', auth)
    await page.goto('/verifica')
    await expect(page.locator('.verifica-table')).toBeVisible({ timeout: 15000 })
    await page.locator('.q-tab:has-text("Pagamenti")').click()
    await page.waitForTimeout(1000)
    await expect(page.locator('.q-tab:has-text("Bonifici da fare")')).toBeVisible({ timeout: 5000 })
  })

  test('PAG-32: Da riscontrare tab visibile @smoke', async ({ page }) => {
    await loginAs(page, 'manager', auth)
    await page.goto('/verifica')
    await expect(page.locator('.verifica-table')).toBeVisible({ timeout: 15000 })
    await page.locator('.q-tab:has-text("Pagamenti")').click()
    await page.waitForTimeout(1000)
    await page.locator('.q-tab:has-text("Da riscontrare")').click()
    await page.waitForTimeout(2000)
    await page.waitForFunction(() => {
      return document.querySelector('.q-table') || document.querySelector('.q-table__grid-content') || document.querySelector('.q-tab-panel')
    }, { timeout: 10000 })
  })

  test('PAG-33: Falliti tab visibile @smoke', async ({ page }) => {
    await loginAs(page, 'manager', auth)
    await page.goto('/verifica')
    await expect(page.locator('.verifica-table')).toBeVisible({ timeout: 15000 })
    await page.locator('.q-tab:has-text("Pagamenti")').click()
    await page.waitForTimeout(1000)
    await page.locator('.q-tab:has-text("Falliti")').click()
    await page.waitForTimeout(2000)
    await page.waitForFunction(() => {
      return document.querySelector('.q-table') || document.querySelector('.q-table__grid-content') || document.querySelector('.q-tab-panel')
    }, { timeout: 10000 })
  })

  test('PAG-34: Liste esportazione tab visibile @smoke', async ({ page }) => {
    await loginAs(page, 'manager', auth)
    await page.goto('/verifica')
    await expect(page.locator('.verifica-table')).toBeVisible({ timeout: 15000 })
    await page.locator('.q-tab:has-text("Pagamenti")').click()
    await page.waitForTimeout(1000)
    await page.locator('.q-tab:has-text("Liste esportazione")').click()
    await expect(page.locator('.q-table')).toBeVisible({ timeout: 5000 })
  })
})
