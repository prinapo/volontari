import { describe, expect, it } from 'vitest'
import { EVENTI_SUBMISSION, submissionMachine } from 'src/state-machines/submission'
import { calcolaStatoSuccessivo, TransizioneNonValidaError } from 'src/usecases/stato/transita'

const E = EVENTI_SUBMISSION

const TRANSIZIONI_VALIDE = [
  ['inserito', E.SCARTA, 'scartato'],
  ['inserito', E.RICONCILIA, 'inviato'],
  ['scartato', E.RIPRISTINA, 'inserito']
]

const TRANSIZIONI_NON_VALIDE = [
  ['inserito', E.RIPRISTINA],
  ['scartato', E.SCARTA],
  ['scartato', E.RICONCILIA],
  ['inviato', E.SCARTA],
  ['inviato', E.RIPRISTINA],
  ['inviato', E.RICONCILIA]
]

describe('macchina Submission', () => {
  it.each(TRANSIZIONI_VALIDE)('%s -[%s]-> %s', (da, evento, atteso) => {
    expect(calcolaStatoSuccessivo(submissionMachine, da, evento)).toBe(atteso)
  })

  it.each(TRANSIZIONI_NON_VALIDE)('%s -[%s]-> non valida', (da, evento) => {
    expect(() => calcolaStatoSuccessivo(submissionMachine, da, evento)).toThrow(TransizioneNonValidaError)
  })
})
