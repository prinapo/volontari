import { test, expect } from '../helpers/console.js'
import { loginAs } from '../helpers/login.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }

test.describe('AppLayout — Sidebar Navigation', () => {
  test('LB-01: Volontario vede solo Famiglie @smoke', async ({ page }) => {
    await loginAs(page, 'volontario', auth)

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

  test('LB-02: Gestore vede Gestione ma non Verifica @smoke', async ({ page }) => {
    await loginAs(page, 'gestore', auth)

    const drawer = page.locator('.q-drawer')
    await expect(drawer).toBeVisible({ timeout: 5000 })

    const gestioneItem = drawer.locator('text=Gestione')
    await expect(gestioneItem.first()).toBeVisible()

    const verificaItem = drawer.locator('text=Verifica')
    const adminItem = drawer.locator('text=User Admin')

    expect(await verificaItem.count()).toBe(0)
    expect(await adminItem.count()).toBe(0)
  })

  test('LB-03: Verificatore vede Verifica e Riconciliazione @smoke', async ({ page }) => {
    await loginAs(page, 'verificatore', auth)

    const drawer = page.locator('.q-drawer')
    await expect(drawer).toBeVisible({ timeout: 5000 })

    const verificaItem = drawer.locator('text=Verifica').first()
    await expect(verificaItem).toBeVisible()

    const riconcItem = drawer.locator('text=Riconciliazione')
    await expect(riconcItem).toBeVisible()

    const gestioneItem = drawer.locator('text=Gestione')
    const adminItem = drawer.locator('text=User Admin')

    expect(await gestioneItem.count()).toBe(0)
    expect(await adminItem.count()).toBe(0)
  })

  test('LB-04: Click menu item naviga alla pagina corretta @smoke', async ({ page }) => {
    await loginAs(page, 'volontario', auth)

    const drawer = page.locator('.q-drawer')
    await expect(drawer).toBeVisible({ timeout: 5000 })

    const famiglieItem = drawer.locator('.q-item:has-text("Famiglie")').first()
    await famiglieItem.click()
    await expect(page).toHaveURL(/\/famiglie/, { timeout: 5000 })
  })

  test('LB-05: Genitore loggato arriva a /famiglie @smoke', async ({ page }) => {
    // Il genitore condivide il ruolo Volontario in Directus
    await loginAs(page, 'genitore', auth)
    await expect(page).toHaveURL(/\/famiglie/, { timeout: 15000 })
  })
})
