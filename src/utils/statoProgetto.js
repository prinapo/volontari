/**
 * Calcolo dello stato del progetto (StatoProgetto) a partire dai dati grezzi.
 *
 * Il ciclo di vita ha una parte manuale (proposto → validato → approvato →
 * accettato) e una automatica (in_rendicontazione → chiuso | rimborso_parziale).
 *
 * Questa funzione è PURO lato codice (pattern identico a StatoRendicontazione):
 * viene usata per la scrittura in DB dopo le operazioni e dal check di coerenza
 * admin (checkStatoProgettoConsistency) che confronta DB vs calcolato.
 *
 * Legacy: il valore 'aperto' dei progetti esistenti viene tradotto in
 * 'accettato' in lettura (renaming logico, nessun backfill).
 */
import { STATO_PROGETTO, STATI_PROGETTO_FINALI } from './constants'

/**
 * Conta i giustificativi non invalidati.
 */
function hasValidGiustificativi(giustificativi = []) {
  return giustificativi.some(g => !g.Invalidato)
}

/**
 * Calcola lo stato progetto atteso.
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

  // Legacy 'aperto' e assenza valore → 'accettato'
  const stato = !statoProgetto || statoProgetto === STATO_PROGETTO.APERTO ? STATO_PROGETTO.ACCETTATO : statoProgetto

  // Fase manuale (proposto/validato/approvato): resta invariata,
  // la gestisce l'operatore. Il calcolo automatico non interviene.
  if (stato === STATO_PROGETTO.PROPOSTO || stato === STATO_PROGETTO.VALIDATO || stato === STATO_PROGETTO.APPROVATO) {
    return stato
  }

  // Chiusura per pagamento completo (possibile solo se allocato > 0)
  if (allocatoNum > 0 && rimborsatoNum >= allocatoNum) {
    return STATO_PROGETTO.CHIUSO
  }

  // Se il progetto è già in uno stato finale (chiuso / rimborso_parziale),
  // NON si torna indietro automaticamente: la chiusura è stata decisa
  // (pagamenti avvenuti o chiusura parziale manuale). La riapertura è solo
  // un'azione manuale dell'operatore.
  if (STATI_PROGETTO_FINALI.includes(stato)) {
    return stato
  }

  // Stato operativo: accettato / in_rendicontazione
  const haGiustificativi = hasValidGiustificativi(giustificativi)
  if (haGiustificativi) {
    return STATO_PROGETTO.IN_RENDICONTAZIONE
  }

  // Nessun giustificativo valido (mai caricato o tutti invalidati, ma mai chiuso)
  return STATO_PROGETTO.ACCETTATO
}
