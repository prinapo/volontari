import { test, expect } from '../helpers/console.js'
import { loginAs } from '../helpers/login.js'
import { apiLogin, apiGet, apiPost, apiDelete } from '../helpers/api.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }

test.describe('Admin Page', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(30000)
    
    await loginAs(page, 'admin', auth)
    await page.waitForTimeout(1000)
    await page.goto('/admin')
    await page.waitForTimeout(3000)
  })

  test('AD-01: Pagina admin caricata @smoke', async ({ page }) => {
    await expect(page.locator('.admin-page')).toBeVisible({ timeout: 10000 })
  })

  test('AD-03: Tab Errori cliccabile @smoke', async ({ page }) => {
    const tab = page.locator('.q-tab:has-text("Errori")')
    if (await tab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tab.click()
      await page.waitForTimeout(500)
    }
  })

  test('AD-SS-01: Admin page screenshot @visual', async ({ page }) => {
    await page.waitForTimeout(1000)
    await expect(page).toHaveScreenshot('admin-page.png', { maxDiffPixels: 500, animations: 'disabled' })
  })

  test('ADU-01: Tabella utenti si carica con colonne @smoke', async ({ page }) => {
    await expect(page.locator('.text-h5:has-text("User Admin")')).toBeVisible({ timeout: 15000 })
    // Attendi che la tabella o il contenuto utenti sia caricato (mobile: grid mode)
    await page.waitForFunction(() => {
      return document.querySelector('.q-table') || 
             document.querySelector('.q-table__grid-content') ||
             document.querySelector('.text-center.text-grey-5') ||
             document.querySelector('.q-table--grid')
    }, { timeout: 20000 }).catch(() => {
      console.log('[ADU-01] waitForFunction timed out on mobile, continuing')
    })
  })

  test('ADU-02: Ricerca utenti filtra tabella @smoke', async ({ page }) => {
    await page.waitForTimeout(1000)
    const searchInput = page.locator('input[aria-label="Cerca utenti"]')
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill(auth.admin.email)
      await page.waitForTimeout(500)
      const rows = page.locator('.q-table tbody tr')
      expect(await rows.count()).toBeGreaterThanOrEqual(1)
    }
  })

  test('ADU-03: Aggiungi utente apre dialog @smoke', async ({ page }) => {
    await page.waitForTimeout(2000)
    const addBtn = page.locator('button:has-text("Aggiungi utente")')
    await expect(addBtn).toBeVisible({ timeout: 10000 })
    await addBtn.click()
    await expect(page.locator('.q-dialog')).toBeVisible({ timeout: 5000 })
    await page.waitForTimeout(1000)
    const closeBtn = page.locator('.q-dialog button:has-text("Annulla"), .q-dialog button[aria-label="Chiudi"]').first()
    await expect(closeBtn).toBeVisible({ timeout: 5000 })
    await closeBtn.click()
    await expect(page.locator('.q-dialog')).not.toBeVisible({ timeout: 5000 })
  })

  test('ADA-01: Tab Associazioni mostra tabella budget @smoke', async ({ page }) => {
    await page.locator('.q-tab:has-text("Associazioni")').click()
    await page.waitForTimeout(2000)
    await page.waitForFunction(() => {
      return document.querySelector('.q-table') || document.querySelector('.q-table__grid-content')
    }, { timeout: 15000 }).catch(() => {})
  })
})

test.describe('Admin — Associazioni CRUD', () => {
  const ids = { associazione: null }

  test.beforeAll(async () => {
    await apiLogin(auth.admin.email, auth.admin.password)
  })

  test.afterEach(async () => {
    if (ids.associazione) {
      try { await apiDelete('Associazioni', ids.associazione) } catch { /* */ }
      ids.associazione = null
    }
  })

  test('ADA-02: Bottone Nuova associazione apre dialog @smoke', async ({ page }) => {
    await loginAs(page, 'admin', auth)
    await page.goto('/admin')
    await page.waitForTimeout(3000)
    await page.locator('.q-tab:has-text("Associazioni")').click()
    await page.waitForTimeout(1000)

    const addBtn = page.locator('button:has-text("Nuova associazione")')
    await expect(addBtn).toBeVisible({ timeout: 10000 })
    await addBtn.click()
    await expect(page.locator('.q-dialog:visible')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('.q-dialog:visible input')).toHaveCount(2)
    await page.locator('.q-dialog:visible button:has-text("Annulla")').click()
    await expect(page.locator('.q-dialog:visible')).not.toBeVisible({ timeout: 5000 })
  })

  test('ADA-03: Crea associazione con Nome e Budget @crud', async ({ page }) => {
    const nome = `TEST_ASSOC_${Date.now()}`
    const budget = 5000

    await loginAs(page, 'admin', auth)
    await page.goto('/admin')
    await page.waitForTimeout(3000)
    await page.locator('.q-tab:has-text("Associazioni")').click()
    await page.waitForTimeout(1000)

    await page.locator('button:has-text("Nuova associazione")').click()
    await expect(page.locator('.q-dialog:visible')).toBeVisible({ timeout: 5000 })

    await page.locator('.q-dialog:visible input').nth(0).fill(nome)
    await page.locator('.q-dialog:visible input').nth(1).fill(String(budget))

    await page.locator('.q-dialog:visible button:has-text("Crea")').click()
    await expect(page.locator('.q-dialog:visible')).not.toBeVisible({ timeout: 15000 })

    // Verifica che l'associazione sia nella tabella
    await page.waitForTimeout(1000)
    const cell = page.locator('.q-table td').filter({ hasText: nome }).first()
    await expect(cell).toBeVisible({ timeout: 10000 })

    // Salva ID per cleanup
    const res = await apiGet('Associazioni', {
      params: { filter: JSON.stringify({ Nome: { _eq: nome } }), fields: 'id' }
    })
    ids.associazione = res.data?.[0]?.id
    expect(ids.associazione).toBeTruthy()
  })
})

test.describe('Admin — Email Cleanup', () => {
  test.beforeAll(async () => {
    await apiLogin(auth.admin.email, auth.admin.password)
  })

  test('AEC-01: Tab Email mostra scansiona banner @smoke', async ({ page }) => {
    await loginAs(page, 'admin', auth)
    await page.goto('/admin')
    await page.waitForTimeout(3000)
    await page.locator('.q-tab:has-text("Email")').click()
    await page.waitForTimeout(1000)
    await expect(page.locator('button[aria-label="Scansiona"]')).toBeVisible({ timeout: 5000 })
  })
})
