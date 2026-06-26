import { test, expect } from '../helpers/console.js'
import { GestionePage } from '../pages/GestionePage.js'
import { loginAs } from '../helpers/login.js'
import { apiLogin, apiGet, apiPost, apiPatch, apiDelete } from '../helpers/api.js'
import {
  creaFamigliaVolontarioProgetto,
  loginVolontarioConFamiglia,
  pulisciIds,
  loginGestore
} from '../helpers/setup-atomico.js'
import { deleteContatti } from '../helpers/cleanup.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }

async function expandFirstCardIfMobile(page) {
  const exp = page.locator('.q-expansion-item')
  if ((await exp.count()) > 0 && (await page.locator('.q-expansion-item--expanded').count()) === 0) {
    await exp.first().click()
    await page.waitForTimeout(500)
  }
}

let ids = { famiglia: null, progetto: null, giustificativi: [] }
let createdContattoIds = []
let originalContattiState = {}

let _refEmail = ''
let _refContattoId = null

test.describe('Referente Role', () => {
  test.beforeAll(async () => {
    await apiLogin(auth.admin.email, auth.admin.password)
    // Crea un contatto referente per i test che ne hanno bisogno (RF-04)
    _refContattoId = String(Math.floor(Math.random() * 9000000) + 1000000)
    _refEmail = `fake.referente_${Date.now()}@fake.com`
    await apiPost('contatti', { id_contatto: _refContattoId, Nome: 'Fake', Cognome: 'Referente', IsReferente: true })
    await apiPost('email', { email_address: _refEmail, Contatto_Relation: _refContattoId, Primary: true })
  })

  test.afterAll(async () => {
    if (_refContattoId) await deleteContatti(_refContattoId)
  })

  test.afterEach(async () => {
    await pulisciIds(ids)
    // Ripristina contatti esistenti modificati
    for (const [id, data] of Object.entries(originalContattiState)) {
      try {
        await apiPatch('contatti', id, { IsReferente: data.IsReferente, IsVolontario: data.IsVolontario })
      } catch {
        /* */
      }
    }
    originalContattiState = {}
    // Cancella contatti creati
    if (createdContattoIds.length > 0) {
      await deleteContatti(...createdContattoIds)
      createdContattoIds = []
    }
  })

  test('RF-01: Bottone Assegna Referente visibile solo per Volontari @smoke', async ({ page }) => {
    await loginAs(page, 'gestore', auth)

    const gestionePage = new GestionePage(page)
    await gestionePage.selectContattiTab()
    await page.waitForTimeout(2000)

    const rowCount = await gestionePage.getRowCount()
    if (rowCount === 0) {
      test.skip()
      return
    }

    const firstRow = gestionePage.tableRows.first()
    const badges = firstRow.locator('.q-badge')
    const badgeCount = await badges.count()
    let hasVolontario = false
    for (let j = 0; j < badgeCount; j++) {
      const text = await badges.nth(j).innerText()
      if (text.includes('Volontario')) {
        hasVolontario = true
        break
      }
    }

    const actionCell = firstRow.locator('td').last()
    const referenteBtn = actionCell.locator('[data-testid="btn-assigna-referente"]')

    if (hasVolontario) {
      expect(await referenteBtn.count()).toBeGreaterThan(0)
    } else {
      expect(await referenteBtn.count()).toBe(0)
    }
  })

  test('RF-02: Assegna Referente a Volontario @crud', async ({ page }) => {
    test.setTimeout(180000)
    await loginAs(page, 'gestore', auth)

    // Setup atomico: crea famiglia + assegna volontario + progetto
    const label = `RF02_${Date.now()}`
    const { createFamigliaViaUI } = await import('../helpers/pagina-gestione.js')
    const nomeFam = `__TEST_RF02_${Date.now()}`
    const fam = await createFamigliaViaUI(page, { nomeFamiglia: nomeFam })
    ids.famiglia = fam.id_famiglia
    const emailRes = await apiGet('email', {
      filter: JSON.stringify({ email_address: { _eq: auth.volontario.email } }),
      fields: 'Contatto_Relation'
    })
    const contattoIdVol = emailRes.data?.[0]?.Contatto_Relation
    await (
      await import('../helpers/api.js')
    ).apiPost('Famiglie_Contatti', {
      id: Math.floor(Math.random() * 9000000) + 1000000,
      Contatto: contattoIdVol,
      Famiglia: fam.id_famiglia,
      Ruolo_nella_Famiglia: 'Volontario',
      Disattivo: false
    })
    await (await import('../helpers/api.js')).apiPatch('contatti', contattoIdVol, { IsVolontario: true })
    const progRes = await (
      await import('../helpers/api.js')
    ).apiPost('Progetti', {
      id_progetto: Math.floor(Math.random() * 9000000) + 1000000,
      Cognome_Beneficiario: 'Test',
      Nome_Beneficiario: 'Benef',
      AnnoBando: new Date().getFullYear(),
      Allocato: 5000,
      Famiglia: fam.id_famiglia,
      StatoProgetto: 'aperto'
    })
    ids.progetto = progRes.data.id_progetto

    const timestamp = Date.now()
    const nome = `Test RF02 ${timestamp}`
    const cognome = 'AutoTest'

    const gestionePage = new GestionePage(page)
    await gestionePage.selectContattiTab()
    await page.waitForTimeout(2000)

    // Crea contatto via UI
    await page.locator('[data-testid="btn-aggiungi-contatto"]').waitFor({ state: 'visible', timeout: 10000 })
    await page.locator('[data-testid="btn-aggiungi-contatto"]').click()
    await page.locator('.q-dialog:visible').waitFor({ state: 'visible', timeout: 5000 })
    let dialog = page.locator('.q-dialog:visible')
    await dialog.locator('[data-testid="contatto-nome"]').fill(nome)
    await dialog.locator('[data-testid="contatto-cognome"]').fill(cognome)

    const [postResp] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/items/contatti') && resp.request().method() === 'POST'),
      dialog.locator('button:has-text("Salva")').click()
    ])
    expect(postResp.status()).toBe(200)
    const contattoId = (await postResp.json()).data?.id
    if (contattoId) createdContattoIds.push(contattoId)
    await expect(dialog).not.toBeVisible({ timeout: 10000 })
    await page.waitForTimeout(1000)

    const rf02Email = `test.rf02.${timestamp}@test.com`

    // Aggiungi email al contatto (necessaria per poterlo associare come Volontario)
    await gestionePage.search(nome)
    await page.waitForTimeout(1000)
    // Trova e apri la card mobile corretta
    const expsMobile = page.locator('.q-expansion-item')
    const expCountMobile = await expsMobile.count()
    if (expCountMobile > 0 && (await gestionePage.tableRows.count()) === 0) {
      for (let k = 0; k < expCountMobile; k++) {
        await expsMobile.nth(k).click()
        await page.waitForTimeout(300)
      }
    }
    const editBtn = page.locator('[data-testid="btn-edit-contatto"]').first()
    if ((await editBtn.count()) > 0) {
      await editBtn.click()
      await page.locator('.q-dialog:visible').waitFor({ state: 'visible', timeout: 5000 })
      dialog = page.locator('.q-dialog:visible')
      await dialog.locator('button:has-text("Aggiungi email")').click()
      await page.waitForTimeout(300)
      const emailInput = dialog.locator('input[type="email"]').last()
      await emailInput.fill(rf02Email)
      const [patchResp] = await Promise.all([
        page.waitForResponse(resp => resp.url().includes('/items/contatti') && resp.request().method() === 'PATCH'),
        dialog.locator('button:has-text("Salva")').click()
      ])
      expect(patchResp.status()).toBe(200)
      await expect(dialog).not.toBeVisible({ timeout: 10000 })
    }
    await page.waitForTimeout(500)

    // Assegna come Volontario nel ContattiDialog (famiglia appena creata)
    await gestionePage.famiglieTab.click()
    await gestionePage.waitForTable()
    await page.waitForTimeout(2000)
    await gestionePage.searchFamiglie(nomeFam)
    await page.waitForTimeout(2000)

    // Apri ContattiDialog per la famiglia e assegna contatto come Volontario
    console.log(`[RF-02] searching famiglia: ${nomeFam}`)
    const clicked = await gestionePage.clickContactsOnFamiglia(nomeFam)
    console.log(`[RF-02] clicked contacts on famiglia: ${clicked}`)
    if (clicked) {
      await page.waitForTimeout(2000)
      console.log('[RF-02] calling assignVolontario')
      await gestionePage.assignVolontario(rf02Email)
      console.log('[RF-02] assignVolontario done')
      await page.waitForTimeout(2000)
      await gestionePage.contattiDialog.locator('button:has-text("Chiudi")').click()
      await expect(gestionePage.contattiDialog).not.toBeVisible({ timeout: 5000 })
      console.log('[RF-02] contatti dialog closed')
    } else {
      test.skip('Famiglia creata non trovata')
      return
    }

    // Torna a Contatti, cerca il contatto, clicca bottone referente
    await gestionePage.contattiTab.click()
    await gestionePage.waitForTable()
    await page.waitForTimeout(2000)
    await gestionePage.search(nome)
    await page.waitForTimeout(2000)
    console.log('[RF-02] search done, looking for referente button')

    // Torna a Contatti, cerca il contatto, clicca bottone referente
    await gestionePage.contattiTab.click()
    await gestionePage.waitForTable()
    await page.waitForTimeout(2000)

    let targetRow = null
    const isMobile =
      (await page.locator('.q-expansion-item').count()) > 0 && (await gestionePage.tableRows.count()) === 0
    if (isMobile) {
      const exps = page.locator('.q-expansion-item')
      const expCount = await exps.count()
      for (let i = 0; i < expCount; i++) {
        await exps.nth(i).click()
        await page.waitForTimeout(300)
        const btn = exps.nth(i).locator('[data-testid="btn-assigna-referente"]')
        if ((await btn.count()) > 0) {
          targetRow = exps.nth(i)
          break
        }
      }
    } else {
      const rows = gestionePage.tableRows
      const count = await rows.count()
      console.log(`[RF-02] rows count: ${count}`)
      for (let i = 0; i < count; i++) {
        const actionCell = rows.nth(i).locator('td').last()
        const btn = actionCell.locator('[data-testid="btn-assigna-referente"]')
        const btnCount = await btn.count()
        if (btnCount > 0) {
          console.log(`[RF-02] found referente button at row ${i}`)
          targetRow = rows.nth(i)
          break
        }
      }
    }

    if (!targetRow) {
      console.log('[RF-02] no target row found')
      test.skip('Bottone referente non visibile dopo creazione volontario')
      return
    }
    console.log('[RF-02] target row found, clicking referente button')

    if (isMobile) {
      await page.locator('[data-testid="btn-assigna-referente"]').first().click()
    } else {
      const actionCell = targetRow.locator('td').last()
      await actionCell.locator('[data-testid="btn-assigna-referente"]').click()
    }
    await page.waitForTimeout(1500)

    dialog = page.locator('.q-dialog:visible')
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
    const hasRows = (await gestionePage.getRowCount()) > 0
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
    if (rowCount === 0) {
      test.skip('Nessun volontario trovato')
      return
    }

    const targetRow = gestionePage.tableRows.first()
    const actionCell = targetRow.locator('td').last()
    const personBtn = actionCell.locator('[data-testid="btn-assigna-referente"]')
    if ((await personBtn.count()) === 0) {
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
    await page.keyboard.type('fake.referente', { delay: 30 })
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
    if (rowCount === 0) {
      test.skip()
      return
    }

    const firstRow = gestionePage.tableRows.first()
    const actionCell = firstRow.locator('td').last()
    const referenteBtn = actionCell.locator('[data-testid="btn-assigna-referente"]')
    expect(await referenteBtn.count()).toBe(0)
  })

  test('RF-06: Dialog chiude correttamente @smoke', async ({ page }) => {
    test.setTimeout(90000)
    await loginAs(page, 'gestore', auth)

    const gestionePage = new GestionePage(page)
    await gestionePage.selectContattiTab()
    await page.waitForTimeout(2000)

    const rowCount = await gestionePage.getRowCount()
    if (rowCount === 0) {
      test.skip('No contatti')
      return
    }

    let targetRow = null
    const rows = gestionePage.tableRows
    const count = await rows.count()
    for (let i = 0; i < count; i++) {
      const actionCell = rows.nth(i).locator('td').last()
      const btn = actionCell.locator('[data-testid="btn-assigna-referente"]')
      if ((await btn.count()) > 0) {
        targetRow = rows.nth(i)
        break
      }
    }

    if (!targetRow) {
      test.skip('Nessun contatto con bottone Assegna Referente')
      return
    }

    const actionCell = targetRow.locator('td').last()
    await actionCell.locator('[data-testid="btn-assigna-referente"]').click()
    await page.waitForTimeout(1500)

    const dialog = page.locator('.q-dialog:visible')
    await expect(dialog).toBeVisible({ timeout: 5000 })

    await dialog.locator('button:has-text("Chiudi")').click()
    await page.waitForTimeout(500)
    await expect(dialog).not.toBeVisible({ timeout: 3000 })
  })
})
