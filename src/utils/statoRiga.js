/**
 * Stato di riga (rendicontazione) "Pronto / Pagato / In pagamento" per un progetto.
 *
 * Unica fonte di verità fusa: deriva l'esito dal residuo erogabile (stessa
 * logica del RICALCOLA in pagamenti.store) e non dal solo stato dei giustificativi
 * (che restano 'verificato' per sempre nel DB). Nessuna scrittura.
 *
 * Se una riga ha giustificativi tutti verificati ma il residuo da erogare è <= 0:
 * - importo già interamente pagato (totalePagato >= erogabile) → 'pagato'
 * - residuo coperto solo da importi in pagamento → 'in_pagamento'
 */
/**
 * Calcolo erogabile/residuo del progetto. I tuoi dati non superano mai il cap
 * dell'allocato: l'importo erogabile è il minore tra il verificato al
 * percentualeRimborso e l'allocato.
 *
 * @param {Object} row - Riga Verifica (allocato, totaleVerificato, totalePagato,
 *                       totaleInPagamento, percentualeRimborso, giustificativi)
 * @returns {{erogabile: number, pagato: number, residuo: number}}
 */
function calcoloErogabile(row) {
  const allocato = Number.parseFloat(row.allocato) || 0
  // Il campo di riga (aggregato DB) è la fonte canonica; ma per progetti creati
  // di fresco il trigger non ha ancora ricalcolato `totaleVerificato` (resta 0),
  // quindi si ripiega sulla somma dei giustificativi verificati della riga.
  const dbVerificato = Number.parseFloat(row.totaleVerificato) || 0
  const giustVerificato = (row.giustificativi || []).reduce(
    (acc, g) => (!g.Invalidato && g.Stato === 'verificato' ? acc + (Number.parseFloat(g.Importo) || 0) : acc),
    0
  )
  const totaleVerificato = dbVerificato || giustVerificato
  const pct = Math.min(100, Math.max(0, Number.parseFloat(row.percentualeRimborso) || 80)) / 100
  const erogabile = Math.min(totaleVerificato * pct, allocato)
  const pagato = Number.parseFloat(row.totalePagato) || 0
  const inPagamento = Number.parseFloat(row.totaleInPagamento) || 0
  return { erogabile, pagato, residuo: Math.round((erogabile - pagato - inPagamento) * 100) / 100 }
}

/**
 * Residuo ancora da erogare per il progetto.
 *
 * @param {Object} row - Riga Verifica
 * @returns {number}
 */
export function residuoErogabile(row) {
  return calcoloErogabile(row).residuo
}

/**
 * Stato giustificativo derivato dal solo residuo di riga: un giustificativo
 * verificato su una riga "Pagato"/"In pagamento" mostra lo stato di riga
 * (badge derivato, nessuna scrittura DB). Altrimenti torna null.
 *
 * @param {Object|undefined} giustificativo
 * @param {string|undefined} statoRigaKey - key di calcolaStatoRiga
 * @returns {string|null} 'pagato' | 'in_pagamento' | null
 */
export function statoGiustificativoEff(giustificativo, statoRigaKey) {
  if (!giustificativo || giustificativo.Stato !== 'verificato') return null
  if (statoRigaKey === 'pagato' || statoRigaKey === 'in_pagamento') return statoRigaKey
  return null
}

/**
 * Stato di riga derivato (valori interni, non etichette).
 *
 * Ordine regole:
 * 1. Nessun importo rendicontato (vuoto / solo draft / solo rifiutati) → Non ricevuta
 * 2. Almeno un inviato → Da verificare (l'azione di verifica è la priorità)
 * 3. Dati bancari mancanti
 * 4. Tutti verificati → Pronto | Pagato | In pagamento (in base al residuo)
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
  if (giust.some(g => !g.Invalidato && g.Stato === 'inviato')) {
    return { key: 'da_verificare', label: 'Da verificare', color: 'orange' }
  }
  if (!row.iban || !row.intestatario) {
    return { key: 'dati_bancari', label: 'Dati bancari mancanti', color: 'warning' }
  }
  const valid = giust.filter(g => !g.Invalidato)
  if (valid.length > 0 && valid.every(g => g.Stato === 'verificato')) {
    const { erogabile, pagato, residuo } = calcoloErogabile(row)
    // Tolleranza di arrotondamento: un residuo di pochi centesimi (arrotondamento
    // sulle percentuali) equivale a "tutto coperto", non a "ancora da pagare".
    if (residuo <= 0.01) {
      if (pagato >= erogabile - 0.01) {
        return { key: 'pagato', label: 'Pagato', color: 'grey' }
      }
      return { key: 'in_pagamento', label: 'In pagamento', color: 'secondary' }
    }
    return { key: 'pronto', label: 'Pronto', color: 'positive' }
  }
  return { key: 'da_completare', label: 'Da completare', color: 'warning' }
}
