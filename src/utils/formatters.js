export function formatCurrency(value) {
  if (value == null || isNaN(value)) return '€ 0,00'
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR'
  }).format(value)
}

export function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

export function statoLabel(stato) {
  const labels = {
    draft: 'Bozza',
    inviato: 'Inviato',
    verificato: 'Verificato',
    rifiutato: 'Rifiutato',
    approvato: 'Approvato'
  }
  return labels[stato] || stato
}

export function statoColor(stato) {
  const colors = {
    draft: 'warning',
    inviato: 'primary',
    verificato: 'positive',
    rifiutato: 'negative',
    approvato: 'positive'
  }
  return colors[stato] || 'grey'
}
