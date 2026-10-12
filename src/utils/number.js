/**
 * Converte un valore in numero, con fallback 0 per input non numerici.
 * @param {unknown} value
 * @returns {number}
 */
export function parseNum(value) {
  return Number.parseFloat(value) || 0
}
