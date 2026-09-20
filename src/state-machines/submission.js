import { createMachine } from '@xstate/fsm'
import { STATO_SUBMISSION } from 'src/utils/constants'

const S = STATO_SUBMISSION

/**
 * Eventi dichiarati della macchina Submission (modulo libero, collezione
 * `InviiGiustificativiNoLogin`). La macchina NON esegue I/O: valida soltanto.
 */
export const EVENTI_SUBMISSION = {
  SCARTA: 'SCARTA',
  RIPRISTINA: 'RIPRISTINA',
  RICONCILIA: 'RICONCILIA'
}

export const submissionMachine = createMachine({
  id: 'submission',
  initial: S.INSERITO,
  states: {
    [S.INSERITO]: {
      on: {
        [EVENTI_SUBMISSION.SCARTA]: S.SCARTATO,
        [EVENTI_SUBMISSION.RICONCILIA]: S.INVIATO
      }
    },
    [S.SCARTATO]: {
      on: {
        [EVENTI_SUBMISSION.RIPRISTINA]: S.INSERITO
      }
    },
    [S.INVIATO]: {}
  }
})
