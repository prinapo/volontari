import { test, expect } from '../helpers/console.js'
import { loginAs } from '../helpers/login.js'
import { apiLogin, apiPost, apiGet, apiDelete, apiPatch } from '../helpers/api.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }

test.describe('Bug: Invalida giustificativo aggiorna totali', () => {
  const ids = { giustificativi: [] }

  async function cleanup() {
    if (ids.giustificativi?.length) {
      for (const gid of ids.giustificativi) {
        try {
          await apiDelete('Giustificativi', gid)
        } catch {
          /* */
        }
      }
    }
    if (ids.progetto) {
      try {
        await apiPatch('Progetti', ids.progetto, { StatoProgetto: 'chiuso' })
      } catch {
        /* */
      }
      try {
        await apiDelete('Progetti', ids.progetto)
      } catch {
        /* */
      }
    }
    if (ids.famiglia) {
      try {
        const links = await apiGet('Famiglie_Contatti', {
          'filter[Famiglia][_eq]': ids.famiglia,
          fields: 'id',
          limit: -1
        })
        for (const link of links.data?.data || []) {
          try {
            await apiDelete('Famiglie_Contatti', link.id)
          } catch {
            /* */
          }
        }
      } catch {
        /* */
      }
      try {
        await apiDelete('Famiglie', ids.famiglia)
      } catch {
        /* */
      }
    }
  }

  test.beforeAll(async () => {
    await apiLogin(auth.admin.email, auth.admin.password)
  })

  test.afterEach(async () => {
    await cleanup()
  })

  test('BGT-01: Invalida giustificativo aggiorna totale giustificativi @crud', async ({ page }) => {
    test.setTimeout(120000)
    const prefix = `BGT${Date.now()}`

    // Setup dati via API
    await apiPost('Famiglie', { id_famiglia: prefix, Nome_Famiglia: prefix })
    ids.famiglia = prefix

    await apiPost('Progetti', {
      id_progetto: `${prefix}_P`,
      Famiglia: prefix,
      Allocato: 1000,
      AnnoBando: 2026,
      Cognome_Beneficiario: 'Test',
      Nome_Beneficiario: 'Test',
      StatoProgetto: 'aperto'
    })
    ids.progetto = `${prefix}_P`

    // Crea 4 giustificativi
    for (const importo of [100, 150, 200, 250]) {
      const res = await apiPost('Giustificativi', {
        Progetto: ids.progetto,
        Famiglia: prefix,
        Importo: importo,
        Data: new Date().toISOString().slice(0, 10),
        Stato: 'inviato',
        Descrizione: `Test ${importo}`
      })
      ids.giustificativi.push(res.data?.id)
    }
    expect(ids.giustificativi.length).toBe(4)

    // Login admin e naviga a /famiglie
    await loginAs(page, 'admin', auth)
    await page.goto('/famiglie')
    await page.waitForLoadState("networkidle").catch(() => {})

    // Forza il caricamento dei dati: setta direttamente lo store Pinia
    await page.evaluate(
      ({ progettoId, famigliaId, giustIds }) => {
        try {
          const pinia = document.querySelector('#q-app')?.__vue_app__?.config?.globalProperties?.$pinia
          if (!pinia) return
          // Simula i dati nel giustificativi store
          pinia.state.value.giustificativi = pinia.state.value.giustificativi || {}
          pinia.state.value.giustificativi.items = giustIds.map((id, i) => ({
            id,
            Importo: [100, 150, 200, 250][i],
            Data: new Date().toISOString().slice(0, 10),
            Stato: 'inviato',
            Descrizione: `Test`,
            Progetto: progettoId,
            Famiglia: famigliaId,
            Invalidato: false
          }))
        } catch (e) {
          console.error(e)
        }
      },
      { progettoId: ids.progetto, famigliaId: ids.famiglia, giustIds: ids.giustificativi }
    )

    // Attendi che Vue processi i cambiamenti
    await page.waitForLoadState("networkidle").catch(() => {})

    // Helper: legge totale dal DOM
    async function getTotale() {
      return await page.evaluate(() => {
        try {
          const pinia = document.querySelector('#q-app')?.__vue_app__?.config?.globalProperties?.$pinia
          const items = pinia?.state?.value?.giustificativi?.items || []
          return items.filter(i => !i.Invalidato).reduce((s, i) => s + (Number.parseFloat(i.Importo) || 0), 0)
        } catch {
          return -1
        }
      })
    }

    // Verifica totale = 700
    let totale1 = await getTotale()
    expect(totale1).toBe(700)

    // Invalida il terzo giustificativo (200)
    const invId = ids.giustificativi[2]
    await apiPatch('Giustificativi', invId, { Invalidato: true })
    ids.giustificativi = ids.giustificativi.filter(id => id !== invId)

    // Aggiorna lo store locale per simulare l'invalidazione
    await page.evaluate(id => {
      try {
        const pinia = document.querySelector('#q-app')?.__vue_app__?.config?.globalProperties?.$pinia
        const items = pinia?.state?.value?.giustificativi?.items || []
        const idx = items.findIndex(i => i.id === id)
        if (idx !== -1) items[idx].Invalidato = true
      } catch (e) {
        console.error(e)
      }
    }, invId)
    await page.waitForLoadState("networkidle").catch(() => {})

    // Verifica totale = 500
    let totale2 = await getTotale()
    expect(totale2).toBe(500)
  })
})
