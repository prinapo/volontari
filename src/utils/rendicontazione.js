export function calcolaStatoRendicontazione(giustificativi) {
  const stati = giustificativi.filter(g => !g.Invalidato).map(g => String(g.Stato || '').toLowerCase())
  if (stati.length === 0) return 'nessuno'
  if (stati.every(s => s === 'draft' || s === '')) return 'bozza'
  if (stati.every(s => s === 'verificato')) return 'verificato'
  if (stati.includes('inviato')) return 'in_attesa'
  return 'parziale'
}
