const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'

/**
 * Genera una password casuale crittograficamente sicura.
 * @param {number} [length=16]
 * @returns {string}
 */
export function generatePassword(length = 16) {
  const array = new Uint32Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, v => CHARS[v % CHARS.length]).join('')
}
