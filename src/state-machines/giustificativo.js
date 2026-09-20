import { createMachine } from '@xstate/fsm'
import { STATO_GIUSTIFICATIVO } from 'src/utils/constants'

const S = STATO_GIUSTIFICATIVO

/**
 * Eventi dichiarati della macchina Giustificativi.
 *
 * - Eventi di business: INVIA (draft→inviato), RIPRISTINA_INVIATO
 *   (verificato/rifiutato→inviato), VERIFICA, RIFIUTA.
 * - Eventi di ricalcolo pagamento (derivati, idempotenti): RICALCOLA_* dai
 *   contabili (`verificato`/`in_pagamento`/`pagato`) verso un contabile.
 *
 * La macchina NON esegue I/O e NON persiste: valida soltanto (vedi `transita`).
 * Il flag `Invalidato` è ortogonale allo `Stato` e non è modellato qui.
 */
export const EVENTI_GIUSTIFICATIVO = {
  INVIA: 'INVIA',
  RIPRISTINA_INVIATO: 'RIPRISTINA_INVIATO',
  VERIFICA: 'VERIFICA',
  RIFIUTA: 'RIFIUTA',
  RICALCOLA_VERIFICATO: 'RICALCOLA_VERIFICATO',
  RICALCOLA_IN_PAGAMENTO: 'RICALCOLA_IN_PAGAMENTO',
  RICALCOLA_PAGATO: 'RICALCOLA_PAGATO'
}

export const giustificativoMachine = createMachine({
  id: 'giustificativo',
  initial: S.DRAFT,
  states: {
    [S.DRAFT]: {
      on: {
        [EVENTI_GIUSTIFICATIVO.INVIA]: S.INVIATO
      }
    },
    [S.INVIATO]: {
      on: {
        [EVENTI_GIUSTIFICATIVO.VERIFICA]: S.VERIFICATO,
        [EVENTI_GIUSTIFICATIVO.RIFIUTA]: S.RIFIUTATO
      }
    },
    [S.VERIFICATO]: {
      on: {
        [EVENTI_GIUSTIFICATIVO.RIPRISTINA_INVIATO]: S.INVIATO,
        [EVENTI_GIUSTIFICATIVO.RICALCOLA_IN_PAGAMENTO]: S.IN_PAGAMENTO,
        [EVENTI_GIUSTIFICATIVO.RICALCOLA_PAGATO]: S.PAGATO
      }
    },
    [S.RIFIUTATO]: {
      on: {
        [EVENTI_GIUSTIFICATIVO.RIPRISTINA_INVIATO]: S.INVIATO
      }
    },
    [S.IN_PAGAMENTO]: {
      on: {
        [EVENTI_GIUSTIFICATIVO.RICALCOLA_VERIFICATO]: S.VERIFICATO,
        [EVENTI_GIUSTIFICATIVO.RICALCOLA_PAGATO]: S.PAGATO
      }
    },
    [S.PAGATO]: {
      on: {
        [EVENTI_GIUSTIFICATIVO.RICALCOLA_VERIFICATO]: S.VERIFICATO,
        [EVENTI_GIUSTIFICATIVO.RICALCOLA_IN_PAGAMENTO]: S.IN_PAGAMENTO
      }
    }
  }
})
