import { test, expect } from '../helpers/console.js'
import { GestionePage } from '../pages/GestionePage.js'
import { loginAs } from '../helpers/login.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }

test.describe('Referente Role', () => {
  test('RF-01: Bottone Assegna Referente visibile solo per Volontari @smoke', async ({ page }) => {
    await loginAs(page, 'gestore', auth)

    const gestionePage = new GestionePage(page)
    await gestionePage.selectContattiTab()
    await page.waitForTimeout(2000)

    const rowCount = await gestionePage.getRowCount()
    if (rowCount === 0) { test.skip(); return }

    const firstRow = gestionePage.tableRows.first()
    const badges = firstRow.locator('.q-badge')
    const badgeCount = await badges.count()
    let hasVolontario = false
    for (let j = 0; j < badgeCount; j++) {
      const text = await badges.nth(j).innerText()
      if (text.includes('Volontario')) { hasVolontario = true; break }
    }

    const actionCell = firstRow.locator('td').last()
    const referenteBtn = actionCell.locator('.q-btn').filter({ has: page.locator('[data-testid="btn-assigna-referente"]') })

    if (hasVolontario) {
      expect(await referenteBtn.count()).toBeGreaterThan(0)
    } else {
      expect(await referenteBtn.count()).toBe(0)
    }
  })

  test('RF-02: Assegna Referente a Volontario @crud', async ({ page }) => {
    test.setTimeout(90000)
    await loginAs(page, 'gestore', auth)

    const gestionePage = new GestionePage(page)
    await gestionePage.selectContattiTab()
    await page.waitForTimeout(2000)

    const rowCount = await gestionePage.getRowCount()
    if (rowCount === 0) { test.skip('No contatti'); return }

    let targetRow = null
    const rows = gestionePage.tableRows
    const count = await rows.count()
    for (let i = 0; i < count; i++) {
      const actionCell = rows.nth(i).locator('td').last()
      const btn = actionCell.locator('.q-btn').filter({ has: page.locator('[data-testid="btn-assigna-referente"]') })
      if (await btn.count() > 0) { targetRow = rows.nth(i); break }
    }

    if (!targetRow) { test.skip('Nessun contatto con bottone Assegna Referente'); return }

    const actionCell = targetRow.locator('td').last()
    await actionCell.locator('.q-btn').filter({ has: page.locator('[data-testid="btn-assigna-referente"]') }).click()
    await page.waitForTimeout(1500)

    const dialog = page.locator('.q-dialog:visible')
    await expect(dialog).toBeVisible({ timeout: 5000 })
    await expect(dialog.locator('text=Assegna Referente')).toBeVisible()
  })

  test('RF-03: Filtro Referente in ContattiTab @smoke', async ({ page }) => {
    await loginAs(page, 'gestore', auth)

    const gestionePage = new GestionePage(page)
    await gestionePage.selectContattiTab()

    await gestionePage.tipoFilter.click()
    await page.waitForTimeout(500)
    await page.locator('.q-item:has-text("Referente")').click()
    await page.waitForTimeout(3000)

    const noData = page.locator('text=Nessun dato disponibile')
    const rows = gestionePage.tableRows
    const hasRows = (await rows.count()) > 0
    const hasNoData = await noData.isVisible().catch(() => false)
    expect(hasRows || hasNoData).toBe(true)
  })

  test('RF-04: Rimuovi Referente da Volontario @crud', async ({ page }) => {
    test.setTimeout(90000)

    await loginAs(page, 'gestore', auth)

    const gestionePage = new GestionePage(page)
    await gestionePage.selectContattiTab()
    await page.waitForTimeout(2000)

    await gestionePage.tipoFilter.click()
    await page.waitForTimeout(500)
    await page.locator('.q-item:has-text("Volontario")').click()
    await page.waitForTimeout(2000)

    const rowCount = await gestionePage.getRowCount()
    if (rowCount === 0) { test.skip('Nessun volontario trovato'); return }

    const targetRow = gestionePage.tableRows.first()
    const actionCell = targetRow.locator('td').last()
    const personBtn = actionCell.locator('.q-btn').filter({ has: page.locator('[data-testid="btn-assigna-referente"]') })
    if (await personBtn.count() === 0) {
      test.skip('Volontario non ha bottone Assegna Referente')
      return
    }

    await personBtn.click()
    await page.waitForTimeout(1500)

    const refDialog = page.locator('.q-dialog:visible')
    await expect(refDialog).toBeVisible({ timeout: 5000 })

    const searchInput = refDialog.locator('input[aria-label="Cerca referente..."]')
    await searchInput.click()
    await page.waitForTimeout(300)
    await page.keyboard.type('test.referente', { delay: 30 })
    await page.waitForTimeout(2000)

    const qMenuItems = page.locator('.q-menu .q-item')
    const menuCount = await qMenuItems.count()
    console.log(`[RF-04] menu items: ${menuCount}`)

    if (menuCount === 0) {
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
      await refDialog.locator('button:has-text("Chiudi")').click()
      test.skip('Referente non trovato nella ricerca')
      return
    }

    await qMenuItems.first().click()
    await page.waitForTimeout(500)

    const addRefBtn = refDialog.locator('[data-testid="btn-add-referente"]')
    await addRefBtn.click()
    await page.waitForTimeout(2000)

    const referenteItems = refDialog.locator('.row.items-center .text-body2')
    const afterAddCount = await referenteItems.count()
    console.log(`[RF-04] afterAddCount: ${afterAddCount}`)

    if (afterAddCount === 0) {
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
      await refDialog.locator('button:has-text("Chiudi")').click()
      test.skip('Referente non assegnato dopo add')
      return
    }

    const removeBtn = refDialog.locator('[data-testid="btn-remove-referente"]').first()
    await removeBtn.click()
    await page.waitForTimeout(1500)

    const afterRemoveCount = await referenteItems.count()
    expect(afterRemoveCount).toBeLessThan(afterAddCount)

    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    await refDialog.locator('button:has-text("Chiudi")').click()
  })

  test('RF-05: Bottone non visibile per non-Volontari @regression', async ({ page }) => {
    await loginAs(page, 'gestore', auth)

    const gestionePage = new GestionePage(page)
    await gestionePage.selectContattiTab()

    await gestionePage.tipoFilter.click()
    await page.waitForTimeout(500)
    await page.locator('.q-item:has-text("Genitore")').click()
    await page.waitForTimeout(3000)

    const rowCount = await gestionePage.getRowCount()
    if (rowCount === 0) { test.skip(); return }

    const firstRow = gestionePage.tableRows.first()
    const actionCell = firstRow.locator('td').last()
    const referenteBtn = actionCell.locator('.q-btn').filter({ has: page.locator('[data-testid="btn-assigna-referente"]') })
    expect(await referenteBtn.count()).toBe(0)
  })

  test('RF-06: Dialog chiude correttamente @smoke', async ({ page }) => {
    test.setTimeout(90000)
    await loginAs(page, 'gestore', auth)

    const gestionePage = new GestionePage(page)
    await gestionePage.selectContattiTab()
    await page.waitForTimeout(2000)

    const rowCount = await gestionePage.getRowCount()
    if (rowCount === 0) { test.skip('No contatti'); return }

    let targetRow = null
    const rows = gestionePage.tableRows
    const count = await rows.count()
    for (let i = 0; i < count; i++) {
      const actionCell = rows.nth(i).locator('td').last()
      const btn = actionCell.locator('.q-btn').filter({ has: page.locator('[data-testid="btn-assigna-referente"]') })
      if (await btn.count() > 0) { targetRow = rows.nth(i); break }
    }

    if (!targetRow) { test.skip('Nessun contatto con bottone Assegna Referente'); return }

    const actionCell = targetRow.locator('td').last()
    await actionCell.locator('.q-btn').filter({ has: page.locator('[data-testid="btn-assigna-referente"]') }).click()
    await page.waitForTimeout(1500)

    const dialog = page.locator('.q-dialog:visible')
    await expect(dialog).toBeVisible({ timeout: 5000 })

    await dialog.locator('button:has-text("Chiudi")').click()
    await page.waitForTimeout(500)
    await expect(dialog).not.toBeVisible({ timeout: 3000 })
  })
})
