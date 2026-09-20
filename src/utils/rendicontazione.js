import { STATI_GIUSTIFICATIVO_CONTABILI } from './constants'

/**
 * Calcola lo stato di rendicontazione in base ai giustificativi
 * @param {Array<{Stato?: string, Invalidato?: boolean}>} giustificativi - Lista giustificativi
 * @returns {string} 'nessuno' | 'bozza' | 'verificato' | 'in_attesa' | 'parziale'
 */
export function calcolaStatoRendicontazione(giustificativi) {
  const contabili = new Set(STATI_GIUSTIFICATIVO_CONTABILI)
  const stati = giustificativi.filter(g => !g.Invalidato).map(g => String(g.Stato || '').toLowerCase())
  if (stati.length === 0) return 'nessuno'
  if (stati.every(s => s === 'draft' || s === '')) return 'bozza'
  if (stati.every(s => contabili.has(s))) return 'verificato'
  if (stati.includes('inviato')) return 'in_attesa'
  return 'parziale'
}
