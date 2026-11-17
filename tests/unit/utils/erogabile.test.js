import { describe, it, expect } from 'vitest'
import { calcolaErogabile, normalizzaPercentuale, residuoDaCoprire } from 'src/utils/erogabile'

describe('normalizzaPercentuale', () => {
  it('usa 80 come default per valori assenti', () => {
    expect(normalizzaPercentuale()).toBe(80)
    expect(normalizzaPercentuale(null)).toBe(80)
    expect(normalizzaPercentuale('')).toBe(80)
    expect(normalizzaPercentuale('non-numerico')).toBe(80)
  })

  it('rispetta lo 0 (non è un valore mancante)', () => {
    expect(normalizzaPercentuale(0)).toBe(0)
    expect(normalizzaPercentuale('0')).toBe(0)
  })

  it('accetta 100 e valori intermedi', () => {
    expect(normalizzaPercentuale(100)).toBe(100)
    expect(normalizzaPercentuale('100')).toBe(100)
    expect(normalizzaPercentuale(75)).toBe(75)
  })

  it('limita fuori range a 0–100', () => {
    expect(normalizzaPercentuale(120)).toBe(100)
    expect(normalizzaPercentuale(-10)).toBe(0)
  })
})

describe('calcolaErogabile', () => {
  it('applica la percentuale di default (80%) al verificato', () => {
    expect(calcolaErogabile({ allocato: 5000, totaleVerificato: 1000 })).toBe(800)
  })

  it('con 100% eroga il verificato intero', () => {
    expect(calcolaErogabile({ allocato: 5000, totaleVerificato: 1000, percentualeRimborso: 100 })).toBe(1000)
  })

  it('non supera mai l allocato', () => {
    expect(calcolaErogabile({ allocato: 800, totaleVerificato: 3000, percentualeRimborso: 100 })).toBe(800)
    expect(calcolaErogabile({ allocato: 800, totaleVerificato: 3000, percentualeRimborso: 80 })).toBe(800)
  })

  it('con 0% l erogabile è zero (fallback 80 solo se mancante)', () => {
    expect(calcolaErogabile({ allocato: 5000, totaleVerificato: 1000, percentualeRimborso: 0 })).toBe(0)
  })

  it('gestisce allocato o verificato a zero', () => {
    expect(calcolaErogabile({ allocato: 0, totaleVerificato: 1000, percentualeRimborso: 100 })).toBe(0)
    expect(calcolaErogabile({ allocato: 5000, totaleVerificato: 0, percentualeRimborso: 100 })).toBe(0)
    expect(calcolaErogabile()).toBe(0)
  })

  it('accetta importi stringa (Directus)', () => {
    expect(calcolaErogabile({ allocato: '5000', totaleVerificato: '250.50', percentualeRimborso: '100' })).toBe(250.5)
  })
})

describe('residuoDaCoprire', () => {
  it('arrotonda ai centesimi', () => {
    expect(residuoDaCoprire(398 * 0.8, 318.4)).toBe(0)
    expect(residuoDaCoprire(1000, 800)).toBe(200)
    expect(residuoDaCoprire(800, 800)).toBe(0)
  })

  it('può essere negativo se si è pagato più dell erogabile', () => {
    expect(residuoDaCoprire(800, 900)).toBe(-100)
  })
})
