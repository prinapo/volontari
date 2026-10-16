/**
 * Test di SISTEMA (@system, desktop-only).
 *
 * Cast: 1 volontario + 1 manager (+ admin), 7 famiglie (5 per S1–S5, 2 extra per
 * S6–S7). Le azioni passano dalla UI (per esercitare use case e macchine a stati);
 * l'assert finale legge lo stato PERSISTITO via API.
 *
 * Complementare ai test unitari (una funzione) e agli E2E singoli (un pezzo di UI):
 * qui si verifica che, dopo sequenze realistiche (incluse bozze dimenticate,
 * rifiuti, fallimenti e riaperture), il sistema finisca nello stato previsto.
 */
import auth from '../fixtures/auth-test.json' with { type: 'json' }
import { apiLogin, apiPost, apiDelete } from '../helpers/api.js'
import { test, expect } from '../helpers/console.js'
import { pulisciIds } from '../helpers/setup-atomico.js'
import {
  setupFamiglie,
  volontarioCreaBozza,
  volontarioInviaBozza,
  volontarioInvalidaBozza,
  managerVerifica,
  managerRifiuta,
  managerRipristinaInviato,
  managerRicalcola,
  managerCreaBatch,
  managerSegnaPagato,
  managerSegnaFallito,
  managerRipristinaBonifici,
  managerChiudiProgetto,
  managerRiapriProgetto,
  readPagamentiProgetto,
  assertProgetto,
  assertPagamentoStato,
  assertGiustificativoByDesc,
  assertAggregatiCoerenti
} from '../helpers/system-scenario.js'

const ids = { famiglia: [], progetto: [], giustificativi: [], pagamenti: [], batch: [], inviiNoLogin: [] }
let cast = []
let associazioneNome = null
let associazioneId = null

test.describe('System scenario', () => {
  test.describe.configure({ timeout: 900_000 })

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(600_000)
    await apiLogin(auth.admin.email, auth.admin.password)
    const page = await browser.newPage()
    try {
      cast = await setupFamiglie(page, { auth, n: 7, allocato: 1000, ids })
      associazioneNome = `TEST_SYS_ASSOC_${Date.now()}`
      const assoc = await apiPost('Associazioni', { Nome: associazioneNome, Budget: 100_000 })
      associazioneId = assoc.data.id
    } finally {
      await page.close()
    }
  })

  test.afterAll(async () => {
    test.setTimeout(300_000)
    await pulisciIds(ids)
    if (associazioneId) await apiDelete('Associazioni', associazioneId).catch(() => {})
  })

  test('SYS-01: golden path + cap → chiuso automatico @system', async ({ page }) => {
    const { nomeFam, progettoId } = cast[0]
    const desc = `${ids.prefix}_S1`

    const g = await volontarioCreaBozza(page, { auth, nomeFam, descrizione: desc, importo: 1250 })
    ids.giustificativi.push(g.id)
    await volontarioInviaBozza(page, g.id)
    await managerVerifica(page, { auth, nomeFam })
    await assertGiustificativoByDesc(progettoId, desc, { Stato: 'verificato' })

    await managerRicalcola(page, { auth })
    await managerCreaBatch(page, { auth, nomeFam, associazione: associazioneNome, progettoId })
    await managerSegnaPagato(page, { auth, nomeFam })

    await assertProgetto(progettoId, {
      StatoProgetto: 'chiuso',
      TipoChiusura: 'cap_raggiunto',
      TotalePagato: 1000,
      ResiduoAllocato: 0
    })
    await assertGiustificativoByDesc(progettoId, desc, { Stato: 'pagato' })
  })

  test('SYS-02: bozza dimenticata → progetto in_rendicontazione (poi inviata) @system', async ({ page }) => {
    const { nomeFam, progettoId } = cast[1]
    const desc = `${ids.prefix}_S2`

    const g = await volontarioCreaBozza(page, { auth, nomeFam, descrizione: desc, importo: 500 })
    ids.giustificativi.push(g.id)

    await assertProgetto(progettoId, {
      StatoProgetto: 'in_rendicontazione',
      StatoRendicontazione: 'bozza',
      TotalePagato: 0
    })
    await assertGiustificativoByDesc(progettoId, desc, { Stato: 'draft' })

    await volontarioInviaBozza(page, g.id)
    await assertGiustificativoByDesc(progettoId, desc, { Stato: 'inviato' })
  })

  test('SYS-03: rifiuto → progetto accettato → ripristino → verifica @system', async ({ page }) => {
    const { nomeFam, progettoId } = cast[2]
    const desc = `${ids.prefix}_S3`

    const g = await volontarioCreaBozza(page, { auth, nomeFam, descrizione: desc, importo: 300 })
    ids.giustificativi.push(g.id)
    await volontarioInviaBozza(page, g.id)

    await managerRifiuta(page, { auth, nomeFam, nota: 'SYS rifiuto' })
    await assertGiustificativoByDesc(progettoId, desc, { Stato: 'rifiutato' })
    await assertProgetto(progettoId, { StatoProgetto: 'accettato' })

    await managerRipristinaInviato(page, { auth, nomeFam })
    await assertGiustificativoByDesc(progettoId, desc, { Stato: 'inviato' })

    await managerVerifica(page, { auth, nomeFam })
    await assertGiustificativoByDesc(progettoId, desc, { Stato: 'verificato' })
  })

  test('SYS-04: bozza invalidata → progetto torna accettato @system', async ({ page }) => {
    const { nomeFam, progettoId } = cast[3]
    const desc = `${ids.prefix}_S4`

    const g = await volontarioCreaBozza(page, { auth, nomeFam, descrizione: desc, importo: 200 })
    ids.giustificativi.push(g.id)
    await assertProgetto(progettoId, { StatoProgetto: 'in_rendicontazione' })

    await volontarioInvalidaBozza(page, g.id)
    await assertProgetto(progettoId, { StatoProgetto: 'accettato', StatoRendicontazione: 'nessuno' })
    await assertGiustificativoByDesc(progettoId, desc, { Invalidato: true })
  })

  test('SYS-05: tranche parziale → rimborso_parziale → nuova proposta @system', async ({ page }) => {
    const { nomeFam, progettoId } = cast[4]
    const descA = `${ids.prefix}_S5a`
    const descB = `${ids.prefix}_S5b`

    const g1 = await volontarioCreaBozza(page, { auth, nomeFam, descrizione: descA, importo: 500 })
    ids.giustificativi.push(g1.id)
    await volontarioInviaBozza(page, g1.id)
    await managerVerifica(page, { auth, nomeFam })
    await managerRicalcola(page, { auth })
    await managerCreaBatch(page, { auth, nomeFam, associazione: associazioneNome, progettoId })
    await managerSegnaPagato(page, { auth, nomeFam })

    await assertProgetto(progettoId, { StatoProgetto: 'rimborso_parziale', TotalePagato: 400 })

    const g2 = await volontarioCreaBozza(page, { auth, nomeFam, descrizione: descB, importo: 300 })
    ids.giustificativi.push(g2.id)
    await volontarioInviaBozza(page, g2.id)
    await managerVerifica(page, { auth, nomeFam })
    await managerRicalcola(page, { auth })

    const pagamenti = await readPagamentiProgetto(progettoId)
    const proposto = pagamenti.find(p => p.Stato === 'proposto')
    expect(proposto, 'nuova proposta dopo il secondo verificato').toBeTruthy()
    await assertProgetto(progettoId, { StatoProgetto: 'rimborso_parziale' })
  })

  test('SYS-06: pagamento fallito → Ripristina a Bonifici → nuova tranche → pagato @system', async ({ page }) => {
    const { nomeFam, progettoId } = cast[5]
    const desc = `${ids.prefix}_S6`

    const g = await volontarioCreaBozza(page, { auth, nomeFam, descrizione: desc, importo: 1250 })
    ids.giustificativi.push(g.id)
    await volontarioInviaBozza(page, g.id)
    await managerVerifica(page, { auth, nomeFam })
    await managerRicalcola(page, { auth })
    await managerCreaBatch(page, { auth, nomeFam, associazione: associazioneNome, progettoId })
    await managerSegnaFallito(page, { auth, nomeFam, nota: 'IBAN errato SYS' })

    await assertPagamentoStato(progettoId, 'fallito')
    await assertProgetto(progettoId, { StatoProgetto: 'in_rendicontazione', TotalePagato: 0 })
    await assertGiustificativoByDesc(progettoId, desc, { Stato: 'verificato' })

    await managerRipristinaBonifici(page, { auth, nomeFam })
    await assertPagamentoStato(progettoId, 'proposto')

    await managerCreaBatch(page, { auth, nomeFam, associazione: associazioneNome, progettoId })
    await managerSegnaPagato(page, { auth, nomeFam })
    await assertProgetto(progettoId, { StatoProgetto: 'chiuso', TipoChiusura: 'cap_raggiunto' })
    await assertGiustificativoByDesc(progettoId, desc, { Stato: 'pagato' })
  })

  test('SYS-07: chiusura con proposta pendente → annullo → riapertura con conferma @system', async ({ page }) => {
    const { nomeFam, progettoId } = cast[6]
    const desc = `${ids.prefix}_S7`

    const g = await volontarioCreaBozza(page, { auth, nomeFam, descrizione: desc, importo: 600 })
    ids.giustificativi.push(g.id)
    await volontarioInviaBozza(page, g.id)
    await managerVerifica(page, { auth, nomeFam })
    await managerRicalcola(page, { auth })
    await assertPagamentoStato(progettoId, 'proposto')

    await managerChiudiProgetto(page, { auth, nomeFam, tipo: 'Rinuncia', motivo: 'SYS chiusura' })
    await assertProgetto(progettoId, { StatoProgetto: 'chiuso', TipoChiusura: 'rinuncia' })
    await assertPagamentoStato(progettoId, 'annullato')

    await managerRiapriProgetto(page, { auth, nomeFam, conferma: true })
    await assertProgetto(progettoId, {
      StatoProgetto: 'in_rendicontazione',
      TipoChiusura: null,
      DataChiusura: null
    })
  })

  test('SYS-09: isolamento — aggregati coerenti per ogni progetto @system', async ({ page: _page }) => {
    for (const f of cast) {
      await assertAggregatiCoerenti(f.progettoId)
    }
  })
})
