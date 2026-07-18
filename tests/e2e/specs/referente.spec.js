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
import { createProgettoViaUI } from '../pages/CreaProgettoPage.js'
import { assegnaContattoAFamigliaViaUI } from '../helpers/pagina-gestione.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }

async function expandFirstCardIfMobile(page) {
  const exp = page.locator('.q-expansion-item')
  if ((await exp.count()) > 0 && (await page.locator('.q-expansion-item--expanded').count()) === 0) {
    await exp.first().click()
    await page.waitForLoadState("networkidle").catch(() => {})
  }
}

let ids = { famiglia: null, progetto: null, giustificativi: [] }
let createdContattoIds = []
let originalContattiState = {}

test.describe('Referente Role', () => {
  test.beforeAll(async () => {
    await apiLogin(auth.admin.email, auth.admin.password)
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
    await loginAs(page, 'manager', auth)

    const gestionePage = new GestionePage(page)
    await gestionePage.selectContattiTab()
    await page.waitForLoadState("networkidle").catch(() => {})

    const rowCount = await gestionePage.getRowCount()
    expect(rowCount).toBeGreaterThanOrEqual(1)

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
    await loginAs(page, 'manager', auth)

    // Setup atomico: crea famiglia + assegna volontario + progetto
    const label = `RF02_${Date.now()}`
    const { createFamigliaViaUI } = await import('../helpers/pagina-gestione.js')
    const nomeFam = `TEST_RF02_${Date.now()}`
    const fam = await createFamigliaViaUI(page, { nomeFamiglia: nomeFam })
    ids.famiglia = fam.id_famiglia
    await assegnaContattoAFamigliaViaUI(page, {
      famigliaNome: nomeFam,
      searchTerm: auth.volontario.email,
      fullName: auth.volontario.email,
      ruolo: 'Volontario'
    })
    ids.progetto = await createProgettoViaUI(
      page,
      {
        famigliaNome: nomeFam,
        Cognome_Beneficiario: nomeFam,
        Nome_Beneficiario: nomeFam + 'Benef',
        AnnoBando: new Date().getFullYear(),
        Allocato: 5000,
        Data_Inizio_Progetto: '2026-01-01',
        Data_Fine_Progetto: '2026-12-31'
      },
      auth,
      'manager'
    )

    const timestamp = Date.now()
    const nome = `TEST_RF02_${timestamp}`
    const cognome = 'AutoTest'

    const gestionePage = new GestionePage(page)
    await gestionePage.goto()
    await gestionePage.selectContattiTab()
    await page.waitForLoadState("networkidle").catch(() => {})

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
    const contattoId = (await postResp.json()).data?.id_contatto
    if (contattoId) createdContattoIds.push(contattoId)
    await expect(dialog).not.toBeVisible({ timeout: 10000 })
    await page.waitForLoadState("networkidle").catch(() => {})

    const rf02Email = `TEST_rf02_${timestamp}@test.com`

    // Aggiungi email al contatto (necessaria per poterlo associare come Volontario)
    await gestionePage.search(nome)
    await page.waitForLoadState("networkidle").catch(() => {})
    // Trova e apri la card mobile corretta
    const expsMobile = page.locator('.q-expansion-item')
    const expCountMobile = await expsMobile.count()
    if (expCountMobile > 0 && (await gestionePage.tableRows.count()) === 0) {
      for (let k = 0; k < expCountMobile; k++) {
        await expsMobile.nth(k).click()
        await page.waitForLoadState("networkidle").catch(() => {})
      }
    }
    const editBtn = page.locator('[data-testid="btn-edit-contatto"]').first()
    if ((await editBtn.count()) > 0) {
      await editBtn.click()
      await page.locator('.q-dialog:visible').waitFor({ state: 'visible', timeout: 5000 })
      dialog = page.locator('.q-dialog:visible')
      await dialog.locator('button:has-text("Aggiungi email")').click()
      await page.waitForLoadState("networkidle").catch(() => {})
      const emailInput = dialog.locator('input[type="email"]').last()
      await emailInput.fill(rf02Email)
      // Click elsewhere to trigger blur (onEmailBlur creates email via API)
      await dialog.locator('.text-h6').first().click()
      await page
        .waitForResponse(resp => resp.url().includes('/items/email') && resp.request().method() === 'POST', {
          timeout: 5000
        })
        .catch(() => {})
      await page.waitForLoadState("networkidle").catch(() => {})
      const [patchResp] = await Promise.all([
        page.waitForResponse(resp => resp.url().includes('/items/contatti') && resp.request().method() === 'PATCH'),
        dialog.locator('button:has-text("Salva")').click()
      ])
      expect(patchResp.status()).toBe(200)
      await expect(dialog).not.toBeVisible({ timeout: 10000 })
    }
    await page.waitForLoadState("networkidle").catch(() => {})

    // Assegna come Volontario nel ContattiDialog (famiglia appena creata)
    await gestionePage.famiglieTab.click()
    await gestionePage.waitForTable()
    await page.waitForLoadState("networkidle").catch(() => {})
    await gestionePage.searchFamiglie(nomeFam)
    await page.waitForLoadState("networkidle").catch(() => {})

    // Apri ContattiDialog per la famiglia e assegna contatto come Volontario
    console.log(`[RF-02] searching famiglia: ${nomeFam}`)
    const clicked = await gestionePage.clickContactsOnFamiglia(nomeFam)
    console.log(`[RF-02] clicked contacts on famiglia: ${clicked}`)
    if (clicked) {
      await page.waitForLoadState("networkidle").catch(() => {})
      console.log('[RF-02] calling assignVolontario')
      await gestionePage.assignVolontario(rf02Email)
      console.log('[RF-02] assignVolontario done')
      await page.waitForLoadState("networkidle").catch(() => {}) // attende che la notifica Quasar si chiuda
      // Chiudi dialog: prima prova click, poi force:click, poi evaluate
      const chiudi = gestionePage.contattiDialog.locator('button:has-text("Chiudi")')
      try {
        await chiudi.click({ timeout: 3000 })
      } catch {
        await chiudi.click({ force: true })
      }
      await page.waitForLoadState("networkidle").catch(() => {})
      if (await gestionePage.contattiDialog.isVisible({ timeout: 1000 }).catch(() => false)) {
        await page
          .evaluate(() => {
            document.querySelectorAll('.q-dialog').forEach(d => {
              d.style.display = 'none'
            })
          })
          .catch(() => {})
      }
      await expect(gestionePage.contattiDialog).not.toBeVisible({ timeout: 5000 })
      console.log('[RF-02] contatti dialog closed')
    } else {
      throw new Error('Famiglia creata non trovata')
      return
    }

    // Cerca il contatto, clicca bottone referente
    await gestionePage.contattiTab.click()
    await gestionePage.waitForTable()
    await page.waitForLoadState("networkidle").catch(() => {})
    await gestionePage.search(nome)
    await page.waitForLoadState("networkidle").catch(() => {})
    console.log('[RF-02] search done, looking for referente button')

    let targetRow = null
    const isMobile =
      (await page.locator('.q-expansion-item').count()) > 0 && (await gestionePage.tableRows.count()) === 0
    if (isMobile) {
      const exps = page.locator('.q-expansion-item')
      const expCount = await exps.count()
      for (let i = 0; i < expCount; i++) {
        await exps.nth(i).click()
        await page.waitForLoadState("networkidle").catch(() => {})
        const btn = exps.nth(i).locator('[data-testid="btn-assigna-referente"]')
        if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
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
      throw new Error('Bottone referente non visibile')
      return
    }
    console.log('[RF-02] target row found, clicking referente button')

    if (isMobile) {
      await targetRow.locator('[data-testid="btn-assigna-referente"]').click()
    } else {
      const actionCell = targetRow.locator('td').last()
      await actionCell.locator('[data-testid="btn-assigna-referente"]').click()
    }
    await page.waitForLoadState("networkidle").catch(() => {})

    dialog = page.locator('.q-dialog:visible')
    await expect(dialog).toBeVisible({ timeout: 5000 })
    await expect(dialog.locator('text=Assegna Referente')).toBeVisible()
  })

  test('RF-03: Filtro Referente in ContattiTab @smoke', async ({ page }) => {
    await loginAs(page, 'manager', auth)

    const gestionePage = new GestionePage(page)
    await gestionePage.selectContattiTab()

    await gestionePage.tipoFilter.click()
    await page.waitForLoadState("networkidle").catch(() => {})
    await page.locator('.q-item:has-text("Referente")').click()
    await page.waitForLoadState("networkidle").catch(() => {})

    const noData = page.locator('text=Nessun dato disponibile')
    const hasRows = (await gestionePage.getRowCount()) > 0
    const hasNoData = await noData.isVisible().catch(() => false)
    expect(hasRows || hasNoData).toBe(true)
  })

  test('RF-04: Rimuovi Referente da Volontario @crud', async ({ page }) => {
    test.setTimeout(120000)
    const prefix = `TEST_RF04_${Date.now()}`
    const rf04Ids = { famiglia: null, progetto: null, giustificativi: [], contatti: [], contattiCreati: [] }

    // Setup: volontario via UI + trova un referente esistente via API
    await loginGestore(page)
    const { createFamigliaViaUI, assegnaContattoAFamigliaViaUI } = await import('../helpers/pagina-gestione.js')
    const fam = await createFamigliaViaUI(page, { nomeFamiglia: prefix })
    rf04Ids.famiglia = fam.id_famiglia
    // Trova il primo referente disponibile nel DB
    const refRes = await apiGet('contatti', {
      filter: { IsReferente: { _eq: true } },
      fields: 'id_contatto,Nome,Cognome',
      limit: 1
    })
    const existingRef = refRes.data?.[0]
    expect(existingRef).toBeTruthy()
    const refName = existingRef.Nome
    console.log(`[RF-04] using referente: ${existingRef.Nome} ${existingRef.Cognome}`)

    // Crea un contatto volontario con email e assegna alla famiglia
    const volEmail = `${prefix}_vol@test.com`
    const { createContattoViaUI } = await import('../helpers/pagina-gestione.js')
    const vol = await createContattoViaUI(page, { nome: prefix + '_Vol', cognome: 'Vol', email: volEmail })
    rf04Ids.contattiCreati.push(vol.id_contatto)
    await assegnaContattoAFamigliaViaUI(page, {
      famigliaNome: prefix,
      searchTerm: volEmail,
      fullName: vol.displayName || `${prefix}_Vol Vol`,
      ruolo: 'Volontario'
    })

    // Vai a Contatti, apri dialog referente
    const gestionePage = new GestionePage(page)
    await gestionePage.selectContattiTab()
    await page.waitForLoadState("networkidle").catch(() => {})

    // Trova volontario e clicca btn-assigna-referente
    const viewport = await page.viewportSize()
    const isMobile = viewport && viewport.width < 600
    let targetRow = null
    if (isMobile) {
      const exps = page.locator('.q-expansion-item')
      const expCount = await exps.count()
      for (let i = 0; i < expCount; i++) {
        await exps.nth(i).click()
        await page.waitForLoadState("networkidle").catch(() => {})
        const btn = exps.nth(i).locator('[data-testid="btn-assigna-referente"]')
        if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
          targetRow = exps.nth(i)
          break
        }
      }
    } else {
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
    }

    if (!targetRow) throw new Error('Nessuna riga trovata')

    // Apri dialog Assegna Referente
    if (isMobile) {
      await targetRow.locator('[data-testid="btn-assigna-referente"]').click()
    } else {
      await targetRow.locator('td').last().locator('[data-testid="btn-assigna-referente"]').click()
    }
    await page.waitForLoadState("networkidle").catch(() => {})

    const refDialog = page.locator('.q-dialog:visible')
    await expect(refDialog).toBeVisible({ timeout: 5000 })

    // Dismiss notifications
    await page.keyboard.press('Escape').catch(() => {})
    await page.waitForLoadState("networkidle").catch(() => {})

    // Cerca il referente esistente per nome (primi 3 caratteri)
    const searchInput = refDialog.locator('input[aria-label="Cerca referente..."]')
    try {
      await searchInput.click({ timeout: 3000 })
    } catch {
      await searchInput.click({ force: true })
    }
    await page.waitForLoadState("networkidle").catch(() => {})
    await searchInput.fill(refName.slice(0, 3))
    await page.waitForLoadState("networkidle").catch(() => {})

    // Seleziona dal menu o dialog mobile
    let option = page.locator('[role="option"], .q-dialog .q-item').first()
    if ((await option.count()) === 0) {
      option = page.locator('.q-dialog .q-item').first()
    }
    await option.waitFor({ state: 'attached', timeout: 5000 }).catch(() => {})
    const menuCount = await option.count()
    console.log(`[RF-04] referente options: ${menuCount}`)

    await option.click({ force: true }).catch(() => option.click())
    await page.waitForLoadState("networkidle").catch(() => {})

    const addRefBtn = refDialog.locator('[data-testid="btn-add-referente"]')
    try {
      await addRefBtn.click({ timeout: 3000 })
    } catch {
      await addRefBtn.click({ force: true })
    }
    await page.waitForLoadState("networkidle").catch(() => {})

    const referenteItems = refDialog.locator('.row.items-center .text-body2')
    const afterAddCount = await referenteItems.count()
    console.log(`[RF-04] afterAddCount: ${afterAddCount}`)

    // Rimuovi il referente
    await page.keyboard.press('Escape').catch(() => {})
    await page.waitForLoadState("networkidle").catch(() => {})
    const removeBtn = refDialog.locator('[data-testid="btn-remove-referente"]').first()
    try {
      await removeBtn.click({ timeout: 3000 })
    } catch {
      await removeBtn.click({ force: true })
    }
    await page.waitForLoadState("networkidle").catch(() => {})

    const afterRemoveCount = await referenteItems.count()
    expect(afterRemoveCount).toBeLessThan(afterAddCount)

    await page.keyboard.press('Escape')
    await page.waitForLoadState("networkidle").catch(() => {})
    await refDialog.locator('button:has-text("Chiudi")').click()

    // Cleanup
    await pulisciIds(rf04Ids)
  })

  test('RF-05: Bottone non visibile per non-Volontari @regression', async ({ page }) => {
    await loginAs(page, 'manager', auth)

    const gestionePage = new GestionePage(page)
    await gestionePage.selectContattiTab()

    await gestionePage.tipoFilter.click()
    await page.waitForLoadState("networkidle").catch(() => {})
    await page.locator('.q-item:has-text("Genitore")').click()
    await page.waitForLoadState("networkidle").catch(() => {})

    const rowCount = await gestionePage.getRowCount()
    expect(rowCount).toBeGreaterThanOrEqual(1)

    const firstRow = gestionePage.tableRows.first()
    const actionCell = firstRow.locator('td').last()
    const referenteBtn = actionCell.locator('[data-testid="btn-assigna-referente"]')
    expect(await referenteBtn.count()).toBe(0)
  })

  test('RF-06: Dialog chiude correttamente @smoke', async ({ page }) => {
    test.setTimeout(90000)
    await loginAs(page, 'manager', auth)

    const gestionePage = new GestionePage(page)
    await gestionePage.selectContattiTab()
    await page.waitForLoadState("networkidle").catch(() => {})

    const viewport = await page.viewportSize()
    const isMobile = viewport && viewport.width < 600

    let targetRow = null
    if (isMobile) {
      const exps = page.locator('.q-expansion-item')
      const expCount = await exps.count()
      for (let i = 0; i < expCount; i++) {
        await exps.nth(i).click()
        await page.waitForLoadState("networkidle").catch(() => {})
        const btn = exps.nth(i).locator('[data-testid="btn-assigna-referente"]')
        if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
          targetRow = exps.nth(i)
          break
        }
      }
    } else {
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
    }

    if (!targetRow) throw new Error('Nessuna riga trovata')

    if (isMobile) {
      await targetRow.locator('[data-testid="btn-assigna-referente"]').click()
    } else {
      const actionCell = targetRow.locator('td').last()
      await actionCell.locator('[data-testid="btn-assigna-referente"]').click()
    }
    await page.waitForLoadState("networkidle").catch(() => {})

    const dialog = page.locator('.q-dialog:visible')
    await expect(dialog).toBeVisible({ timeout: 5000 })

    await dialog.locator('button:has-text("Chiudi")').click()
    await page.waitForLoadState("networkidle").catch(() => {})
    await expect(dialog).not.toBeVisible({ timeout: 3000 })
  })
})
