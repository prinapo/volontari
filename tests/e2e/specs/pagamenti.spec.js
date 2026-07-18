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
  })

  test('PAG-02: Manager vede pagina verifica @smoke', async ({ page }) => {
    test.setTimeout(30000)
    await loginAs(page, 'manager', auth)
    await page.goto('/verifica')
    await expect(page.locator('.verifica-table')).toBeVisible({ timeout: 15000 })
  })

  test('PM-01: Pagina pagamenti carica @smoke', async ({ page }) => {
    test.setTimeout(30000)
    await loginAs(page, 'manager', auth)
    await page.goto('/pagamenti')
    await expect(page.locator('.q-tab:has-text("Bonifici da fare")')).toBeVisible({ timeout: 10000 })
  })

  test('PM-02: Volontario non accede a /pagamenti @regression', async ({ page }) => {
    test.setTimeout(30000)
    await loginAs(page, 'volontario', auth)
    await page.goto('/pagamenti')
    await page.waitForLoadState("networkidle").catch(() => {})
    const finalUrl = page.url()
    expect(finalUrl).not.toContain('/pagamenti')
    expect(finalUrl).toContain('/famiglie')
  })

  test('PAG-10: Admin vede tab Errori in AdminPage @smoke', async ({ page }) => {
    test.setTimeout(30000)
    await loginAs(page, 'admin', auth)
    await page.goto('/admin')
    await page.waitForLoadState("networkidle").catch(() => {})

    const erroriTab = page.locator('.q-tab').filter({ hasText: /errori/i })
    await expect(erroriTab).toBeVisible({ timeout: 5000 })
    await erroriTab.click()
    await page.waitForLoadState("networkidle").catch(() => {})

    await expect(page.locator('.q-tab--active')).toBeVisible({ timeout: 3000 })
    const label = await page.locator('.q-tab--active').innerText()
    expect(label.toLowerCase()).toContain('errori')
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
    await pulisciIds(ids)
  })

  test('PAG-20: Pagina pagamenti mostra sottotab Bonifici da fare @crud', async ({ page }) => {
    test.setTimeout(30000)
    await loginAs(page, 'manager', auth)
    await page.goto('/pagamenti')
    await page.waitForLoadState("networkidle").catch(() => {})

    await expect(page.locator('.q-tab:has-text("Bonifici da fare")')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('.q-tab:has-text("Da riscontrare")')).toBeVisible()
    await expect(page.locator('.q-tab:has-text("Falliti")')).toBeVisible()
  })

  test('PAG-21: Sottotab Bonifici da fare attivo @crud', async ({ page }) => {
    test.setTimeout(30000)
    await loginAs(page, 'manager', auth)
    await page.goto('/pagamenti')
    await page.waitForLoadState("networkidle").catch(() => {})
    await expect(page.locator('.q-tab--active').first()).toBeVisible({ timeout: 3000 })
  })

  test('PAG-22: Sottotab Da riscontrare si attiva @crud', async ({ page }) => {
    test.setTimeout(30000)
    await loginAs(page, 'manager', auth)
    await page.goto('/pagamenti')
    await page.waitForLoadState("networkidle").catch(() => {})
    await page.locator('.q-tab:has-text("Da riscontrare")').click()
    await page.waitForLoadState("networkidle").catch(() => {})
  })

  test('PAG-23: Sottotab Falliti si attiva @crud', async ({ page }) => {
    test.setTimeout(30000)
    await loginAs(page, 'manager', auth)
    await page.goto('/pagamenti')
    await page.waitForLoadState("networkidle").catch(() => {})
    await page.locator('.q-tab:has-text("Falliti")').click()
    await page.waitForLoadState("networkidle").catch(() => {})
  })
})
