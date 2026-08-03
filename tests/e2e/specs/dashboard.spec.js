import auth from '../fixtures/auth-test.json' with { type: 'json' }
import { test, expect } from '../helpers/console.js'
import { loginAs } from '../helpers/login.js'

test.describe('Dashboard', () => {
  test('DBD-01: Manager vede dashboard con metriche e grafici @smoke', async ({ page }) => {
    await loginAs(page, 'manager', auth)
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle').catch(() => {})
    await expect(page.locator('.text-h5:has-text("Dashboard")')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('.dashboard-card').first()).toBeVisible({ timeout: 10_000 })
    const cards = page.locator('.dashboard-card')
    expect(await cards.count()).toBeGreaterThanOrEqual(4)
    const canvases = page.locator('.dashboard-chart canvas')
    expect(await canvases.count()).toBeGreaterThanOrEqual(3)
  })

  test('DBD-02: Volontario non accede a /dashboard @regression', async ({ page }) => {
    await loginAs(page, 'volontario', auth)
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle').catch(() => {})
    await expect(page).not.toHaveURL(/\/dashboard/, { timeout: 10_000 })
  })
})
