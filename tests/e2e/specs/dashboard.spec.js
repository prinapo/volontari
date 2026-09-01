import auth from '../fixtures/auth-test.json' with { type: 'json' }
import { test, expect } from '../helpers/console.js'
import { loginAs } from '../helpers/login.js'

test.describe('Dashboard', () => {
  test('DBD-01: Manager vede dashboard con cerchi e grafici @smoke', async ({ page }) => {
    await loginAs(page, 'manager', auth)
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle').catch(() => {})
    await expect(page.locator('.text-h5:has-text("Dashboard")')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('.text-subtitle1:has-text("Progetti e Famiglie")')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('.text-subtitle1', { hasText: /^Stato pagamenti$/ })).toBeVisible({ timeout: 10_000 })
    const canvases = page.locator('.dashboard-chart canvas')
    expect(await canvases.count()).toBeGreaterThanOrEqual(3)
  })

  test('DBD-02: Volontario non accede a /dashboard @regression', async ({ page }) => {
    await loginAs(page, 'volontario', auth)
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle').catch(() => {})
    await expect(page).not.toHaveURL(/\/dashboard/, { timeout: 10_000 })
  })

  test('DBD-03: Grafico Progetti per stato e anno renderizzato @smoke', async ({ page }) => {
    test.setTimeout(45_000)
    await loginAs(page, 'manager', auth)
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle').catch(() => {})

    const card = page.locator('.q-card').filter({ hasText: 'Progetti per stato e anno' }).first()
    await expect(card).toBeVisible({ timeout: 10_000 })
    const canvas = card.locator('.dashboard-chart canvas')
    await expect(canvas).toHaveCount(1)
    const box = await canvas.boundingBox()
    expect(box.width).toBeGreaterThan(0)
    expect(box.height).toBeGreaterThan(0)
  })
})
