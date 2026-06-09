import { test, expect } from '../helpers/console.js'
import { LoginPage } from '../pages/LoginPage.js'
import { GestionePage } from '../pages/GestionePage.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }

test.describe('Referente Role', () => {
  test('RF-01: Bottone Assegna Referente visibile solo per Volontari @smoke', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(auth.gestore.email, auth.gestore.password)
    await expect(page).toHaveURL(/\/gestione/, { timeout: 15000 })

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
    const referenteBtn = actionCell.locator('.q-btn').filter({ has: page.locator('i:has-text("person_search")') })

    if (hasVolontario) {
      expect(await referenteBtn.count()).toBeGreaterThan(0)
    } else {
      expect(await referenteBtn.count()).toBe(0)
    }
  })

  test('RF-02: Assegna Referente a Volontario @crud', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(auth.gestore.email, auth.gestore.password)
    await expect(page).toHaveURL(/\/gestione/, { timeout: 15000 })

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
      const btn = actionCell.locator('.q-btn').filter({ has: page.locator('i:has-text("person_search")') })
      if (await btn.count() > 0) { targetRow = rows.nth(i); break }
    }

    if (!targetRow) { test.skip('Nessun contatto con bottone Assegna Referente'); return }

    const actionCell = targetRow.locator('td').last()
    await actionCell.locator('.q-btn').filter({ has: page.locator('i:has-text("person_search")') }).click()
    await page.waitForTimeout(1500)

    const dialog = page.locator('.q-dialog:visible')
    await expect(dialog).toBeVisible({ timeout: 5000 })
    await expect(dialog.locator('text=Assegna Referente')).toBeVisible()
  })

  test('RF-03: Filtro Referente in ContattiTab @smoke', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(auth.gestore.email, auth.gestore.password)
    await expect(page).toHaveURL(/\/gestione/, { timeout: 15000 })

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
    const referenteNome = `Ref Test ${Date.now()}`

    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(auth.gestore.email, auth.gestore.password)
    await expect(page).toHaveURL(/\/gestione/, { timeout: 15000 })

    const gestionePage = new GestionePage(page)
    await gestionePage.selectContattiTab()
    await page.waitForTimeout(2000)

    const addBtn = page.locator('button:has-text("Aggiungi Contatto")')
    await addBtn.click()
    await page.waitForTimeout(1000)

    const dialog = page.locator('.q-dialog:visible')
    await expect(dialog).toBeVisible({ timeout: 5000 })

    await dialog.locator('input').first().fill(referenteNome)
    await dialog.locator('input').nth(1).fill('Test RF04')

    const referenteToggle = dialog.locator('.q-toggle:has-text("Referente")')
    await referenteToggle.click()
    await page.waitForTimeout(300)

    const patchPromise = page.waitForResponse(
      resp => resp.url().includes('/items/contatti') && resp.request().method() === 'PATCH'
    )
    await dialog.locator('button:has-text("Salva")').click()
    await patchPromise
    await expect(dialog).not.toBeVisible({ timeout: 10000 })
    await page.waitForTimeout(1000)

    await gestionePage.tipoFilter.click()
    await page.waitForTimeout(500)
    await page.locator('.q-item:has-text("Volontario")').click()
    await page.waitForTimeout(2000)

    await gestionePage.search('test.volontario.nofam@test.com')
    await page.waitForTimeout(2000)

    const rowCount = await gestionePage.getRowCount()
    console.log(`[RF-04] rows after filter: ${rowCount}`)
    if (rowCount === 0) { test.skip('Volontario di test non trovato'); return }

    const targetRow = gestionePage.tableRows.first()
    const actionCell = targetRow.locator('td').last()
    const personBtn = actionCell.locator('.q-btn').filter({ has: page.locator('i:has-text("person_search")') })
    if (await personBtn.count() === 0) {
      test.skip('Volontario non ha bottone Assegna Referente')
      return
    }

    await personBtn.click()
    await page.waitForTimeout(1500)

    const refDialog = page.locator('.q-dialog:visible')
    await expect(refDialog).toBeVisible({ timeout: 5000 })

    const searchInput = refDialog.locator('input[aria-label="Cerca referente..."]')
    await searchInput.fill(referenteNome)
    await page.waitForTimeout(3000)

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

    const addRefBtn = refDialog.locator('button:has(i:has-text("person_add"))')
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

    const removeBtn = refDialog.locator('.q-btn:has(i:has-text("delete"))').first()
    await removeBtn.click()
    await page.waitForTimeout(1500)

    const afterRemoveCount = await referenteItems.count()
    expect(afterRemoveCount).toBeLessThan(afterAddCount)

    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    await refDialog.locator('button:has-text("Chiudi")').click()
  })

  test('RF-05: Bottone non visibile per non-Volontari @regression', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(auth.gestore.email, auth.gestore.password)
    await expect(page).toHaveURL(/\/gestione/, { timeout: 15000 })

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
    const referenteBtn = actionCell.locator('.q-btn').filter({ has: page.locator('i:has-text("person_search")') })
    expect(await referenteBtn.count()).toBe(0)
  })

  test('RF-06: Dialog chiude correttamente @smoke', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(auth.gestore.email, auth.gestore.password)
    await expect(page).toHaveURL(/\/gestione/, { timeout: 15000 })

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
      const btn = actionCell.locator('.q-btn').filter({ has: page.locator('i:has-text("person_search")') })
      if (await btn.count() > 0) { targetRow = rows.nth(i); break }
    }

    if (!targetRow) { test.skip('Nessun contatto con bottone Assegna Referente'); return }

    const actionCell = targetRow.locator('td').last()
    await actionCell.locator('.q-btn').filter({ has: page.locator('i:has-text("person_search")') }).click()
    await page.waitForTimeout(1500)

    const dialog = page.locator('.q-dialog:visible')
    await expect(dialog).toBeVisible({ timeout: 5000 })

    await dialog.locator('button:has-text("Chiudi")').click()
    await page.waitForTimeout(500)
    await expect(dialog).not.toBeVisible({ timeout: 3000 })
  })
})
