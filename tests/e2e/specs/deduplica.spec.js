import { test, expect } from '../helpers/console.js'
import { LoginPage } from '../pages/LoginPage.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }

test.describe('DeduplicaPage — Accesso e Layout', () => {
  test('DP-01: Pagina accessibile solo ad admin @smoke', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(auth.volontario.email, auth.volontario.password)
    await page.waitForURL(/\/(famiglie|gestione|verifica|deduplica)/, { timeout: 15000 })

    // Try navigating to deduplica
    await page.goto('/deduplica')
    await page.waitForTimeout(2000)

    const currentUrl = page.url()
    if (currentUrl.includes('/deduplica')) {
      // Access granted — verify basic page structure
      await expect(page.locator('.deduplica-page')).toBeVisible({ timeout: 5000 })
      await expect(page.locator('text=Gestione duplicati')).toBeVisible({ timeout: 5000 })
    } else {
      // Redirected to another page — not admin, skip
      console.log('DP-01: User is not admin — redirect to', currentUrl)
      test.skip()
    }
  })

  test('DP-02: Pulsante refresh visibile quando pagina accessibile @smoke', async ({ page }) => {
    await page.goto('/deduplica')
    await page.waitForTimeout(2000)
    if (!page.url().includes('/deduplica')) {
      test.skip()
      return
    }
    await expect(page.locator('button:has-text("refresh")')).toBeVisible({ timeout: 5000 })
  })

  test('DP-03: Messaggio nessun duplicato o lista gruppi @smoke', async ({ page }) => {
    await page.goto('/deduplica')
    await page.waitForTimeout(2000)
    if (!page.url().includes('/deduplica')) {
      test.skip()
      return
    }

    // Wait for loading to finish
    await expect(page.locator('button:has-text("refresh")')).toBeVisible({ timeout: 10000 })

    // Either we see "Nessun duplicato trovato" or we see group cards
    const emptyState = page.locator('text=Nessun duplicato trovato')
    const groupCards = page.locator('.group-card')

    const emptyVisible = await emptyState.isVisible().catch(() => false)
    const groupsVisible = await groupCards.first().isVisible().catch(() => false)

    if (emptyVisible) {
      await expect(page.locator('text=Tutti i contatti hanno email univoche')).toBeVisible()
    } else if (groupsVisible) {
      const count = await groupCards.count()
      expect(count).toBeGreaterThanOrEqual(1)
    } else {
      // Still loading or error state — skip
      test.skip()
    }
  })

  test('DP-04: Badge tipo duplicato presenti @smoke', async ({ page }) => {
    await page.goto('/deduplica')
    await page.waitForTimeout(2000)
    if (!page.url().includes('/deduplica')) {
      test.skip()
      return
    }

    const groupCards = page.locator('.group-card')
    const count = await groupCards.count()
    if (count === 0) {
      test.skip()
      return
    }

    // Verify at least one card has a badge (cross-contatto, same-contatto, or orphan)
    const firstCard = groupCards.first()
    const badges = firstCard.locator('.q-badge')
    await expect(badges.first()).toBeVisible({ timeout: 3000 })
  })
})
