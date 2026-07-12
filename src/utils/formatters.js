/**
 * Formatta un valore numerico in valuta EUR (es. € 1.234,56)
 * @param {number|string} value - Importo da formattare
 * @returns {string} Valore formattato
 */
export function formatCurrency(value) {
  if (value == null || Number.isNaN(Number(value))) return '€ 0,00'
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR'
  }).format(value)
}

/**
 * Converte una stringa ISO in data italiana (GG/MM/AAAA)
 * @param {string} dateStr - Data in formato ISO
 * @returns {string} Data formattata
 */
export function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

/**
 * Restituisce l'etichetta testuale per uno stato giustificativo
 * @param {string} stato - Codice stato (draft|inviato|verificato|rifiutato)
 * @returns {string} Etichetta in italiano
 */
export function statoLabel(stato) {
  const labels = {
    draft: 'Bozza',
    inviato: 'Inviato',
    verificato: 'Verificato',
    rifiutato: 'Rifiutato'
  }
  return labels[stato] || stato
}

/**
 * Restituisce il colore Quasar per uno stato giustificativo
 * @param {string} stato - Codice stato
 * @returns {string} Nome colore Quasar
 */
export function statoColor(stato) {
  const colors = {
    draft: 'warning',
    inviato: 'primary',
    verificato: 'positive',
    rifiutato: 'negative'
  }
  return colors[stato] || 'grey'
}

/**
 * Compone nome e cognome da un oggetto contatto/persona
 * @param {Object} row - Oggetto con Nome/Cognome o nome/cognome
 * @param {string} [order='cognome_nome'] - Ordine (cognome_nome | nome_cognome)
 * @returns {string} Nome completo
 */
export function displayFullName(row, order = 'cognome_nome') {
  const nome = row?.Nome || row?.nome || ''
  const cognome = row?.Cognome || row?.cognome || ''
  if (!nome && !cognome) return ''
  if (order === 'cognome_nome') return `${cognome} ${nome}`.trim()
  return `${nome} ${cognome}`.trim()
}
