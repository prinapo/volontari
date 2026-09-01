/**
 * Calcolo dello stato del progetto (StatoProgetto) a partire dai dati grezzi.
 *
 * Il ciclo di vita ha una parte manuale (proposto → validato → approvato →
 * accettato) e una automatica (in_rendicontazione → chiuso | rimborso_parziale).
 *
 * Questa funzione è PURO lato codice (pattern identico a StatoRendicontazione):
 * viene usata per la scrittura in DB dopo le operazioni e dal tool admin
 * che calcola le trasformazioni di stato.
 *
 * Legacy: il valore 'aperto' e NULL vengono tradotti in 'accettato' come base.
 * Il rimborso_parziale è automatico: se pagato>0 ma < allocato, il progetto
 * assume questo stato indipendentemente dallo stato precedente.
 */
import { STATO_PROGETTO } from './constants'

function hasValidGiustificativi(giustificativi = []) {
  return giustificativi.some(g => !g.Invalidato)
}

/**
 * Calcola lo stato progetto atteso.
 *
 * Ordine regole:
 * 1. NULL/aperto → accettato (base)
 * 2. Manuale (proposto/validato/approvato) → resta invariata
 * 3. Pagamento completo (pagato>=allocato>0) → chiuso
 * 4. Pagamento parziale (0 < pagato < allocato) → rimborso_parziale
 * 5. Già chiuso → resta chiuso (no retrocesso)
 * 6. Ha giustificativi validi → in_rendicontazione
 * 7. Altrimenti → accettato
 *
 * @param {Object} input
 * @param {string} [input.statoProgetto] - Stato attuale salvato in DB
 * @param {number} [input.allocato] - Importo allocato
 * @param {number} [input.rimborsato] - Totale pagato (pagamenti 'pagato')
 * @param {Array}  [input.giustificativi] - Giustificativi del progetto
 * @returns {string} Valore di STATO_PROGETTO
 */
export function calcolaStatoProgetto({ statoProgetto, allocato = 0, rimborsato = 0, giustificativi = [] } = {}) {
  const allocatoNum = Number.parseFloat(allocato) || 0
  const rimborsatoNum = Number.parseFloat(rimborsato) || 0

  // 1. Legacy 'aperto' e assenza valore → 'accettato'
  const stato = !statoProgetto || statoProgetto === STATO_PROGETTO.APERTO ? STATO_PROGETTO.ACCETTATO : statoProgetto

  // 2. Fase manuale (proposto/validato/approvato): resta invariata
  if (stato === STATO_PROGETTO.PROPOSTO || stato === STATO_PROGETTO.VALIDATO || stato === STATO_PROGETTO.APPROVATO) {
    return stato
  }

  // 3. Pagamento completo: chiuso (anche rimborso_parziale che completa)
  if (allocatoNum > 0 && rimborsatoNum >= allocatoNum) {
    return STATO_PROGETTO.CHIUSO
  }

  // 4. Pagamento parziale: rimborso_parziale (automatico)
  if (rimborsatoNum > 0 && rimborsatoNum < allocatoNum) {
    return STATO_PROGETTO.RIMBORSO_PARZIALE
  }

  // 5. Già chiuso (con pagato=0 o allocato=0): resta chiuso
  if (stato === STATO_PROGETTO.CHIUSO) {
    return STATO_PROGETTO.CHIUSO
  }

  // 6. Ha giustificativi validi → in_rendicontazione
  if (hasValidGiustificativi(giustificativi)) {
    return STATO_PROGETTO.IN_RENDICONTAZIONE
  }

  // 7. Default: accettato
  return STATO_PROGETTO.ACCETTATO
}
