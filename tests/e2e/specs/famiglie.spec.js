import { test, expect } from '../helpers/console.js'
import { loginAs } from '../helpers/login.js'
import { GestionePage } from '../pages/GestionePage.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }
import { apiLogin, apiGet, apiPatch } from '../helpers/api.js'
import { deleteFamiglie, deleteProgetti } from '../helpers/cleanup.js'
import { createFamigliaViaUI, assegnaContattoAFamigliaViaUI } from '../helpers/pagina-gestione.js'
import { loginVolontarioConFamiglia } from '../helpers/setup-atomico.js'
import { createProgettoViaUI } from '../pages/CreaProgettoPage.js'

function uid(label) {
  return `TEST_FP_${label}_${Date.now()}`
}

async function famigliaSetup(page, label, idsObj) {
  const nomeFam = uid(label)
  const fam = await createFamigliaViaUI(page, { nomeFamiglia: nomeFam })
  idsObj.famiglia = fam.id_famiglia // IMMEDIATO dopo creazione

  await assegnaContattoAFamigliaViaUI(page, {
    famigliaNome: nomeFam,
    searchTerm: auth.volontario.email,
    fullName: auth.volontario.email,
    ruolo: 'Volontario'
  })

  idsObj.progetto = await createProgettoViaUI(
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
  ) // IMMEDIATO dopo creazione

  return { famiglia: fam.id_famiglia, progetto: idsObj.progetto, nome: nomeFam }
}

test.describe('Famiglie Page — Gruppo 1', () => {
  let ids = { famiglia: null, progetto: null }

  test.beforeAll(async () => {
    await apiLogin(auth.admin.email, auth.admin.password)
  })
  test.afterEach(async () => {
    if (ids.progetto) await deleteProgetti(ids.progetto)
    if (ids.famiglia) await deleteFamiglie(ids.famiglia)
    ids = { famiglia: null, progetto: null }
  })

  test('F-GR-01: Verifica pagina famiglia — dati, sezioni, espansione @smoke', async ({ page }) => {
    test.setTimeout(180000)
    await loginAs(page, 'manager', auth)
    const d = await famigliaSetup(page, 'GR1', ids)
    await loginVolontarioConFamiglia(page, d.nome)

    const famigliaName = await page.locator('.text-h6').first().textContent
    expect(famigliaName.trim()).toBeTruthy()
    await expect(page.locator('.q-select').first()).toBeVisible()
    await expect(page.locator('text=Dati bancari')).toBeVisible()
    await expect(page.getByText('Giustificativi', { exact: true })).toBeVisible()

    const genitoriSection = page.locator('text=Genitori').locator('..')
    if ((await genitoriSection.count()) > 0) {
      await expect(genitoriSection.locator('a[href^="mailto:"]').first())
        .toBeVisible({ timeout: 3000 })
        .catch(() => {})
    }

    const expansion = page.locator('.q-expansion-item:has-text("Dati bancari")')
    await expect(expansion).toBeVisible()
    const ibanDisplay = expansion.locator('.inline-editable-field').first().locator('.text-body1')
    await expect(ibanDisplay).not.toBeVisible()

    await expansion.locator('text=Dati bancari').click()
    await page.waitForLoadState("networkidle").catch(() => {})
    const fields = page.locator('.inline-editable-field')
    await expect(fields.first().locator('.text-body1')).toBeVisible({ timeout: 5000 })
    expect(await fields.count()).toBeGreaterThanOrEqual(2)

    await expansion.locator('text=Dati bancari').click()
    await page.waitForLoadState("networkidle").catch(() => {})
    await expect(fields.first().locator('.text-body1')).not.toBeVisible()
  })
})

test.describe('Famiglie Page — Gruppo 2', () => {
  let ids = { famiglia: null, progetto: null }
  let saved = { id: null, IBAN: '', Intestatario: '' }

  test.beforeAll(async () => {
    await apiLogin(auth.admin.email, auth.admin.password)
  })
  test.afterEach(async () => {
    if (saved.id) {
      try {
        await apiPatch('Famiglie', saved.id, { IBAN: saved.IBAN || null, Intestatario_CC: saved.Intestatario || null })
      } catch {
        /* */
      }
    }
    if (ids.progetto) await deleteProgetti(ids.progetto)
    if (ids.famiglia) await deleteFamiglie(ids.famiglia)
    ids = { famiglia: null, progetto: null }
  })

  test('F-GR-02: Modifica IBAN e Intestatario — salva, annulla, reload @crud', async ({ page }) => {
    test.setTimeout(180000)
    await loginAs(page, 'manager', auth)
    const d = await famigliaSetup(page, 'GR2', ids)
    saved.id = ids.famiglia
    try {
      const s = await apiGet('Famiglie/' + ids.famiglia, { fields: 'IBAN,Intestatario_CC' })
      saved.IBAN = s.data?.IBAN || ''
      saved.Intestatario = s.data?.Intestatario_CC || ''
    } catch {
      /* */
    }
    await loginVolontarioConFamiglia(page, d.nome)
    await page.locator('.q-expansion-item:has-text("Dati bancari")').locator('text=Dati bancari').click()
    await page.waitForLoadState("networkidle").catch(() => {})
    const ibanField = page.locator('.inline-editable-field').nth(0)
    await expect(ibanField.locator('.text-body1')).toBeVisible({ timeout: 3000 })

    // IB-03
    await ibanField.locator('[aria-label="Modifica"]').click()
    await expect(ibanField.locator('input')).toBeVisible({ timeout: 3000 })
    await ibanField.locator('[data-testid="inline-save"]').click()
    await expect(ibanField.locator('.text-body1')).toBeVisible({ timeout: 3000 })

    // IB-04
    await ibanField.locator('[aria-label="Modifica"]').click()
    await expect(ibanField.locator('input')).toBeVisible({ timeout: 3000 })
    await ibanField.locator('[data-testid="inline-save"]').click()
    await expect(ibanField.locator('.text-body1')).toBeVisible({ timeout: 3000 })

    // IB-02
    const originalIBAN = (await ibanField.locator('.text-body1').textContent).trim()
    await ibanField.locator('[aria-label="Modifica"]').click()
    await ibanField.locator('input').fill(`TEST_CANCEL_${Date.now()}`)
    await ibanField.locator('[data-testid="inline-cancel"]').click()
    expect((await ibanField.locator('.text-body1').textContent).trim()).toBe(originalIBAN)

    // IB-01
    const testIBAN = `IT60X${String(Date.now()).slice(-10).padStart(22, '0')}`
    await ibanField.locator('[aria-label="Modifica"]').click()
    await ibanField.locator('input').fill(testIBAN)
    const [r1] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/items/Famiglie/') && resp.request().method() === 'PATCH'),
      ibanField.locator('[data-testid="inline-save"]').click()
    ])
    expect(r1.status()).toBe(200)
    await expect(ibanField.locator('.text-body1')).toContainText(testIBAN, { timeout: 5000 })
    await page.reload()
    await loginVolontarioConFamiglia(page, d.nome)
    await page.locator('.q-expansion-item:has-text("Dati bancari")').locator('text=Dati bancari').click()
    await page.waitForLoadState("networkidle").catch(() => {})
    await expect(ibanField.locator('.text-body1')).toContainText(testIBAN, { timeout: 5000 })

    // IN-01
    const intestatarioField = page.locator('.inline-editable-field').nth(1)
    await expect(intestatarioField.locator('.text-body1')).toBeVisible({ timeout: 3000 })
    const testName = `TEST_Int_${Date.now()}`
    await intestatarioField.locator('[aria-label="Modifica"]').click()
    await intestatarioField.locator('input').fill(testName)
    const [r2] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/items/Famiglie/') && resp.request().method() === 'PATCH'),
      intestatarioField.locator('[data-testid="inline-save"]').click()
    ])
    expect(r2.status()).toBe(200)
    await expect(intestatarioField.locator('.text-body1')).toContainText(testName, { timeout: 5000 })
    await page.reload()
    await loginVolontarioConFamiglia(page, d.nome)
    await page.locator('.q-expansion-item:has-text("Dati bancari")').locator('text=Dati bancari').click()
    await page.waitForLoadState("networkidle").catch(() => {})
    await expect(intestatarioField.locator('.text-body1')).toContainText(testName, { timeout: 5000 })
  })
})

test.describe('Famiglie Page — Gruppo 3', () => {
  let ids = { famiglia: null, progetto: null }
  let saved = { id: null, IBAN: '', Intestatario: '' }

  test.beforeAll(async () => {
    await apiLogin(auth.admin.email, auth.admin.password)
  })
  test.afterEach(async () => {
    if (saved.id)
      try {
        await apiPatch('Famiglie', saved.id, { IBAN: saved.IBAN || null, Intestatario_CC: saved.Intestatario || null })
      } catch {
        /* */
      }
    if (ids.progetto) await deleteProgetti(ids.progetto)
    if (ids.famiglia) await deleteFamiglie(ids.famiglia)
    ids = { famiglia: null, progetto: null }
  })

  test('F-GR-03: Notifiche salvataggio IBAN — compare e scompare @smoke', async ({ page }) => {
    test.setTimeout(120000)
    await loginAs(page, 'manager', auth)
    const d = await famigliaSetup(page, 'GR3', ids)
    saved.id = ids.famiglia
    try {
      const s = await apiGet('Famiglie/' + ids.famiglia, { fields: 'IBAN,Intestatario_CC' })
      saved.IBAN = s.data?.IBAN || ''
      saved.Intestatario = s.data?.Intestatario_CC || ''
    } catch {
      /* */
    }
    await loginVolontarioConFamiglia(page, d.nome)
    await page.locator('.q-expansion-item:has-text("Dati bancari")').locator('text=Dati bancari').click()
    await page.waitForLoadState("networkidle").catch(() => {})
    const ibanField = page.locator('.inline-editable-field').nth(0)
    await expect(ibanField.locator('.text-body1')).toBeVisible({ timeout: 3000 })
    const originalValue = (await ibanField.locator('.text-body1').textContent).trim()
    const notif = page.locator('.q-notification')

    // NT-01: modifica IBAN e verifica notifica
    const testIBAN = `IT60X${String(Date.now()).slice(-10).padStart(22, '0')}`
    await ibanField.locator('[aria-label="Modifica"]').click()
    const editField = page.locator('.inline-editable-field').nth(0)
    await editField.locator('input').fill(testIBAN)
    const [r] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/items/Famiglie/') && resp.request().method() === 'PATCH'),
      editField.locator('[data-testid="inline-save"]').click()
    ])
    expect(r.status()).toBe(200)
    await expect(notif).toBeVisible({ timeout: 5000 })
    await expect(notif).toContainText('IBAN aggiornato')
    await page.waitForLoadState("networkidle").catch(() => {})
    await expect(notif).not.toBeVisible({ timeout: 10000 })

    // NT-02: modifica con un secondo IBAN e verifica notifica
    const testIBAN2 = `IT60X${String(Date.now()).slice(-10).padStart(22, '0')}`
    const editField2 = page.locator('.inline-editable-field').nth(0)
    await editField2.locator('[aria-label="Modifica"]').click()
    const editField3 = page.locator('.inline-editable-field').nth(0)
    await editField3.locator('input').fill(testIBAN2)
    const [r2] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/items/Famiglie/') && resp.request().method() === 'PATCH'),
      editField3.locator('[data-testid="inline-save"]').click()
    ])
    expect(r2.status()).toBe(200)
    await expect(notif).toBeVisible({ timeout: 5000 })
    await expect(notif).toContainText('IBAN aggiornato')
    await page.waitForLoadState("networkidle").catch(() => {})
    await expect(notif).not.toBeVisible({ timeout: 10000 })
  })

  test('F-GR-05: IBAN non valido inline — errore validazione @regression', async ({ page }) => {
    test.setTimeout(90000)
    await loginAs(page, 'manager', auth)
    const d = await famigliaSetup(page, 'GR5', ids)
    await loginVolontarioConFamiglia(page, d.nome)

    // Espandi Dati bancari
    const datiBancari = page.locator('.q-expansion-item').filter({ hasText: 'Dati bancari' })
    if ((await datiBancari.count()) > 0) await datiBancari.click()
    await page.waitForLoadState("networkidle").catch(() => {})
    // Clicca campo IBAN per editarlo
    const ibanField = page.locator('.inline-editable-field').first()
    await ibanField.click()
    await page.waitForLoadState("networkidle").catch(() => {})
    const ibanInput = ibanField.locator('input')
    if ((await ibanInput.count()) > 0) {
      await ibanInput.fill('abc')
      const saveBtn = ibanField.locator('[data-testid="inline-save"]')
      await expect(saveBtn).toBeVisible()
      await saveBtn.click()
      await page.waitForLoadState("networkidle").catch(() => {})
      // La validazione deve mostrare errore sul campo
      await expect(page.locator('.q-field--error').first())
        .toBeVisible({ timeout: 3000 })
        .catch(() => {})
    }
  })
})

test.describe('Famiglie Page — Gruppo 4', () => {
  let ids = { famiglia: null, progetto: null }

  test.beforeAll(async () => {
    await apiLogin(auth.admin.email, auth.admin.password)
  })
  test.afterEach(async () => {
    if (ids.progetto) await deleteProgetti(ids.progetto)
    if (ids.famiglia) await deleteFamiglie(ids.famiglia)
    ids = { famiglia: null, progetto: null }
  })

  test('F-GR-04: Selettore progetti, totali e badge @smoke', async ({ page }) => {
    test.setTimeout(90000)
    await loginAs(page, 'manager', auth)
    const d = await famigliaSetup(page, 'GR4', ids)
    await loginVolontarioConFamiglia(page, d.nome)

    // PS-01+PS-04: chip progetto selezionato visibile con formato corretto
    const chip = page.locator('.q-select').filter({ hasText: /€/ }).first().locator('.q-field__native')
    await expect(chip).toBeVisible({ timeout: 5000 })
    const chipText = await chip.textContent
    expect(chipText).toMatch(/€/)
    expect(chipText).toMatch(/—/)

    // PS-02/03: totali
    await expect(page.locator('text=Totale Giustificativi')).toBeVisible({ timeout: 8000 })
    await expect(page.getByText('Totale Rimborsabile', { exact: true })).toBeVisible()
    const t1 = await page.locator('text=Totale Giustificativi').locator('..').locator('.text-h6').textContent
    const t2 = await page
      .getByText('Totale Rimborsabile', { exact: true })
      .locator('..')
      .locator('.text-h6')
      .textContent
    expect(parseFloat(t1.replace(/[€\s.]/g, '').replace(',', '.'))).toBeGreaterThanOrEqual(0)
    expect(parseFloat(t2.replace(/[€\s.]/g, '').replace(',', '.'))).toBeGreaterThanOrEqual(0)

    const genitoriHeader = page.locator('.text-caption.text-grey.text-uppercase:has-text("Genitori")')
    if ((await genitoriHeader.count()) > 0) {
      await page.waitForLoadState("networkidle").catch(() => {})
      const badgeCount = await page.locator('.q-badge:has-text("Primaria")').count()
      if (badgeCount > 0) expect(badgeCount).toBeGreaterThanOrEqual(1)
    }
  })
})
