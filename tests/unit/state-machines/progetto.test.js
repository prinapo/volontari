import { describe, expect, it } from 'vitest'
import { EVENTI_PROGETTO, progettoMachine } from 'src/state-machines/progetto'
import { calcolaStatoSuccessivo, TransizioneNonValidaError } from 'src/usecases/stato/transita'

const E = EVENTI_PROGETTO

const TRANSIZIONI_VALIDE = [
  ['proposto', E.VALIDA, 'validato'],
  ['validato', E.APPROVA, 'approvato'],
  ['approvato', E.ACCETTA, 'accettato'],
  ['accettato', E.RICALCOLA_IN_RENDICONTAZIONE, 'in_rendicontazione'],
  ['accettato', E.RICALCOLA_RIMBORSO_PARZIALE, 'rimborso_parziale'],
  ['accettato', E.RICALCOLA_CHIUSO, 'chiuso'],
  ['accettato', E.CHIUDI, 'chiuso'],
  ['in_rendicontazione', E.RICALCOLA_ACCETTATO, 'accettato'],
  ['in_rendicontazione', E.RICALCOLA_RIMBORSO_PARZIALE, 'rimborso_parziale'],
  ['in_rendicontazione', E.RICALCOLA_CHIUSO, 'chiuso'],
  ['in_rendicontazione', E.CHIUDI, 'chiuso'],
  ['rimborso_parziale', E.RICALCOLA_ACCETTATO, 'accettato'],
  ['rimborso_parziale', E.RICALCOLA_IN_RENDICONTAZIONE, 'in_rendicontazione'],
  ['rimborso_parziale', E.RICALCOLA_CHIUSO, 'chiuso'],
  ['rimborso_parziale', E.CHIUDI, 'chiuso'],
  ['chiuso', E.RIAPRI, 'accettato']
]

const TRANSIZIONI_NON_VALIDE = [
  ['proposto', E.APPROVA],
  ['proposto', E.RICALCOLA_CHIUSO],
  ['proposto', E.CHIUDI],
  ['validato', E.VALIDA],
  ['validato', E.CHIUDI],
  ['approvato', E.RICALCOLA_CHIUSO],
  ['accettato', E.RICALCOLA_ACCETTATO],
  ['accettato', E.RIAPRI],
  ['in_rendicontazione', E.RICALCOLA_IN_RENDICONTAZIONE],
  ['in_rendicontazione', E.RIAPRI],
  ['rimborso_parziale', E.RICALCOLA_RIMBORSO_PARZIALE],
  ['rimborso_parziale', E.RIAPRI],
  ['chiuso', E.RICALCOLA_ACCETTATO],
  ['chiuso', E.CHIUDI],
  ['chiuso', E.VALIDA]
]

describe('macchina Progetto', () => {
  it.each(TRANSIZIONI_VALIDE)('%s -[%s]-> %s', (da, evento, atteso) => {
    expect(calcolaStatoSuccessivo(progettoMachine, da, evento)).toBe(atteso)
  })

  it.each(TRANSIZIONI_NON_VALIDE)('%s -[%s]-> non valida', (da, evento) => {
    expect(() => calcolaStatoSuccessivo(progettoMachine, da, evento)).toThrow(TransizioneNonValidaError)
  })
})
