/**
 * Estrae l'id/scalar da una relazione Directus M2O (numero oppure oggetto).
 * @param {unknown} value
 * @returns {string|number|null}
 */
export function relId(value) {
  if (value == null) return null
  if (typeof value === 'object') return value.id ?? value.id_contatto ?? value.id_famiglia ?? value.id_progetto ?? null
  return value
}
