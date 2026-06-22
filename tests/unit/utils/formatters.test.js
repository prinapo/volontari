import { describe, it, expect } from 'vitest'
import {
  formatCurrency,
  formatDate,
  statoLabel,
  statoColor,
  displayFullName
} from 'src/utils/formatters'

describe('formatCurrency', () => {
  it('formats a number to EUR', () => {
    expect(formatCurrency(100)).toBe('100,00\u00a0€')
  })

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('0,00\u00a0€')
  })

  it('returns fallback for null', () => {
    expect(formatCurrency(null)).toBe('€ 0,00')
  })

  it('returns fallback for undefined', () => {
    expect(formatCurrency(undefined)).toBe('€ 0,00')
  })

  it('formats decimal values', () => {
    const result = formatCurrency(1234.56)
    expect(result).toContain('€')
    expect(result).toContain('1234')
    expect(result).toContain('56')
  })
})

describe('formatDate', () => {
  it('formats an ISO date string', () => {
    const result = formatDate('2024-01-15')
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/)
  })

  it('returns empty for falsy input', () => {
    expect(formatDate(null)).toBe('')
    expect(formatDate(undefined)).toBe('')
    expect(formatDate('')).toBe('')
  })
})

describe('statoLabel', () => {
  it('returns Italian labels', () => {
    expect(statoLabel('draft')).toBe('Bozza')
    expect(statoLabel('inviato')).toBe('Inviato')
    expect(statoLabel('verificato')).toBe('Verificato')
    expect(statoLabel('rifiutato')).toBe('Rifiutato')
    expect(statoLabel('approvato')).toBe('Approvato')
  })

  it('returns the input as fallback for unknown states', () => {
    expect(statoLabel('unknown')).toBe('unknown')
  })
})

describe('statoColor', () => {
  it('returns Quasar color names', () => {
    expect(statoColor('draft')).toBe('warning')
    expect(statoColor('inviato')).toBe('primary')
    expect(statoColor('verificato')).toBe('positive')
    expect(statoColor('rifiutato')).toBe('negative')
    expect(statoColor('approvato')).toBe('positive')
  })

  it('returns grey for unknown states', () => {
    expect(statoColor('unknown')).toBe('grey')
  })
})

describe('displayFullName', () => {
  it('combines cognome and nome', () => {
    const row = { Cognome: 'Rossi', Nome: 'Mario' }
    expect(displayFullName(row)).toBe('Rossi Mario')
  })

  it('handles lowercase field names', () => {
    const row = { cognome: 'Bianchi', nome: 'Luca' }
    expect(displayFullName(row)).toBe('Bianchi Luca')
  })

  it('returns empty for empty row', () => {
    expect(displayFullName({})).toBe('')
  })

  it('uses nome_nome order when specified', () => {
    const row = { Cognome: 'Rossi', Nome: 'Mario' }
    expect(displayFullName(row, 'nome_nome')).toBe('Mario Rossi')
  })
})
