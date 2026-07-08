import { test, expect } from '@playwright/test'
test('basic navigation', async ({ page }) => {
  console.log('baseURL:', page.context()._options.baseURL)
  await page.goto('http://localhost:9000/login', { timeout: 20000 })
  await expect(page).toHaveURL(/login/)
})
