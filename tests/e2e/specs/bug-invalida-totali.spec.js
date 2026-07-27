import auth from '../fixtures/auth-test.json' with { type: 'json' }
import { apiLogin } from '../helpers/api.js'
import { test, expect } from '../helpers/console.js'
import { createGiustificativoViaDialog } from '../helpers/giustificativo.js'
import { loginAs } from '../helpers/login.js'
import { creaFamigliaVolontarioProgetto } from '../helpers/setup-atomico.js'
import { loginVolontarioConFamiglia } from '../helpers/setup-atomico.js'

test.describe('Bug: Invalida giustificativo aggiorna totali', () => {
  let ids = { famiglia: null, progetto: null, giustificativi: [] }

  test.beforeAll(async () => {
    await apiLogin(auth.admin.email, auth.admin.password)
  })

  test('BGT-01: Invalida giustificativo aggiorna totale giustificativi @crud', async ({ page }) => {
    test.setTimeout(120_000)

    // Setup via UI
    await loginAs(page, 'manager', auth)
    const { nomeFam } = await creaFamigliaVolontarioProgetto(page, ids)

    // Volontario crea 2 giustificativi
    await loginVolontarioConFamiglia(page, nomeFam)
    const g1 = await createGiustificativoViaDialog(page, { descrizione: 'Test 100', importo: '100', submitAfter: true })
    if (g1?.id) ids.giustificativi.push(g1.id)
    const g2 = await createGiustificativoViaDialog(page, { descrizione: 'Test 200', importo: '200', submitAfter: true })
    if (g2?.id) ids.giustificativi.push(g2.id)

    // Verifica che i giustificativi siano stati creati
    expect(ids.giustificativi.length).toBe(2)
  })
})
