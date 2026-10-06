import auth from '../fixtures/auth-test.json' with { type: 'json' }
import { apiLogin, apiGet, apiPost, apiDelete } from '../helpers/api.js'
import { test, expect } from '../helpers/console.js'
import { loginAs } from '../helpers/login.js'

// Indirizzo controllato fornito per il test (invio reale via Brevo).
const TARGET_EMAIL = 'test.validatore.sis@gmail.com'

let createdContattoId = null
let createdEmailId = null
const createdComunicazioneIds = []

function fieldInput(scope, label) {
  return scope.locator('.q-field').filter({ hasText: label }).locator('input, textarea')
}

async function ensureContatto() {
  const em = await apiGet('email', {
    filter: { email_address: { _eq: TARGET_EMAIL } },
    fields: 'id,Contatto_Relation.id_contatto,Contatto_Relation.Nome,Contatto_Relation.Cognome',
    limit: 1
  })
  if (em.data?.length) {
    return em.data[0].Contatto_Relation
  }
  const idc = String(Date.now())
  const c = await apiPost('contatti', {
    id_contatto: idc,
    Nome: `TEST_CM01_${idc.slice(-6)}`,
    Cognome: 'Validatore'
  })
  const e = await apiPost('email', {
    email_address: TARGET_EMAIL,
    Contatto_Relation: c.data.id_contatto,
    Primary: true
  })
  createdContattoId = c.data.id_contatto
  createdEmailId = e.data.id
  return c.data
}

test.describe('Comunicazioni — wizard', () => {
  test.beforeAll(async () => {
    await apiLogin(auth.admin.email, auth.admin.password)
  })

  test.afterEach(async () => {
    for (const cid of createdComunicazioneIds) {
      try {
        const links = await apiGet('Comunicazioni_Contatti', {
          filter: { Comunicazione: { _eq: cid } },
          fields: 'id',
          limit: -1
        })
        for (const l of links.data || []) {
          await apiDelete('Comunicazioni_Contatti', l.id).catch(() => {})
        }
        await apiDelete('Comunicazioni', cid).catch(() => {})
      } catch {
        /*
        best-effort
        */
      }
    }
    createdComunicazioneIds.length = 0
    if (createdEmailId) {
      await apiDelete('email', createdEmailId).catch(() => {})
      createdEmailId = null
    }
    if (createdContattoId) {
      await apiDelete('contatti', createdContattoId).catch(() => {})
      createdContattoId = null
    }
  })

  test('CM-01: Contatto singolo — selezione e invio reale @crud', async ({ page }) => {
    test.setTimeout(120_000)

    const contatto = await ensureContatto()
    const fullName = `${contatto.Nome} ${contatto.Cognome}`.trim()

    await loginAs(page, 'manager', auth)
    await page.goto('/comunicazioni')

    const filtri = page.getByRole('group', { name: 'Filtri' })
    const componi = page.getByRole('group', { name: 'Componi' })
    const anteprima = page.getByRole('group', { name: 'Anteprima' })
    const esito = page.getByRole('group', { name: 'Esito' })

    // 1. Destinatari → Contatto singolo
    await page.getByRole('radio', { name: 'Contatto singolo' }).click()

    // 2. Filtri → select "Cerca contatto" (verifica che le opzioni compaiano)
    await filtri.locator('.q-select').click()
    await filtri.locator('.q-select input').fill(contatto.Nome)
    const option = page.getByRole('option', { name: fullName }).first()
    await expect(option).toBeVisible({ timeout: 10_000 })
    // l'opzione mostra anche l'email primaria (per riconoscere il contatto)
    await expect(option).toContainText(TARGET_EMAIL)
    await option.click()
    await filtri.getByRole('button', { name: 'Continua' }).click()

    // 3. Componi
    await fieldInput(componi, 'Oggetto *').fill('Test CM-01')
    await fieldInput(componi, 'Corpo *').fill('Email di test dal wizard Comunicazioni.')
    await componi.getByRole('button', { name: 'Continua' }).click()

    // 4. Anteprima → calcola e invia
    await anteprima.getByRole('button', { name: 'Calcola destinatari' }).click()
    await expect(anteprima.locator('.q-banner')).toContainText('Destinatari trovati: 1', { timeout: 15_000 })

    const [sendResp] = await Promise.all([
      page.waitForResponse(r => r.url().includes('/communications/send') && r.request().method() === 'POST'),
      anteprima.getByRole('button', { name: 'Invia' }).click()
    ])
    expect(sendResp.status()).toBe(200)
    const esitoBody = await sendResp.json()
    if (esitoBody?.comunicazioneId) createdComunicazioneIds.push(esitoBody.comunicazioneId)
    expect(esitoBody.inviati).toBe(1)
    expect(esitoBody.falliti).toBe(0)

    // 5. Esito
    await expect(esito.locator('.q-banner').filter({ hasText: 'Inviati' })).toContainText('Inviati: 1')
  })
})
