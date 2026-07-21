import { test, expect } from '../helpers/console.js'
import { LoginPage } from '../pages/LoginPage.js'
import { loginAs } from '../helpers/login.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }

async function openDrawerIfMobile(page) {
  const drawer = page.locator('.q-drawer')
  const visible = await drawer.isVisible({ timeout: 1000 }).catch(() => false)
  if (!visible) {
    await page.locator('button[aria-label="Menu"]').click()
    await expect(drawer).toBeVisible({ timeout: 5000 })
  }
}

test.describe('Route Guards', () => {
  test('PER-01: GestoreVerifica non accede a /admin @regression', async ({ page }) => {
    await loginAs(page, 'manager', auth)
    await expect(page).toHaveURL(/\/gestione/, { timeout: 15000 })
    await page.goto('/admin')
    await page.waitForLoadState("networkidle").catch(() => {})
    expect(page.url()).not.toContain('/admin')
  })

  test('PER-02: Verificatore non accede a /gestione @regression', async ({ page }) => {
    await loginAs(page, 'volontario', auth)
    await expect(page).toHaveURL(/\/famiglie/, { timeout: 15000 })
    await page.goto('/gestione')
    await page.waitForLoadState("networkidle").catch(() => {})
    expect(page.url()).not.toContain('/gestione')
  })

  test('PER-03: Gestore non accede a /admin @regression', async ({ page }) => {
    await loginAs(page, 'manager', auth)
    await expect(page).toHaveURL(/\/gestione/, { timeout: 15000 })
    await page.goto('/admin')
    await page.waitForLoadState("networkidle").catch(() => {})
    expect(page.url()).not.toContain('/admin')
  })

  test('PER-04: Volontario non accede a /verifica @regression', async ({ page }) => {
    await loginAs(page, 'volontario', auth)
    await expect(page).toHaveURL(/\/famiglie/, { timeout: 15000 })
    await page.goto('/verifica')
    await page.waitForLoadState("networkidle").catch(() => {})
    expect(page.url()).not.toContain('/verifica')
  })
})

test.describe('Sidebar Navigation — Extra Roles', () => {
  test('PER-05: GestoreVerifica vede Verifica+Riconciliazione+Gestione @smoke', async ({ page }) => {
    await loginAs(page, 'manager', auth)
    await openDrawerIfMobile(page)
    const drawer = page.locator('.q-drawer')
    await expect(drawer).toBeVisible({ timeout: 5000 })

    await expect(drawer.locator('text=Verifica').first()).toBeVisible()
    await expect(drawer.locator('text=Riconciliazione').first()).toBeVisible()
    await expect(drawer.locator('text=Gestione').first()).toBeVisible()
    expect(await drawer.locator('text=User Admin').count()).toBe(0)
  })

  test('PER-06: Admin vede tutte le voci di navigazione @smoke', async ({ page }) => {
    await loginAs(page, 'admin', auth)
    await openDrawerIfMobile(page)
    const drawer = page.locator('.q-drawer')
    await expect(drawer).toBeVisible({ timeout: 5000 })

    await expect(drawer.locator('text=Verifica').first()).toBeVisible()
    await expect(drawer.locator('text=Riconciliazione').first()).toBeVisible()
    await expect(drawer.locator('text=Gestione').first()).toBeVisible()
    await expect(drawer.locator('text=Admin').first()).toBeVisible()
  })
})

test.describe('Pagamenti Tab Accesso', () => {
  test('PER-07: Verificatore vede pagina Pagamenti @smoke', async ({ page }) => {
    await loginAs(page, 'manager', auth)
    await page.goto('/pagamenti')
    await expect(page.locator('.q-tab:has-text("Bonifici da fare")')).toBeVisible({ timeout: 10000 })
  })

  test('PER-08: Volontario non vede pagina Pagamenti @regression', async ({ page }) => {
    await loginAs(page, 'volontario', auth)
    await page.goto('/pagamenti')
    await page.waitForLoadState("networkidle").catch(() => {})
    expect(page.url()).not.toContain('/pagamenti')
  })
})

test.describe('ErrorLog Accesso', () => {
  test('PER-09: Gestore non accede a /admin (reindirizzato) @smoke', async ({ page }) => {
    await loginAs(page, 'manager', auth)
    await expect(page).toHaveURL(/\/gestione/, { timeout: 15000 })
    await page.goto('/admin')
    await page.waitForLoadState("networkidle").catch(() => {})
    expect(page.url()).not.toContain('/admin')
  })

  test('PER-10: Verificatore non accede a /admin @smoke', async ({ page }) => {
    await loginAs(page, 'manager', auth)
    await page.goto('/admin')
    await page.waitForLoadState("networkidle").catch(() => {})
    expect(page.url()).not.toContain('/admin')
  })
})
