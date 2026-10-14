/**
 * Truth table esaustiva della derivazione dello stato progetto + invarianti.
 *
 * `calcolaStatoProgetto` è la fonte di verità dello stato atteso: qui si enumera
 * l'intero prodotto `stati × allocato × rimborsato × insiemi di giustificativi`
 * e si confronta con un oracolo indipendente che codifica il contratto.
 *
 * Nota: la derivazione può calcolare target che la MACCHINA rifiuta (es.
 * `accettato` con pagamenti → `chiuso`); la legalità è competenza della macchina
 * (vedi `tests/unit/state-machines/contract.test.js`).
 */
import { describe, expect, it } from 'vitest'
import { calcolaErogabile, residuoDaCoprire } from 'src/utils/erogabile'
import { calcolaDerivatiProgetto, calcolaStatoProgetto } from 'src/utils/statoProgetto'

const STATI = ['accettato', 'in_rendicontazione', 'rimborso_parziale', 'chiuso', 'proposto', 'validato', 'approvato']
const STATI_MANUALI = new Set(['proposto', 'validato', 'approvato'])
const STATI_AVVIO = new Set(['draft', 'inviato', 'verificato', 'in_pagamento', 'pagato'])

const GIUSTIFICATIVI = {
  vuoto: [],
  draft: [{ Stato: 'draft', Invalidato: false }],
  inviato: [{ Stato: 'inviato', Invalidato: false }],
  verificato: [{ Stato: 'verificato', Invalidato: false }],
  rifiutato: [{ Stato: 'rifiutato', Invalidato: false }],
  draftInvalidato: [{ Stato: 'draft', Invalidato: true }],
  mix: [
    { Stato: 'verificato', Invalidato: false },
    { Stato: 'rifiutato', Invalidato: false },
    { Stato: 'draft', Invalidato: true }
  ]
}

/**
 * Oracolo indipendente del contratto di derivazione.
 */
function oracolo(statoProgetto, allocato, rimborsato, giustificativi) {
  const stato = !statoProgetto || statoProgetto === 'aperto' ? 'accettato' : statoProgetto
  if (STATI_MANUALI.has(stato)) return stato
  if (allocato > 0 && rimborsato >= allocato) return 'chiuso'
  if (stato === 'chiuso') return 'chiuso'
  if (rimborsato > 0 && rimborsato < allocato) return 'rimborso_parziale'
  const avviati = giustificativi.some(g => !g.Invalidato && STATI_AVVIO.has(String(g.Stato || '').toLowerCase()))
  if (avviati) return 'in_rendicontazione'
  return 'accettato'
}

describe('calcolaStatoProgetto — truth table', () => {
  const allocati = [0, 1000]
  const rimborsati = [0, 400, 1000, 1200]

  for (const statoProgetto of [...STATI, null, 'aperto']) {
    for (const allocato of allocati) {
      for (const rimborsato of rimborsati) {
        for (const [nomeGiust, giustificativi] of Object.entries(GIUSTIFICATIVI)) {
          const atteso = oracolo(statoProgetto, allocato, rimborsato, giustificativi)
          it(`${statoProgetto}/${allocato}/${rimborsato}/${nomeGiust} -> ${atteso}`, () => {
            expect(calcolaStatoProgetto({ statoProgetto, allocato, rimborsato, giustificativi })).toBe(atteso)
          })
        }
      }
    }
  }
})

describe('calcolaStatoProgetto — proprietà', () => {
  it('idempotente: ricalcolare lo stato calcolato non cambia il risultato', () => {
    for (const statoProgetto of [...STATI, null]) {
      for (const allocato of [0, 1000]) {
        for (const rimborsato of [0, 400, 1000, 1200]) {
          for (const giustificativi of Object.values(GIUSTIFICATIVI)) {
            const primo = calcolaStatoProgetto({ statoProgetto, allocato, rimborsato, giustificativi })
            const secondo = calcolaStatoProgetto({
              statoProgetto: primo,
              allocato,
              rimborsato,
              giustificativi
            })
            expect(secondo).toBe(primo)
          }
        }
      }
    }
  })

  it('`chiuso` è sticky finché non si raggiunge il cap', () => {
    expect(calcolaStatoProgetto({ statoProgetto: 'chiuso', allocato: 1000, rimborsato: 0 })).toBe('chiuso')
    expect(calcolaStatoProgetto({ statoProgetto: 'chiuso', allocato: 1000, rimborsato: 300 })).toBe('chiuso')
  })

  it('la fase manuale resta invariata anche con pagamenti', () => {
    for (const manuale of STATI_MANUALI) {
      expect(
        calcolaStatoProgetto({ statoProgetto: manuale, allocato: 1000, rimborsato: 1000, giustificativi: [] })
      ).toBe(manuale)
    }
  })
})

describe('calcolaDerivatiProgetto — invarianti', () => {
  const giustificativi = [
    { Stato: 'draft', Importo: '100', Invalidato: false },
    { Stato: 'inviato', Importo: '200', Invalidato: false },
    { Stato: 'verificato', Importo: '300', Invalidato: false },
    { Stato: 'pagato', Importo: '400', Invalidato: false },
    { Stato: 'verificato', Importo: '999', Invalidato: true }
  ]
  const pagamenti = [
    { Stato: 'proposto', Importo: '150' },
    { Stato: 'in_pagamento', Importo: '50' },
    { Stato: 'pagato', Importo: '400' }
  ]

  it('TotaleVerificato ≤ TotaleImporto e ResiduoAllocato ≥ 0', () => {
    const d = calcolaDerivatiProgetto({
      progetto: { StatoProgetto: 'in_rendicontazione', Allocato: '1000' },
      giustificativi,
      pagamenti
    })
    expect(d.TotaleVerificato).toBe(700)
    expect(d.TotaleImporto).toBe(1000)
    expect(d.TotaleVerificato).toBeLessThanOrEqual(d.TotaleImporto)
    expect(d.ResiduoAllocato).toBeGreaterThanOrEqual(0)
    expect(d.TotaleProposto).toBe(150)
    expect(d.TotaleInPagamento).toBe(50)
    expect(d.TotalePagato).toBe(400)
  })

  it('statoProgetto coerente con calcolaStatoProgetto(TotalePagato)', () => {
    const progetto = { StatoProgetto: 'in_rendicontazione', Allocato: '1000' }
    const d = calcolaDerivatiProgetto({ progetto, giustificativi, pagamenti })
    expect(d.statoProgetto).toBe(
      calcolaStatoProgetto({
        statoProgetto: progetto.StatoProgetto,
        allocato: 1000,
        rimborsato: d.TotalePagato,
        giustificativi
      })
    )
  })
})

describe('calcolaErogabile / residuoDaCoprire — invarianti', () => {
  const casi = [
    { allocato: 1000, totaleVerificato: 500, pct: 80 },
    { allocato: 1000, totaleVerificato: 2000, pct: 80 },
    { allocato: 0, totaleVerificato: 500, pct: 80 },
    { allocato: 1000, totaleVerificato: 0, pct: 80 },
    { allocato: 1000, totaleVerificato: 500, pct: 100 }
  ]

  for (const c of casi) {
    it(`0 ≤ erogabile ≤ allocato (${c.allocato}/${c.totaleVerificato}/${c.pct})`, () => {
      const erogabile = calcolaErogabile({
        allocato: c.allocato,
        totaleVerificato: c.totaleVerificato,
        percentualeRimborso: c.pct
      })
      expect(erogabile).toBeGreaterThanOrEqual(0)
      expect(erogabile).toBeLessThanOrEqual(c.allocato)
      expect(erogabile).toBeLessThanOrEqual((c.totaleVerificato * c.pct) / 100)
    })
  }

  it('quirk noto: percentualeRimborso = 0 è trattata come default 80 (fallback `|| 80`)', () => {
    // Comportamento ATTUALE (da valutare se correggere): uno 0 esplicito è falsy
    // e cade sul default 80%. Qui lo si fissa per non cambiarlo accidentalmente.
    const erogabile = calcolaErogabile({ allocato: 1000, totaleVerificato: 500, percentualeRimborso: 0 })
    expect(erogabile).toBe(400)
  })

  it('residuoDaCoprire è arrotondato ai centesimi', () => {
    expect(residuoDaCoprire(398 * 0.8, 318.4)).toBe(0)
    expect(residuoDaCoprire(100, 33.33)).toBe(66.67)
  })
})
