import { createMachine } from '@xstate/fsm'
import { STATO_PROGETTO } from 'src/utils/constants'

const S = STATO_PROGETTO

/**
 * Eventi dichiarati della macchina Progetti.
 *
 * - Fase manuale: VALIDA (proposto→validato), APPROVA (validato→approvato),
 *   ACCETTA (approvato→accettato).
 * - Fase automatica/derivata (da `calcolaStatoProgetto`, idempotente):
 *   - `accettato` → `in_rendicontazione` (unico innesco automatico da accettato);
 *   - `in_rendicontazione` → `rimborso_parziale` | `chiuso`;
 *   - `rimborso_parziale` → `chiuso` (il progetto va solo in avanti).
 *   Da `accettato` NON si passa direttamente a `rimborso_parziale` e non si
 *   chiude in automatico.
 * - Chiusura manuale: CHIUDI. Riapertura: RIAPRI.
 *
 * Nota legacy: il valore `aperto` equivale ad `accettato` e va normalizzato
 * PRIMA di interrogare la macchina (vedi `statoProgettoEffettivo`). La macchina
 * NON esegue I/O e NON persiste: valida soltanto.
 */
export const EVENTI_PROGETTO = {
  VALIDA: 'VALIDA',
  APPROVA: 'APPROVA',
  ACCETTA: 'ACCETTA',
  RICALCOLA_ACCETTATO: 'RICALCOLA_ACCETTATO',
  RICALCOLA_IN_RENDICONTAZIONE: 'RICALCOLA_IN_RENDICONTAZIONE',
  RICALCOLA_RIMBORSO_PARZIALE: 'RICALCOLA_RIMBORSO_PARZIALE',
  RICALCOLA_CHIUSO: 'RICALCOLA_CHIUSO',
  CHIUDI: 'CHIUDI',
  RIAPRI: 'RIAPRI'
}

const E = EVENTI_PROGETTO

export const progettoMachine = createMachine({
  id: 'progetto',
  initial: S.PROPOSTO,
  states: {
    [S.PROPOSTO]: {
      on: {
        [E.VALIDA]: S.VALIDATO
      }
    },
    [S.VALIDATO]: {
      on: {
        [E.APPROVA]: S.APPROVATO
      }
    },
    [S.APPROVATO]: {
      on: {
        [E.ACCETTA]: S.ACCETTATO
      }
    },
    [S.ACCETTATO]: {
      on: {
        // Da `accettato` l'unico innesco automatico è la rendicontazione.
        // Non si passa direttamente a `rimborso_parziale` e non si chiude in
        // automatico: la chiusura è solo manuale (CHIUDI).
        [E.RICALCOLA_IN_RENDICONTAZIONE]: S.IN_RENDICONTAZIONE,
        [E.CHIUDI]: S.CHIUSO
      }
    },
    [S.IN_RENDICONTAZIONE]: {
      on: {
        [E.RICALCOLA_ACCETTATO]: S.ACCETTATO,
        [E.RICALCOLA_RIMBORSO_PARZIALE]: S.RIMBORSO_PARZIALE,
        [E.RICALCOLA_CHIUSO]: S.CHIUSO,
        [E.CHIUDI]: S.CHIUSO
      }
    },
    [S.RIMBORSO_PARZIALE]: {
      on: {
        // Una volta entrato nel rimborso parziale il progetto va solo in
        // avanti: può chiudersi (cap raggiunto o manuale), mai tornare a
        // `accettato`/`in_rendicontazione`.
        [E.RICALCOLA_CHIUSO]: S.CHIUSO,
        [E.CHIUDI]: S.CHIUSO
      }
    },
    [S.CHIUSO]: {
      on: {
        [E.RIAPRI]: S.ACCETTATO
      }
    }
  }
})

/**
 * Evento di ricalcolo (derivato) che porta a `target` dagli stati operativi.
 * Ritorna null se il target non è uno stato di ricalcolo automatico.
 */
export function eventoRicalcoloProgetto(target) {
  if (target === S.ACCETTATO) return E.RICALCOLA_ACCETTATO
  if (target === S.IN_RENDICONTAZIONE) return E.RICALCOLA_IN_RENDICONTAZIONE
  if (target === S.RIMBORSO_PARZIALE) return E.RICALCOLA_RIMBORSO_PARZIALE
  if (target === S.CHIUSO) return E.RICALCOLA_CHIUSO
  return null
}
