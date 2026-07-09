import { test, expect } from '../helpers/console.js'
import { loginAs } from '../helpers/login.js'
import { apiLogin } from '../helpers/api.js'
import { deleteFamiglie } from '../helpers/cleanup.js'
import { createFamigliaViaUI, assegnaContattoAFamigliaViaUI } from '../helpers/pagina-gestione.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }

let createdFamiglia = null

test.describe('AppLayout — Sidebar Navigation', () => {
  test.beforeAll(async () => {
    await apiLogin(auth.admin.email, auth.admin.password)
  })

  test.beforeEach(async ({ page }) => {
    const nomeFamiglia = 'TEST_LAYOUT_' + Date.now()
    await loginAs(page, 'manager', auth)
    const fam = await createFamigliaViaUI(page, { nomeFamiglia })
    createdFamiglia = fam.id_famiglia
    await assegnaContattoAFamigliaViaUI(page, {
      famigliaNome: nomeFamiglia,
      searchTerm: auth.volontario.email,
      fullName: auth.volontario.email,
      ruolo: 'Volontario'
    })
  })

  test.afterEach(async () => {
    if (createdFamiglia) {
      await deleteFamiglie(createdFamiglia).catch(() => {})
      createdFamiglia = null
    }
  })

  async function openDrawerIfMobile(page) {
    const drawer = page.locator('.q-drawer')
    const visible = await drawer.isVisible({ timeout: 1000 }).catch(() => false)
    if (!visible) {
      await page.locator('button[aria-label="Menu"]').click()
      await expect(drawer).toBeVisible({ timeout: 5000 })
    }
  }

  test('LB-01: Volontario vede solo Famiglie @smoke', async ({ page }) => {
    await loginAs(page, 'volontario', auth)
    await openDrawerIfMobile(page)

    const drawer = page.locator('.q-drawer')
    await expect(drawer).toBeVisible({ timeout: 5000 })

    const famiglieItem = drawer.locator('text=Famiglie').first()
    await expect(famiglieItem).toBeVisible()

    const verificaItem = drawer.locator('text=Verifica')
    const gestioneItem = drawer.locator('text=Gestione')
    const adminItem = drawer.locator('text=User Admin')

    expect(await verificaItem.count()).toBe(0)
    expect(await gestioneItem.count()).toBe(0)
    expect(await adminItem.count()).toBe(0)
  })

  test('LB-02: Manager vede Gestione + Verifica + Riconciliazione @smoke', async ({ page }) => {
    await loginAs(page, 'manager', auth)
    await openDrawerIfMobile(page)

    const drawer = page.locator('.q-drawer')
    await expect(drawer).toBeVisible({ timeout: 5000 })

    await expect(drawer.locator('text=Gestione').first()).toBeVisible()
    await expect(drawer.locator('text=Verifica').first()).toBeVisible()
    await expect(drawer.locator('text=Riconciliazione').first()).toBeVisible()

    const adminItem = drawer.locator('text=User Admin')
    expect(await adminItem.count()).toBe(0)
  })

  test('LB-SS-01: Sidebar volontario screenshot @visual', async ({ page }) => {
    await loginAs(page, 'volontario', auth)
    await openDrawerIfMobile(page)
    await page.waitForTimeout(500)
    const drawer = page.locator('.q-drawer')
    await expect(drawer).toBeVisible({ timeout: 5000 })
    await expect(page).toHaveScreenshot('sidebar-volontario.png', { maxDiffPixels: 1500, animations: 'disabled' })
  })

  test('LB-03: Admin vede tutte le voci di navigazione @smoke', async ({ page }) => {
    await loginAs(page, 'admin', auth)
    await openDrawerIfMobile(page)

    const drawer = page.locator('.q-drawer')
    await expect(drawer).toBeVisible({ timeout: 5000 })

    await expect(drawer.locator('text=Gestione').first()).toBeVisible()
    await expect(drawer.locator('text=Verifica').first()).toBeVisible()
    await expect(drawer.locator('text=Riconciliazione').first()).toBeVisible()
    await expect(drawer.locator('text=User Admin').first()).toBeVisible()
  })

  test('LB-04: Click menu item naviga alla pagina corretta @smoke', async ({ page }) => {
    await loginAs(page, 'volontario', auth)
    await openDrawerIfMobile(page)

    const drawer = page.locator('.q-drawer')
    await expect(drawer).toBeVisible({ timeout: 5000 })

    const famiglieItem = drawer.locator('.q-item:has-text("Famiglie")').first()
    await famiglieItem.click()
    await expect(page).toHaveURL(/\/famiglie/, { timeout: 5000 })
  })

})
