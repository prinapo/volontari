import { test, expect } from '../helpers/console.js'
import { loginAs } from '../helpers/login.js'
import { apiLogin, apiGet, apiPost, apiDelete } from '../helpers/api.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }

let createdFamiglia = null

test.describe('AppLayout — Sidebar Navigation', () => {
  test.beforeAll(async () => {
    await apiLogin(auth.admin.email, auth.admin.password)
    const emailRes = await apiGet('email', {
      filter: JSON.stringify({ email_address: { _eq: auth.volontario.email } }),
      fields: 'Contatto_Relation'
    })
    const contattoId = emailRes.data?.[0]?.Contatto_Relation
    if (!contattoId) return

    const famId = 'LAYOUT_' + Date.now()
    await apiPost('Famiglie', { id_famiglia: famId, Nome_Famiglia: famId })
    createdFamiglia = famId
    await apiPost('Famiglie_Contatti', {
      id: Math.floor(Math.random() * 9000000) + 1000000,
      Contatto: contattoId,
      Famiglia: famId,
      Ruolo_nella_Famiglia: 'Volontario',
      Disattivo: false
    })
  })

  test.afterAll(async () => {
    if (createdFamiglia) {
      const fcRes = await apiGet('Famiglie_Contatti', {
        filter: JSON.stringify({ Famiglia: { _eq: createdFamiglia } }),
        fields: 'id'
      })
      for (const r of fcRes.data || []) {
        try {
          await apiDelete('Famiglie_Contatti', r.id)
        } catch {
          /* */
        }
      }
      try {
        await apiDelete('Famiglie', createdFamiglia)
      } catch {
        /* */
      }
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

  test('LB-02: Gestore vede Gestione ma non Verifica @smoke', async ({ page }) => {
    await loginAs(page, 'gestore', auth)
    await openDrawerIfMobile(page)

    const drawer = page.locator('.q-drawer')
    await expect(drawer).toBeVisible({ timeout: 5000 })

    const gestioneItem = drawer.locator('text=Gestione')
    await expect(gestioneItem.first()).toBeVisible()

    const verificaItem = drawer.locator('text=Verifica')
    const adminItem = drawer.locator('text=User Admin')

    expect(await verificaItem.count()).toBe(0)
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

  test('LB-03: Verificatore vede Verifica e Riconciliazione @smoke', async ({ page }) => {
    await loginAs(page, 'verificatore', auth)
    await openDrawerIfMobile(page)

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
    await openDrawerIfMobile(page)

    const drawer = page.locator('.q-drawer')
    await expect(drawer).toBeVisible({ timeout: 5000 })

    const famiglieItem = drawer.locator('.q-item:has-text("Famiglie")').first()
    await famiglieItem.click()
    await expect(page).toHaveURL(/\/famiglie/, { timeout: 5000 })
  })

  test.skip('LB-05: Genitore loggato arriva a /famiglie @smoke', async ({ page }) => {
    await loginAs(page, 'genitore', auth)
    await expect(page).toHaveURL(/\/famiglie/, { timeout: 15000 })
  })
})
