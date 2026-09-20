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
import { STATI_GIUSTIFICATIVO_CONTABILI, STATO_GIUSTIFICATIVO } from './constants'
import { calcolaErogabile, residuoDaCoprire } from './erogabile'

function isContabile(stato) {
  return STATI_GIUSTIFICATIVO_CONTABILI.includes(stato)
}

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
  const dbVerificato = Number.parseFloat(row.totaleVerificato) || 0
  const giustVerificato = (row.giustificativi || []).reduce(
    (acc, g) => (!g.Invalidato && isContabile(g.Stato) ? acc + (Number.parseFloat(g.Importo) || 0) : acc),
    0
  )
  const totaleVerificato = dbVerificato || giustVerificato
  const erogabile = calcolaErogabile({
    allocato: row.allocato,
    totaleVerificato,
    percentualeRimborso: row.percentualeRimborso
  })
  const pagato = Number.parseFloat(row.totalePagato) || 0
  const inPagamento = Number.parseFloat(row.totaleInPagamento) || 0
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
 * 1. Nessun importo rendicontato (vuoto / solo draft / solo rifiutati) → Non ricevuta
 * 2. Almeno un inviato → Da verificare (l'azione di verifica è la priorità)
 * 3. Dati bancari mancanti
 * 4. Tutti contabili → Pagato | In pagamento | Pronto
 * 5. Altrimenti → Da completare
 *
 * @param {Object} row - Riga Verifica
 * @returns {{key: string, label: string, color: string}}
 */
export function calcolaStatoRiga(row) {
  const totaleRendicontato = Number.parseFloat(row?.totaleRendicontato) || 0
  if (totaleRendicontato === 0) {
    return { key: 'nessuno', label: 'Non ricevuta', color: 'grey' }
  }
  const giust = row.giustificativi || []
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
