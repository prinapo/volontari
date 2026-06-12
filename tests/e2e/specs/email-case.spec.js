import { test, expect } from '../helpers/console.js'
import { RiconciliazionePage } from '../pages/RiconciliazionePage.js'
import { loginAs } from '../helpers/login.js'
import { createTestSubmission } from '../helpers/submission.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }

test.describe('Email Case-Insensitive Matching', () => {

  test('EC-01: Submission con email uppercase matcha contatto lowercase @regression', async ({ page }) => {
    const testEmail = 'TEST.GENITORE@TEST.COM'
    const testDesc = `EC-01 upper ${Date.now()}`

    await createTestSubmission(page, {
      email: testEmail,
      descrizione: testDesc
    })

    await loginAs(page, 'gestore_verifica', auth)

    const riconcPage = new RiconciliazionePage(page)
    await riconcPage.goto()
    await riconcPage.waitForTable()

    const rows = riconcPage.tableRows
    const count = await rows.count()
    let found = false
    for (let i = 0; i < count; i++) {
      const rowText = await rows.nth(i).innerText()
      if (rowText.toLowerCase().includes(testEmail.toLowerCase())) {
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
    const testEmail = 'test.genitore@test.com'
    const testDesc = `EC-02 lower ${Date.now()}`

    await createTestSubmission(page, {
      email: testEmail,
      descrizione: testDesc
    })

    await loginAs(page, 'gestore_verifica', auth)

    const riconcPage = new RiconciliazionePage(page)
    await riconcPage.goto()
    await riconcPage.waitForTable()

    const rows = riconcPage.tableRows
    const count = await rows.count()
    let found = false
    for (let i = 0; i < count; i++) {
      const rowText = await rows.nth(i).innerText()
      if (rowText.toLowerCase().includes(testEmail.toLowerCase())) {
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
    const testEmail = 'Test.Genitore@Test.Com'
    const testDesc = `EC-03 mixed ${Date.now()}`

    await createTestSubmission(page, {
      email: testEmail,
      descrizione: testDesc
    })

    await loginAs(page, 'gestore_verifica', auth)

    const riconcPage = new RiconciliazionePage(page)
    await riconcPage.goto()
    await riconcPage.waitForTable()

    const rows = riconcPage.tableRows
    const count = await rows.count()
    let found = false
    for (let i = 0; i < count; i++) {
      const rowText = await rows.nth(i).innerText()
      if (rowText.toLowerCase().includes(testEmail.toLowerCase())) {
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
    const unknownEmail = `sconosciuto.${Date.now()}@test.com`
    const testDesc = `EC-04 unknown ${Date.now()}`

    await createTestSubmission(page, {
      email: unknownEmail,
      descrizione: testDesc
    })

    await loginAs(page, 'gestore_verifica', auth)

    const riconcPage = new RiconciliazionePage(page)
    await riconcPage.goto()
    await riconcPage.waitForTable()

    // Per stato not_found, l'email è in un input — innerText non lo include
    // Cerchiamo per input value nella colonna email
    const rows = riconcPage.tableRows
    const count = await rows.count()
    let found = false
    for (let i = 0; i < count; i++) {
      const emailInput = rows.nth(i).locator('td').nth(2).locator('input')
      if (await emailInput.count() > 0) {
        const value = await emailInput.inputValue()
        if (value === unknownEmail) {
          const badges = rows.nth(i).locator('.q-badge')
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
