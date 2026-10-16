/**
 * Test-contratto esaustivo delle macchine a stati.
 *
 * Per ogni macchina si enumera l'intero prodotto `stati × eventi` e si confronta
 * con una matrice attesa dichiarata qui (indipendente dall'implementazione):
 * - se la transizione è dichiarata, deve portare ESATTAMENTE al target atteso;
 * - se non è dichiarata, deve lanciare `TransizioneNonValidaError`.
 *
 * Inoltre si verifica che nessun target atteso punti a uno stato inesistente.
 */
import { describe, expect, it } from 'vitest'
import { EVENTI_GIUSTIFICATIVO, giustificativoMachine } from 'src/state-machines/giustificativo'
import { EVENTI_PAGAMENTO, pagamentoMachine } from 'src/state-machines/pagamento'
import { EVENTI_PROGETTO, progettoMachine } from 'src/state-machines/progetto'
import { EVENTI_SUBMISSION, submissionMachine } from 'src/state-machines/submission'
import { calcolaStatoSuccessivo, TransizioneNonValidaError } from 'src/usecases/stato/transita'

// Matrici attese: expected[stato][evento] = target (solo transizioni dichiarate).
const CASES = [
  {
    name: 'progetto',
    machine: progettoMachine,
    eventi: EVENTI_PROGETTO,
    expected: {
      proposto: { VALIDA: 'validato' },
      validato: { APPROVA: 'approvato' },
      approvato: { ACCETTA: 'accettato' },
      accettato: { RICALCOLA_IN_RENDICONTAZIONE: 'in_rendicontazione', CHIUDI: 'chiuso' },
      in_rendicontazione: {
        RICALCOLA_ACCETTATO: 'accettato',
        RICALCOLA_RIMBORSO_PARZIALE: 'rimborso_parziale',
        RICALCOLA_CHIUSO: 'chiuso',
        CHIUDI: 'chiuso'
      },
      rimborso_parziale: { RICALCOLA_CHIUSO: 'chiuso', CHIUDI: 'chiuso' },
      // RIAPRI è a guardia: senza ctx atterra sul fallback `accettato`.
      chiuso: { RIAPRI: 'accettato' }
    }
  },
  {
    name: 'giustificativo',
    machine: giustificativoMachine,
    eventi: EVENTI_GIUSTIFICATIVO,
    expected: {
      draft: { INVIA: 'inviato' },
      inviato: { VERIFICA: 'verificato', RIFIUTA: 'rifiutato' },
      verificato: {
        RIPRISTINA_INVIATO: 'inviato',
        RICALCOLA_IN_PAGAMENTO: 'in_pagamento',
        RICALCOLA_PAGATO: 'pagato'
      },
      rifiutato: { RIPRISTINA_INVIATO: 'inviato' },
      in_pagamento: { RICALCOLA_VERIFICATO: 'verificato', RICALCOLA_PAGATO: 'pagato' },
      pagato: { RICALCOLA_VERIFICATO: 'verificato', RICALCOLA_IN_PAGAMENTO: 'in_pagamento' }
    }
  },
  {
    name: 'pagamento',
    machine: pagamentoMachine,
    eventi: EVENTI_PAGAMENTO,
    expected: {
      proposto: { IN_PAGAMENTO: 'in_pagamento', ANNULLA_PROPOSTA: 'annullato' },
      in_pagamento: { PAGA: 'pagato', FALLISCI: 'fallito', ANNULLA: 'annullato' },
      pagato: {},
      fallito: { ANNULLA: 'annullato', RIPRISTINA_PROPOSTO: 'proposto' },
      annullato: { RIPRISTINA_PROPOSTO: 'proposto' }
    }
  },
  {
    name: 'submission',
    machine: submissionMachine,
    eventi: EVENTI_SUBMISSION,
    expected: {
      inserito: { SCARTA: 'scartato', RICONCILIA: 'inviato' },
      scartato: { RIPRISTINA: 'inserito' },
      inviato: {}
    }
  }
]

describe('matrice-contratto macchine a stati', () => {
  for (const caso of CASES) {
    const stati = Object.keys(caso.machine.config.states)
    const eventi = Object.values(caso.eventi)

    describe(caso.name, () => {
      it('nessun target atteso punta a uno stato inesistente', () => {
        for (const [stato, eventiAttesi] of Object.entries(caso.expected)) {
          expect(stati, `stato dichiarato in expected: ${stato}`).toContain(stato)
          for (const target of Object.values(eventiAttesi)) {
            expect(stati, `target ${target} di ${stato}`).toContain(target)
          }
        }
      })

      it('enumera tutti gli stati della macchina', () => {
        const ordina = (a, b) => a.localeCompare(b)
        expect(Object.keys(caso.expected).sort(ordina)).toEqual([...stati].sort(ordina))
      })

      for (const stato of stati) {
        for (const evento of eventi) {
          const atteso = caso.expected[stato]?.[evento]
          if (atteso) {
            it(`${stato} -[${evento}]-> ${atteso}`, () => {
              expect(calcolaStatoSuccessivo(caso.machine, stato, evento)).toBe(atteso)
            })
          } else {
            it(`${stato} -[${evento}]-> non valida`, () => {
              expect(() => calcolaStatoSuccessivo(caso.machine, stato, evento)).toThrow(TransizioneNonValidaError)
            })
          }
        }
      }
    })
  }
})

describe('invarianti di struttura delle macchine', () => {
  it('pagamento `pagato` è terminale (nessun evento)', () => {
    expect(Object.keys(pagamentoMachine.config.states.pagato.on || {})).toEqual([])
  })

  it('submission `inviato` è terminale (nessun evento)', () => {
    expect(Object.keys(submissionMachine.config.states.inviato.on || {})).toEqual([])
  })

  it('progetto `chiuso` esce solo con RIAPRI', () => {
    expect(Object.keys(progettoMachine.config.states.chiuso.on)).toEqual([EVENTI_PROGETTO.RIAPRI])
  })
})
