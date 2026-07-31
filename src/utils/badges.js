/**
 * Badge e convenzioni cromatiche condivise per tutta l'app.
 *
 * Questo file è la FONTE UNICA di verità per colori/etichette dei badge
 * e per le convenzioni sulle icone di azione. Non duplicare questi helper
 * localmente nei componenti: importali da qui.
 */

/**
 * Colore Quasar per lo stato di un giustificativo.
 *
 * Standard stabilito:
 * - Bozza        -> grey    (stato normale, neutro, non un'anomalia)
 * - Inviato      -> orange  (in corso / da verificare)
 * - Verificato   -> positive
 * - Rifiutato    -> negative
 *
 * NOTA: questo standard SOSTITUISCE la vecchia versione in formatters.js
 * che usava draft=warning / inviato=primary.
 */
export function statoColor(stato) {
  if (stato === 'draft') return 'grey'
  if (stato === 'verificato') return 'positive'
  if (stato === 'inviato') return 'orange'
  if (stato === 'rifiutato') return 'negative'
  if (stato) console.warn(`[badges] stato giustificativo non riconosciuto: "${stato}"`)
  return 'grey'
}

/**
 * Etichetta testuale per lo stato di un giustificativo.
 */
export function statoLabel(stato) {
  if (stato === 'draft') return 'Bozza'
  if (stato === 'verificato') return 'Verificato'
  if (stato === 'inviato') return 'Inviato'
  if (stato === 'rifiutato') return 'Rifiutato'
  return 'Bozza'
}

/**
 * Colore Quasar per il tipo di contatto (ruolo nella famiglia).
 *
 * Standard a 4 colori (stile solid):
 * - Volontario -> primary
 * - Genitore   -> secondary
 * - Referente  -> accent
 * - Contatto   -> grey (tipo generico/neutro)
 */
export function tipoBadgeColor(tipo) {
  if (tipo === 'Volontario') return 'primary'
  if (tipo === 'Genitore') return 'secondary'
  if (tipo === 'Referente') return 'accent'
  return 'grey'
}

/**
 * CONVENZIONE ICONE DOWNLOAD (regola esplicita, non eccezione):
 *
 * - Icona `file_download` SENZA colore = consultare un file esistente
 *   (azione secondaria, es. allegato di un giustificativo).
 * - Icona `download` con colore `primary` = il download è l'azione
 *   principale della riga/tabella (es. Liste esportazione).
 *
 * Applicare questa distinzione a ogni nuova occorrenza di download.
 */
export const DOWNLOAD_ICON = 'file_download'
export const DOWNLOAD_PRIMARY_ICON = 'download'

/**
 * COLORI AZIONE (bottoni, non badge):
 *
 * Le azioni semantiche devono usare colori fissi, non `primary`/`negative`
 * dal tema (che in dev possono coincidere — vedi quasar.config.js dove
 * primary e negative sono entrambi #C0503A in sviluppo).
 *
 * - Verifica  -> positive (verde), coerente con lo stato "Verificato"
 * - Rifiuta   -> negative (rosso), coerente con lo stato "Rifiutato"
 */
export const ACTION_VERIFY = 'positive'
export const ACTION_REJECT = 'negative'
