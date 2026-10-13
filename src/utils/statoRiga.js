/**
 * Stato di riga (rendicontazione) per un progetto.
 *
 * Deriva l'esito dagli stati **persistiti** dei giustificativi:
 * - `verificato` → Pronto (da pagare)
 * - `in_pagamento` → In pagamento
 * - `pagato` → Pagato (include il caso "allocato raggiunto", in cui tutti i
 *   giustificativi verificati vengono marcati `pagato` perché non concorrono
 *   più a nuove proposte)
 *
 * Nessuna scrittura: sola lettura dello stato salvato.
 */
import { isContabile, STATO_GIUSTIFICATIVO } from './constants'
import { calcolaErogabile, residuoDaCoprire } from './erogabile'
import { parseNum } from './number'

/**
 * Calcolo erogabile/residuo del progetto (importi). I dati non superano mai il
 * cap dell'allocato: l'importo erogabile è il minore tra il verificato al netto
 * della percentuale di rimborso e l'allocato.
 *
 * @param {Object} row - Riga Verifica (allocato, totaleVerificato, totalePagato,
 *                       totaleInPagamento, percentualeRimborso, giustificativi)
 * @returns {{erogabile: number, pagato: number, residuo: number}}
 */
function calcoloErogabile(row) {
  const dbVerificato = parseNum(row.totaleVerificato)
  const giustVerificato = (row.giustificativi || []).reduce(
    (acc, g) => (!g.Invalidato && isContabile(g.Stato) ? acc + parseNum(g.Importo) : acc),
    0
  )
  const totaleVerificato = dbVerificato || giustVerificato
  const erogabile = calcolaErogabile({
    allocato: row.allocato,
    totaleVerificato,
    percentualeRimborso: row.percentualeRimborso
  })
  const pagato = parseNum(row.totalePagato)
  const inPagamento = parseNum(row.totaleInPagamento)
  return { erogabile, pagato, residuo: residuoDaCoprire(erogabile, pagato + inPagamento) }
}

/**
 * Residuo ancora da erogare per il progetto (importo).
 *
 * @param {Object} row - Riga Verifica
 * @returns {number}
 */
export function residuoErogabile(row) {
  return calcoloErogabile(row).residuo
}

/**
 * Stato di riga derivato dagli stati persistiti dei giustificativi.
 *
 * Ordine regole:
 * 1. Nessun importo rendicontato (vuoto / solo rifiutati) → Non ricevuta
 * 2. Zero importi rendicontati ma con bozze → Bozze da inviare
 * 3. Almeno un inviato → Da verificare (l'azione di verifica è la priorità)
 * 4. Dati bancari mancanti
 * 5. Tutti contabili → Pagato | In pagamento | Pronto
 * 6. Altrimenti → Da completare
 *
 * @param {Object} row - Riga Verifica
 * @returns {{key: string, label: string, color: string}}
 */
export function calcolaStatoRiga(row) {
  const giust = row?.giustificativi || []
  const totaleRendicontato = parseNum(row?.totaleRendicontato)
  if (totaleRendicontato === 0) {
    if (giust.some(g => !g.Invalidato && g.Stato === STATO_GIUSTIFICATIVO.DRAFT)) {
      return { key: 'bozze', label: 'Bozze da inviare', color: 'warning' }
    }
    return { key: 'nessuno', label: 'Non ricevuta', color: 'grey' }
  }
  if (giust.some(g => !g.Invalidato && g.Stato === STATO_GIUSTIFICATIVO.INVIATO)) {
    return { key: 'da_verificare', label: 'Da verificare', color: 'orange' }
  }
  if (!row.iban || !row.intestatario) {
    return { key: 'dati_bancari', label: 'Dati bancari mancanti', color: 'warning' }
  }
  const valid = giust.filter(g => !g.Invalidato)
  if (valid.length > 0 && valid.every(g => isContabile(g.Stato))) {
    if (valid.every(g => g.Stato === STATO_GIUSTIFICATIVO.PAGATO)) {
      return { key: 'pagato', label: 'Pagato', color: 'grey' }
    }
    if (valid.some(g => g.Stato === STATO_GIUSTIFICATIVO.IN_PAGAMENTO)) {
      return { key: 'in_pagamento', label: 'In pagamento', color: 'secondary' }
    }
    return { key: 'pronto', label: 'Pronto', color: 'positive' }
  }
  return { key: 'da_completare', label: 'Da completare', color: 'warning' }
}
