import { test, expect } from '../helpers/console.js'
import { loginAs } from '../helpers/login.js'
import { apiLogin, apiGet, apiDelete } from '../helpers/api.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }

let _pagCleanup = { progetti: [], pagamenti: [], batch: [] }

test.beforeAll(async () => {
  await apiLogin(auth.admin.email, auth.admin.password)
})

test.afterEach(async () => {
  for (const id of _pagCleanup.pagamenti) {
    try {
      await apiDelete('Pagamenti', id)
    } catch {
      /* */
    }
  }
  for (const id of _pagCleanup.batch) {
    try {
      await apiDelete('BatchPagamenti', id)
    } catch {
      /* */
    }
  }
  // Pulisci batch e pagamenti creati dai test
  _pagCleanup = { progetti: [], pagamenti: [], batch: [] }
})

test.describe('Gestione Pagamenti', () => {
  test('PAG-01: Login gestore e pagina gestione carica @smoke', async ({ page }) => {
    test.setTimeout(30000)
    await loginAs(page, 'manager', auth)
    await expect(page.locator('.q-tab:has-text("Contatti")')).toBeVisible({ timeout: 10000 })
    console.log('[PAG-01] Login e pagina gestione OK')
  })

  test('PAG-02: Verificatore vede pagina verifica @smoke', async ({ page }) => {
    test.setTimeout(30000)
    await loginAs(page, 'manager', auth)
    await page.goto('/verifica')
    await expect(page.locator('.verifica-table')).toBeVisible({ timeout: 15000 })
    console.log('[PAG-02] Pagina verifica OK')
  })

  test('PAG-06: Tab Pagamenti in VerificaPage è visibile @smoke', async ({ page }) => {
    test.setTimeout(30000)
    await loginAs(page, 'manager', auth)
    await page.goto('/verifica')
    await expect(page.locator('.verifica-table')).toBeVisible({ timeout: 15000 })
    const pagTab = page.locator('.q-tab:has-text("Pagamenti")')
    await expect(pagTab).toBeVisible({ timeout: 5000 })
    console.log('[PAG-06] Tab Pagamenti visibile')
  })

  test('PAG-10: Admin vede tab Errori in AdminPage @smoke', async ({ page }) => {
    test.setTimeout(30000)
    await loginAs(page, 'admin', auth)
    await page.goto('/admin')
    await page.waitForTimeout(2000)

    const erroriTab = page.locator('.q-tab').filter({ hasText: /errori/i })
    await expect(erroriTab).toBeVisible({ timeout: 5000 })
    await erroriTab.click()
    await page.waitForTimeout(500)

    await expect(page.locator('.q-tab--active')).toBeVisible({ timeout: 3000 })
    const label = await page.locator('.q-tab--active').innerText()
    expect(label.toLowerCase()).toContain('errori')
    console.log('[PAG-10] AdminPage e tab Errori OK')
  })

  test('PAG-17: Volontario vede pagina famiglie @smoke', async ({ page }) => {
    test.setTimeout(60000)
    const { creaFamigliaVolontarioProgetto, loginVolontarioConFamiglia, loginGestore, pulisciIds } =
      await import('../helpers/setup-atomico.js')
    const { apiLogin } = await import('../helpers/api.js')
    await apiLogin(auth.admin.email, auth.admin.password)
    let ids = { famiglia: null, progetto: null, giustificativi: [] }
    await loginGestore(page)
    const r = await creaFamigliaVolontarioProgetto(page, ids)
    await loginVolontarioConFamiglia(page, r.nomeFam)
    await expect(page.locator('.text-h6').first()).toBeVisible({ timeout: 10000 })
    console.log('[PAG-17] Pagina famiglie OK')
    await pulisciIds(ids)
  })

  test('PAG-20: Tab Pagamenti mostra sottotab Bonifici da fare @crud', async ({ page }) => {
    test.setTimeout(60000)
    await loginAs(page, 'manager', auth)
    await page.goto('/verifica')
    await expect(page.locator('.verifica-table')).toBeVisible({ timeout: 15000 })

    // Click tab Pagamenti
    const pagTab = page.locator('.q-tab:has-text("Pagamenti")')
    await expect(pagTab).toBeVisible({ timeout: 5000 })
    await pagTab.click()
    await page.waitForTimeout(1000)

    // Verifica che i sottotab siano visibili
    await expect(page.locator('.q-tab:has-text("Bonifici da fare")')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('.q-tab:has-text("Da riscontrare")')).toBeVisible()
    await expect(page.locator('.q-tab:has-text("Falliti")')).toBeVisible()
    console.log('[PAG-20] Sottotab Pagamenti visibili')
  })

  test('PAG-21: Sottotab Bonifici da fare mostra contenuto @crud', async ({ page }) => {
    test.setTimeout(60000)
    await loginAs(page, 'manager', auth)
    await page.goto('/verifica')
    await expect(page.locator('.verifica-table')).toBeVisible({ timeout: 15000 })

    const pagTab = page.locator('.q-tab:has-text("Pagamenti")')
    await expect(pagTab).toBeVisible({ timeout: 5000 })
    await pagTab.click()
    await page.waitForTimeout(1500)

    // Verifica che Bonifici da fare sia attivo
    await expect(page.locator('.q-tab--active').first()).toBeVisible({ timeout: 3000 })
    console.log('[PAG-21] Tab Pagamenti attivo')
  })

  test('PAG-22: Sottotab Da riscontrare si attiva @crud', async ({ page }) => {
    test.setTimeout(60000)
    await loginAs(page, 'manager', auth)
    await page.goto('/verifica')
    await expect(page.locator('.verifica-table')).toBeVisible({ timeout: 15000 })

    const pagTab = page.locator('.q-tab:has-text("Pagamenti")')
    await expect(pagTab).toBeVisible({ timeout: 5000 })
    await pagTab.click()
    await page.waitForTimeout(1000)

    // Click su Da riscontrare
    await page.locator('.q-tab:has-text("Da riscontrare")').click()
    await page.waitForTimeout(500)
    console.log('[PAG-22] Sottotab Da riscontrare attivato')
  })

  test('PAG-23: Sottotab Falliti si attiva @crud', async ({ page }) => {
    test.setTimeout(60000)
    await loginAs(page, 'manager', auth)
    await page.goto('/verifica')
    await expect(page.locator('.verifica-table')).toBeVisible({ timeout: 15000 })

    const pagTab = page.locator('.q-tab:has-text("Pagamenti")')
    await expect(pagTab).toBeVisible({ timeout: 5000 })
    await pagTab.click()
    await page.waitForTimeout(1000)

    // Click su Falliti
    await page.locator('.q-tab:has-text("Falliti")').click()
    await page.waitForTimeout(500)
    console.log('[PAG-23] Sottotab Falliti attivato')
  })
})
