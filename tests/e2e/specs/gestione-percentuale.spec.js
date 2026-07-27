import auth from '../fixtures/auth-test.json' with { type: 'json' }
import { test, expect } from '../helpers/console.js'
import { loginAs } from '../helpers/login.js'

test.describe('MassimaPercentualeErogabile', () => {
  test('RP-SMOKE: Tab Famiglie in Gestione espande e mostra progetti @smoke', async ({ page }) => {
    test.setTimeout(60_000)
    await loginAs(page, 'admin', auth)
    await page.goto('/gestione')
    await page.waitForLoadState('networkidle')

    await page.locator('.q-tab:has-text("Famiglie")').click()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.q-table')).toBeVisible({ timeout: 10_000 })
  })
})
