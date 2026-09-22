import { describe, expect, it } from 'vitest'
import { calcolaViolazioniEmailPrimarie } from 'src/utils/emailPrimarie'

describe('calcolaViolazioniEmailPrimarie', () => {
  it('senza email non segnala nulla', () => {
    expect(calcolaViolazioniEmailPrimarie([])).toEqual({ duplicati: [], senzaPrimaria: [] })
  })

  it('una sola primaria per contatto è conforme', () => {
    const emails = [
      { id: 1, Primary: true, contattoId: 'A' },
      { id: 2, Primary: false, contattoId: 'A' }
    ]
    expect(calcolaViolazioniEmailPrimarie(emails)).toEqual({ duplicati: [], senzaPrimaria: [] })
  })

  it('più primarie: mantiene quella con id minore', () => {
    const emails = [
      { id: 30, Primary: true, contattoId: 'A' },
      { id: 10, Primary: true, contattoId: 'A' },
      { id: 20, Primary: true, contattoId: 'A' }
    ]
    expect(calcolaViolazioniEmailPrimarie(emails)).toEqual({
      duplicati: [{ contattoId: 'A', keepId: 10, extraIds: [20, 30] }],
      senzaPrimaria: []
    })
  })

  it('zero primarie: promuove quella con id minore', () => {
    const emails = [
      { id: 5, Primary: false, contattoId: 'B' },
      { id: 3, Primary: false, contattoId: 'B' }
    ]
    expect(calcolaViolazioniEmailPrimarie(emails)).toEqual({
      duplicati: [],
      senzaPrimaria: [{ contattoId: 'B', keepId: 3 }]
    })
  })

  it('ignora email senza contatto', () => {
    const emails = [
      { id: 1, Primary: true, contattoId: null },
      { id: 2, Primary: true, contattoId: 'C' }
    ]
    expect(calcolaViolazioniEmailPrimarie(emails)).toEqual({ duplicati: [], senzaPrimaria: [] })
  })

  it('gestisce più contatti insieme', () => {
    const emails = [
      { id: 1, Primary: true, contattoId: 'A' },
      { id: 2, Primary: true, contattoId: 'A' },
      { id: 3, Primary: false, contattoId: 'B' }
    ]
    const result = calcolaViolazioniEmailPrimarie(emails)
    expect(result.duplicati).toEqual([{ contattoId: 'A', keepId: 1, extraIds: [2] }])
    expect(result.senzaPrimaria).toEqual([{ contattoId: 'B', keepId: 3 }])
  })
})
