import { describe, expect, it } from 'vitest'
import { EVENTI_PAGAMENTO, pagamentoMachine } from 'src/state-machines/pagamento'
import { calcolaStatoSuccessivo, TransizioneNonValidaError } from 'src/usecases/stato/transita'

const E = EVENTI_PAGAMENTO

const TRANSIZIONI_VALIDE = [
  ['proposto', E.IN_PAGAMENTO, 'in_pagamento'],
  ['proposto', E.ANNULLA_PROPOSTA, 'annullato'],
  ['in_pagamento', E.PAGA, 'pagato'],
  ['in_pagamento', E.FALLISCI, 'fallito'],
  ['in_pagamento', E.ANNULLA, 'annullato'],
  ['fallito', E.ANNULLA, 'annullato'],
  ['fallito', E.RIPRISTINA_IN_PAGAMENTO, 'in_pagamento'],
  ['annullato', E.RIPRISTINA_PROPOSTO, 'proposto']
]

const TRANSIZIONI_NON_VALIDE = [
  ['proposto', E.PAGA],
  ['proposto', E.FALLISCI],
  ['proposto', E.ANNULLA],
  ['proposto', E.RIPRISTINA_PROPOSTO],
  ['in_pagamento', E.IN_PAGAMENTO],
  ['in_pagamento', E.RIPRISTINA_PROPOSTO],
  ['in_pagamento', E.RIPRISTINA_IN_PAGAMENTO],
  ['pagato', E.PAGA],
  ['pagato', E.FALLISCI],
  ['pagato', E.ANNULLA],
  ['fallito', E.PAGA],
  ['fallito', E.IN_PAGAMENTO],
  ['annullato', E.PAGA],
  ['annullato', E.ANNULLA],
  ['annullato', E.IN_PAGAMENTO]
]

describe('macchina Pagamento', () => {
  it.each(TRANSIZIONI_VALIDE)('%s -[%s]-> %s', (da, evento, atteso) => {
    expect(calcolaStatoSuccessivo(pagamentoMachine, da, evento)).toBe(atteso)
  })

  it.each(TRANSIZIONI_NON_VALIDE)('%s -[%s]-> non valida', (da, evento) => {
    expect(() => calcolaStatoSuccessivo(pagamentoMachine, da, evento)).toThrow(TransizioneNonValidaError)
  })

  it('rifiuta uno stato corrente assente', () => {
    expect(() => calcolaStatoSuccessivo(pagamentoMachine, null, E.PAGA)).toThrow(TransizioneNonValidaError)
    expect(() => calcolaStatoSuccessivo(pagamentoMachine, '', E.PAGA)).toThrow(TransizioneNonValidaError)
  })

  it('rifiuta uno stato corrente sconosciuto', () => {
    expect(() => calcolaStatoSuccessivo(pagamentoMachine, 'inesistente', E.PAGA)).toThrow(TransizioneNonValidaError)
  })
})
