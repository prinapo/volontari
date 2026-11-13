export function computedTipi(row) {
  const tipi = []
  if (row.IsVolontario) tipi.push('Volontario')
  if (row.IsGenitore) tipi.push('Genitore')
  if (row.IsReferente) tipi.push('Referente')
  if (tipi.length === 0) tipi.push('Contatto')
  return tipi
}
