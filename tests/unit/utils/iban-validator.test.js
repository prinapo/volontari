import { describe, expect, it } from 'vitest'
import { IBAN_REGEX, IBAN_RULES, sanitizeIBAN } from 'src/utils/iban-validator'

describe('iban-validator', () => {
  it('sanitizes iban values by trimming spaces and uppercasing', () => {
    expect(sanitizeIBAN('it60 x054 2811 1010 0000 0123 456')).toBe('IT60X0542811101000000123456')
    expect(sanitizeIBAN('')).toBe('')
    expect(sanitizeIBAN(null)).toBe(null)
  })

  it('validates IBAN values through regex and reusable rule', () => {
    expect(IBAN_REGEX.test('IT60X0542811101000000123456')).toBe(true)
    expect(IBAN_REGEX.test('INVALID')).toBe(false)
    expect(IBAN_RULES[0]('')).toBe(true)
    expect(IBAN_RULES[0]('IT60X0542811101000000123456')).toBe(true)
    expect(IBAN_RULES[0]('INVALID')).toBe('IBAN non valido')
  })
})
