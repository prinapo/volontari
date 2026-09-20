import { createMachine } from '@xstate/fsm'
import { STATO_PAGAMENTO } from 'src/utils/constants'

const S = STATO_PAGAMENTO

/**
 * Eventi dichiarati della macchina Pagamenti.
 * I target sono statici: ogni evento porta a un solo stato. La macchina NON
 * esegue I/O e NON persiste: valida soltanto (vedi `transita`).
 */
export const EVENTI_PAGAMENTO = {
  IN_PAGAMENTO: 'IN_PAGAMENTO',
  PAGA: 'PAGA',
  FALLISCI: 'FALLISCI',
  ANNULLA: 'ANNULLA',
  ANNULLA_PROPOSTA: 'ANNULLA_PROPOSTA',
  RIPRISTINA_PROPOSTO: 'RIPRISTINA_PROPOSTO',
  RIPRISTINA_IN_PAGAMENTO: 'RIPRISTINA_IN_PAGAMENTO'
}

export const pagamentoMachine = createMachine({
  id: 'pagamento',
  initial: S.PROPOSTO,
  states: {
    [S.PROPOSTO]: {
      on: {
        [EVENTI_PAGAMENTO.IN_PAGAMENTO]: S.IN_PAGAMENTO,
        [EVENTI_PAGAMENTO.ANNULLA_PROPOSTA]: S.ANNULLATO
      }
    },
    [S.IN_PAGAMENTO]: {
      on: {
        [EVENTI_PAGAMENTO.PAGA]: S.PAGATO,
        [EVENTI_PAGAMENTO.FALLISCI]: S.FALLITO,
        [EVENTI_PAGAMENTO.ANNULLA]: S.ANNULLATO
      }
    },
    [S.PAGATO]: {},
    [S.FALLITO]: {
      on: {
        [EVENTI_PAGAMENTO.ANNULLA]: S.ANNULLATO,
        [EVENTI_PAGAMENTO.RIPRISTINA_IN_PAGAMENTO]: S.IN_PAGAMENTO
      }
    },
    [S.ANNULLATO]: {
      on: {
        [EVENTI_PAGAMENTO.RIPRISTINA_PROPOSTO]: S.PROPOSTO
      }
    }
  }
})
