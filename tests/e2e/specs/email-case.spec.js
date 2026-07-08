import { test, expect } from '../helpers/console.js'
import { RiconciliazionePage } from '../pages/RiconciliazionePage.js'
import { loginAs } from '../helpers/login.js'
import { createTestSubmission } from '../helpers/submission.js'
import { apiLogin, apiDelete } from '../helpers/api.js'
import { deleteFamiglie, deleteContatti, deleteProgetti } from '../helpers/cleanup.js'
import { createProgettoViaUI } from '../pages/CreaProgettoPage.js'
import { createContattoViaUI, createFamigliaViaUI, assegnaContattoAFamigliaViaUI } from '../helpers/pagina-gestione.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }

let _ecIds = { contatti: [], famiglie: [], progetti: [], invii: [] }

test.beforeAll(async () => {
  await apiLogin(auth.admin.email, auth.admin.password)
})

test.afterEach(async () => {
  for (const id of _ecIds.invii) {
    try {
      await apiDelete('InviiGiustificativiNoLogin', id)
    } catch {
      /* */
    }
  }
  for (const id of _ecIds.progetti) {
    try {
      await deleteProgetti(id)
    } catch {
      /* */
    }
  }
  for (const id of _ecIds.famiglie) {
    try {
      await deleteFamiglie(id)
    } catch {
      /* */
    }
  }
  for (const id of _ecIds.contatti) {
    try {
      await deleteContatti(id)
    } catch {
      /* */
    }
  }
  _ecIds = { contatti: [], famiglie: [], progetti: [], invii: [] }
})

async function creaContattoGenitore(page, email, nome = 'TEST_EmailCon', cognome = 'TEST_Genitore') {
  await loginAs(page, 'gestore', auth)

  const contatto = await createContattoViaUI(page, { nome, cognome, email: email.toLowerCase() })
  _ecIds.contatti.push(contatto.id_contatto)

  const ts = Date.now()
  const prefix = `TEST_EC_${ts}_${Math.floor(Math.random() * 1000)}`
  const fam = await createFamigliaViaUI(page, { nomeFamiglia: prefix })
  _ecIds.famiglie.push(fam.id_famiglia)

  await assegnaContattoAFamigliaViaUI(page, {
    famigliaNome: prefix,
    searchTerm: email.toLowerCase(),
    fullName: contatto.displayName,
    ruolo: 'Genitore'
  })

  const progettoId = await createProgettoViaUI(
    page,
    {
      famigliaNome: prefix,
      Cognome_Beneficiario: prefix,
      Nome_Beneficiario: prefix,
      AnnoBando: new Date().getFullYear(),
      Allocato: 5000,
      Data_Inizio_Progetto: '2026-01-01',
      Data_Fine_Progetto: '2026-12-31'
    },
    auth
  )
  _ecIds.progetti.push(progettoId)
  return { contattoId: contatto.id_contatto, famigliaId: fam.id_famiglia }
}

test.describe('Email Case-Insensitive Matching', () => {
  test('EC-01: Submission con email uppercase matcha contatto lowercase @regression', async ({ page }) => {
    test.setTimeout(120000)
    const baseEmail = `TEST_EC01_${Date.now()}@test.com`
    await creaContattoGenitore(page, baseEmail)
    const testEmail = baseEmail.toUpperCase()
    const testDesc = `TEST_EC01_upper_${Date.now()}`

    const subData = await createTestSubmission(page, {
      email: testEmail,
      descrizione: testDesc
    })
    if (subData?.id) _ecIds.invii.push(subData.id)

    await loginAs(page, 'gestore_verifica', auth)

    const riconcPage = new RiconciliazionePage(page)
    await riconcPage.goto()
    await riconcPage.waitForTable()

    const rows = riconcPage.rowLocator
    const count = await rows.count()
    let found = false
    for (let i = 0; i < count; i++) {
      const rowText = await rows.nth(i).innerText()
      if (rowText.toLowerCase().includes(testEmail.toLowerCase())) {
        await riconcPage.expandRow(i)
        const badges = rows.nth(i).locator('.q-badge')
        const badgeCount = await badges.count()
        for (let j = 0; j < badgeCount; j++) {
          const text = await badges.nth(j).innerText()
          if (text.includes('Contatto verificato') || text.includes('Non è genitore')) {
            found = true
            break
          }
        }
        if (found) break
      }
    }

    expect(found).toBe(true)
  })

  test('EC-02: Submission con email lowercase matcha contatto uppercase @regression', async ({ page }) => {
    test.setTimeout(120000)
    const baseEmail = `TEST_EC02_${Date.now()}@test.com`
    await creaContattoGenitore(page, baseEmail.toUpperCase())
    const testEmail = baseEmail.toLowerCase()
    const testDesc = `TEST_EC02_lower_${Date.now()}`

    const subData = await createTestSubmission(page, {
      email: testEmail,
      descrizione: testDesc
    })
    if (subData?.id) _ecIds.invii.push(subData.id)

    await loginAs(page, 'gestore_verifica', auth)

    const riconcPage = new RiconciliazionePage(page)
    await riconcPage.goto()
    await riconcPage.waitForTable()

    const rows = riconcPage.rowLocator
    const count = await rows.count()
    let found = false
    for (let i = 0; i < count; i++) {
      const rowText = await rows.nth(i).innerText()
      if (rowText.toLowerCase().includes(testEmail.toLowerCase())) {
        await riconcPage.expandRow(i)
        const badges = rows.nth(i).locator('.q-badge')
        const badgeCount = await badges.count()
        for (let j = 0; j < badgeCount; j++) {
          const text = await badges.nth(j).innerText()
          if (text.includes('Contatto verificato') || text.includes('Non è genitore')) {
            found = true
            break
          }
        }
        if (found) break
      }
    }

    expect(found).toBe(true)
  })

  test('EC-03: Submission con email mixed-case matcha contatto lowercase @regression', async ({ page }) => {
    test.setTimeout(120000)
    const baseEmail = `TEST_EC03_${Date.now()}@test.com`
    await creaContattoGenitore(page, baseEmail.toLowerCase())
    const testEmail = baseEmail.replace('TEST_EC03_', 'Test_Ec03_')
    const testDesc = `TEST_EC03_mixed_${Date.now()}`

    const subData = await createTestSubmission(page, {
      email: testEmail,
      descrizione: testDesc
    })
    if (subData?.id) _ecIds.invii.push(subData.id)

    await loginAs(page, 'gestore_verifica', auth)

    const riconcPage = new RiconciliazionePage(page)
    await riconcPage.goto()
    await riconcPage.waitForTable()

    const rows = riconcPage.rowLocator
    const count = await rows.count()
    let found = false
    for (let i = 0; i < count; i++) {
      const rowText = await rows.nth(i).innerText()
      if (rowText.toLowerCase().includes(testEmail.toLowerCase())) {
        await riconcPage.expandRow(i)
        const badges = rows.nth(i).locator('.q-badge')
        const badgeCount = await badges.count()
        for (let j = 0; j < badgeCount; j++) {
          const text = await badges.nth(j).innerText()
          if (text.includes('Contatto verificato') || text.includes('Non è genitore')) {
            found = true
            break
          }
        }
        if (found) break
      }
    }

    expect(found).toBe(true)
  })

  test('EC-04: Email sconosciuta mostra contatto da creare @regression', async ({ page }) => {
    test.setTimeout(120000)
    const unknownEmail = `test_ec04_${Date.now()}@test.com`
    const testDesc = `TEST_EC04_unknown_${Date.now()}`

    const subData = await createTestSubmission(page, {
      email: unknownEmail,
      descrizione: testDesc
    })
    if (subData?.id) _ecIds.invii.push(subData.id)

    await loginAs(page, 'gestore_verifica', auth)

    const riconcPage = new RiconciliazionePage(page)
    await riconcPage.goto()
    await riconcPage.waitForTable()

    // Per stato not_found, l'email è in un input — innerText non lo include
    // Cerchiamo per input value nella colonna email
    const rows = riconcPage.rowLocator
    const count = await rows.count()
    let found = false
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i)
      await riconcPage.expandRow(i)
      const emailInput = row.locator('td').nth(2).locator('input')
      if ((await emailInput.count()) === 0) {
        // Su mobile: cerca input dentro la card espansa
        const inputs = row.locator('input')
        const inputCount = await inputs.count()
        for (let k = 0; k < inputCount; k++) {
          const value = await inputs.nth(k).inputValue()
          if (value === unknownEmail) {
            const badges = row.locator('.q-badge')
            const badgeCount = await badges.count()
            for (let j = 0; j < badgeCount; j++) {
              const text = await badges.nth(j).innerText()
              if (text.includes('Contatto da creare')) {
                found = true
                break
              }
            }
            if (found) break
          }
        }
      } else {
        const value = await emailInput.inputValue()
        if (value === unknownEmail) {
          const badges = row.locator('.q-badge')
          const badgeCount = await badges.count()
          for (let j = 0; j < badgeCount; j++) {
            const text = await badges.nth(j).innerText()
            if (text.includes('Contatto da creare')) {
              found = true
              break
            }
          }
          if (found) break
        }
      }
    }

    expect(found).toBe(true)
  })
})
