export const IBAN_REGEX = /^[a-z]{2}\d{2}[\da-z]{11,30}$/i

export const IBAN_RULES = [val => !val || IBAN_REGEX.test(val) || 'IBAN non valido']

export function sanitizeIBAN(val) {
  if (!val) return val
  return val.replaceAll(/\s/g, '').toUpperCase()
}
