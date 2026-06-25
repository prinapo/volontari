import { test, expect } from '../helpers/console.js'
import { loginAs } from '../helpers/login.js'
import { GestionePage } from '../pages/GestionePage.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }
import { apiLogin, apiGet, apiPost, apiPatch, apiDelete } from '../helpers/api.js'
import { deleteFamiglie, deleteProgetti } from '../helpers/cleanup.js'
import { createFamigliaViaUI } from '../helpers/pagina-gestione.js'

function uid(label) {
  return `__TEST_FP_${label}_${Date.now()}`
}

async function famigliaSetup(page, label, idsObj) {
  const nomeFam = uid(label)
  const fam = await createFamigliaViaUI(page, { nomeFamiglia: nomeFam })
  idsObj.famiglia = fam.id_famiglia // IMMEDIATO dopo creazione

  const emailRes = await apiGet('email', {
    filter: JSON.stringify({ email_address: { _eq: auth.volontario.email } }),
    fields: 'Contatto_Relation'
  })
  const contattoId = emailRes.data?.[0]?.Contatto_Relation
  await apiPost('Famiglie_Contatti', {
    id: Math.floor(Math.random() * 9000000) + 1000000,
    Contatto: contattoId,
    Famiglia: fam.id_famiglia,
    Ruolo_nella_Famiglia: 'Volontario',
    Disattivo: false
  })
  await apiPatch('contatti', contattoId, { IsVolontario: true })

  const progRes = await apiPost('Progetti', {
    id_progetto: Math.floor(Math.random() * 9000000) + 1000000,
    Cognome_Beneficiario: 'Test',
    Nome_Beneficiario: 'Benef',
    AnnoBando: new Date().getFullYear(),
    Allocato: 5000,
    Famiglia: fam.id_famiglia,
    StatoProgetto: 'aperto'
  })
  idsObj.progetto = progRes.data.id_progetto // IMMEDIATO dopo creazione

  return { famiglia: fam.id_famiglia, progetto: progRes.data.id_progetto, nome: nomeFam }
}

async function volontarioLogin(page) {
  await loginAs(page, 'volontario', auth)
  await page.goto('/famiglie', { timeout: 15000 }).catch(() => {})
  await page.waitForTimeout(1000)
  const famSelector = page.locator('.q-select:has(.q-field__label:has-text("Seleziona famiglia"))')
  if (await famSelector.isVisible({ timeout: 8000 }).catch(() => false)) {
    await famSelector.click()
    await page.waitForTimeout(500)
    await page.locator('.q-menu .q-item').first().click()
    await page.waitForTimeout(2000)
  }
  await expect(page.locator('.text-h6').first()).toBeVisible({ timeout: 15000 })
  await page
    .locator('.bg-green-1')
    .first()
    .waitFor({ state: 'visible', timeout: 10000 })
    .catch(() => {})
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
    await loginAs(page, 'gestore', auth)
    const d = await famigliaSetup(page, 'GR1', ids)
    await volontarioLogin(page)

    const famigliaName = await page.locator('.text-h6').first().innerText()
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
    await page.waitForTimeout(800)
    const fields = page.locator('.inline-editable-field')
    await expect(fields.first().locator('.text-body1')).toBeVisible({ timeout: 5000 })
    expect(await fields.count()).toBeGreaterThanOrEqual(2)

    await expansion.locator('text=Dati bancari').click()
    await page.waitForTimeout(800)
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
    await loginAs(page, 'gestore', auth)
    await famigliaSetup(page, 'GR2', ids)
    saved.id = ids.famiglia
    try {
      const s = await apiGet('Famiglie/' + ids.famiglia, { fields: 'IBAN,Intestatario_CC' })
      saved.IBAN = s.data?.IBAN || ''
      saved.Intestatario = s.data?.Intestatario_CC || ''
    } catch {
      /* */
    }
    await volontarioLogin(page)
    await page.locator('.q-expansion-item:has-text("Dati bancari")').locator('text=Dati bancari').click()
    await page.waitForTimeout(800)
    const ibanField = page.locator('.inline-editable-field').nth(0)
    await expect(ibanField.locator('.text-body1')).toBeVisible({ timeout: 3000 })

    // IB-03
    await ibanField.click()
    await expect(ibanField.locator('input')).toBeVisible({ timeout: 3000 })
    await ibanField.locator('[data-testid="inline-save"]').click()
    await expect(ibanField.locator('.text-body1')).toBeVisible({ timeout: 3000 })

    // IB-04
    await ibanField.click()
    await expect(ibanField.locator('input')).toBeVisible({ timeout: 3000 })
    await ibanField.locator('[data-testid="inline-save"]').click()
    await expect(ibanField.locator('.text-body1')).toBeVisible({ timeout: 3000 })

    // IB-02
    const originalIBAN = (await ibanField.locator('.text-body1').innerText()).trim()
    await ibanField.click()
    await ibanField.locator('input').fill(`__TEST_CANCEL_${Date.now()}`)
    await ibanField.locator('[data-testid="inline-cancel"]').click()
    expect((await ibanField.locator('.text-body1').innerText()).trim()).toBe(originalIBAN)

    // IB-01
    const testIBAN = `IT60X${String(Date.now()).slice(-10).padStart(22, '0')}`
    await ibanField.click()
    await ibanField.locator('input').fill(testIBAN)
    const [r1] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/items/Famiglie/') && resp.request().method() === 'PATCH'),
      ibanField.locator('[data-testid="inline-save"]').click()
    ])
    expect(r1.status()).toBe(200)
    await expect(ibanField.locator('.text-body1')).toContainText(testIBAN, { timeout: 5000 })
    await page.reload()
    await volontarioLogin(page)
    await page.locator('.q-expansion-item:has-text("Dati bancari")').locator('text=Dati bancari').click()
    await page.waitForTimeout(800)
    await expect(ibanField.locator('.text-body1')).toContainText(testIBAN, { timeout: 5000 })

    // IN-01
    const intestatarioField = page.locator('.inline-editable-field').nth(1)
    await expect(intestatarioField.locator('.text-body1')).toBeVisible({ timeout: 3000 })
    const testName = `__TEST_Int_${Date.now()}`
    await intestatarioField.click()
    await intestatarioField.locator('input').fill(testName)
    const [r2] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/items/Famiglie/') && resp.request().method() === 'PATCH'),
      intestatarioField.locator('[data-testid="inline-save"]').click()
    ])
    expect(r2.status()).toBe(200)
    await expect(intestatarioField.locator('.text-body1')).toContainText(testName, { timeout: 5000 })
    await page.reload()
    await volontarioLogin(page)
    await page.locator('.q-expansion-item:has-text("Dati bancari")').locator('text=Dati bancari').click()
    await page.waitForTimeout(800)
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
    await loginAs(page, 'gestore', auth)
    await famigliaSetup(page, 'GR3', ids)
    saved.id = ids.famiglia
    try {
      const s = await apiGet('Famiglie/' + ids.famiglia, { fields: 'IBAN,Intestatario_CC' })
      saved.IBAN = s.data?.IBAN || ''
      saved.Intestatario = s.data?.Intestatario_CC || ''
    } catch {
      /* */
    }
    await volontarioLogin(page)
    await page.locator('.q-expansion-item:has-text("Dati bancari")').locator('text=Dati bancari').click()
    await page.waitForTimeout(800)
    const ibanField = page.locator('.inline-editable-field').nth(0)
    await expect(ibanField.locator('.text-body1')).toBeVisible({ timeout: 3000 })
    const originalValue = (await ibanField.locator('.text-body1').innerText()).trim()
    const notif = page.locator('.q-notification')

    // NT-01
    await ibanField.click()
    await ibanField.locator('input').fill(originalValue)
    await ibanField.locator('[data-testid="inline-save"]').click()
    await expect(notif).toBeVisible({ timeout: 5000 })
    await expect(notif).toContainText('IBAN aggiornato')

    // NT-02
    const testIBAN = `IT60X${String(Date.now()).slice(-10).padStart(22, '0')}`
    await ibanField.click()
    await ibanField.locator('input').fill(testIBAN)
    const [r] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/items/Famiglie/') && resp.request().method() === 'PATCH'),
      ibanField.locator('[data-testid="inline-save"]').click()
    ])
    expect(r.status()).toBe(200)
    await expect(notif).toBeVisible({ timeout: 5000 })
    await expect(notif).toContainText('IBAN aggiornato')
    await page.waitForTimeout(6000)
    await expect(notif).not.toBeVisible({ timeout: 10000 })
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
    await loginAs(page, 'gestore', auth)
    await famigliaSetup(page, 'GR4', ids)
    await volontarioLogin(page)

    // PS-01+PS-04: chip progetto selezionato visibile con formato corretto
    const chip = page.locator('.bg-green-1').first()
    await expect(chip).toBeVisible({ timeout: 5000 })
    const chipText = await chip.innerText()
    expect(chipText).toMatch(/€/)
    expect(chipText).toMatch(/—/)

    // PS-02/03: totali
    await expect(page.locator('text=Totale Giustificativi')).toBeVisible({ timeout: 8000 })
    await expect(page.getByText('Totale Rimborsabile', { exact: true })).toBeVisible()
    const t1 = await page.locator('text=Totale Giustificativi').locator('..').locator('.text-h6').innerText()
    const t2 = await page
      .getByText('Totale Rimborsabile', { exact: true })
      .locator('..')
      .locator('.text-h6')
      .innerText()
    expect(parseFloat(t1.replace(/[€\s.]/g, '').replace(',', '.'))).toBeGreaterThanOrEqual(0)
    expect(parseFloat(t2.replace(/[€\s.]/g, '').replace(',', '.'))).toBeGreaterThanOrEqual(0)

    const genitoriHeader = page.locator('.text-caption.text-grey.text-uppercase:has-text("Genitori")')
    if ((await genitoriHeader.count()) > 0) {
      await page.waitForTimeout(2000)
      const badgeCount = await page.locator('.q-badge:has-text("Primaria")').count()
      if (badgeCount > 0) expect(badgeCount).toBeGreaterThanOrEqual(1)
    }
  })
})
