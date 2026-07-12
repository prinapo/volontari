/**
 * Regex per validazione IBAN (formato internazionale base)
 * @type {RegExp}
 */
export const IBAN_REGEX = /^[a-z]{2}\d{2}[\da-z]{11,30}$/i

/**
 * Regole di validazione per Q-Select / QInput
 * @type {Array<Function>}
 */
export const IBAN_RULES = [val => !val || IBAN_REGEX.test(val) || 'IBAN non valido']

/**
 * Sanifica un IBAN rimuovendo spazi e convertendo in maiuscolo
 * @param {string} val - IBAN da sanificare
 * @returns {string} IBAN sanificato
 */
export function sanitizeIBAN(val) {
  if (!val) return val
  return val.replaceAll(/\s/g, '').toUpperCase()
}
