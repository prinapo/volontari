import { describe, expect, it } from 'vitest'
import { EVENTI_GIUSTIFICATIVO, giustificativoMachine } from 'src/state-machines/giustificativo'
import { calcolaStatoSuccessivo, TransizioneNonValidaError } from 'src/usecases/stato/transita'

const E = EVENTI_GIUSTIFICATIVO

const TRANSIZIONI_VALIDE = [
  ['draft', E.INVIA, 'inviato'],
  ['inviato', E.VERIFICA, 'verificato'],
  ['inviato', E.RIFIUTA, 'rifiutato'],
  ['verificato', E.RIPRISTINA_INVIATO, 'inviato'],
  ['rifiutato', E.RIPRISTINA_INVIATO, 'inviato'],
  ['verificato', E.RICALCOLA_IN_PAGAMENTO, 'in_pagamento'],
  ['verificato', E.RICALCOLA_PAGATO, 'pagato'],
  ['in_pagamento', E.RICALCOLA_VERIFICATO, 'verificato'],
  ['in_pagamento', E.RICALCOLA_PAGATO, 'pagato'],
  ['pagato', E.RICALCOLA_VERIFICATO, 'verificato'],
  ['pagato', E.RICALCOLA_IN_PAGAMENTO, 'in_pagamento']
]

const TRANSIZIONI_NON_VALIDE = [
  ['draft', E.VERIFICA],
  ['draft', E.RIFIUTA],
  ['draft', E.RICALCOLA_PAGATO],
  ['inviato', E.INVIA],
  ['inviato', E.RICALCOLA_PAGATO],
  ['inviato', E.RIPRISTINA_INVIATO],
  ['verificato', E.VERIFICA],
  ['verificato', E.RIFIUTA],
  ['verificato', E.RICALCOLA_VERIFICATO],
  ['rifiutato', E.VERIFICA],
  ['rifiutato', E.RICALCOLA_PAGATO],
  ['in_pagamento', E.RIFIUTA],
  ['in_pagamento', E.RICALCOLA_IN_PAGAMENTO],
  ['pagato', E.RIFIUTA],
  ['pagato', E.RICALCOLA_PAGATO]
]

describe('macchina Giustificativo', () => {
  it.each(TRANSIZIONI_VALIDE)('%s -[%s]-> %s', (da, evento, atteso) => {
    expect(calcolaStatoSuccessivo(giustificativoMachine, da, evento)).toBe(atteso)
  })

  it.each(TRANSIZIONI_NON_VALIDE)('%s -[%s]-> non valida', (da, evento) => {
    expect(() => calcolaStatoSuccessivo(giustificativoMachine, da, evento)).toThrow(TransizioneNonValidaError)
  })

  it('rifiuta uno stato corrente assente', () => {
    expect(() => calcolaStatoSuccessivo(giustificativoMachine, null, E.VERIFICA)).toThrow(TransizioneNonValidaError)
  })
})
