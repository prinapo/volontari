import { describe, expect, it } from 'vitest'
import { calcolaDisallineatiLoginPrimaria, calcolaViolazioniEmailPrimarie } from 'src/utils/emailPrimarie'

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

  it('preferisce la primaria che coincide con l email di login', () => {
    const emails = [
      { id: 10, email_address: 'vecchia@x.it', Primary: true, contattoId: 'A' },
      { id: 20, email_address: 'login@x.it', Primary: true, contattoId: 'A' }
    ]
    const login = new Map([['A', 'login@x.it']])
    expect(calcolaViolazioniEmailPrimarie(emails, login)).toEqual({
      duplicati: [{ contattoId: 'A', keepId: 20, extraIds: [10] }],
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
})

describe('calcolaDisallineatiLoginPrimaria', () => {
  it('segnala login diversa dalla primaria', () => {
    const rows = [
      { contattoId: 'A', loginEmail: 'a@x.it', primaryEmail: 'b@x.it' },
      { contattoId: 'B', loginEmail: 'c@x.it', primaryEmail: 'c@x.it' }
    ]
    expect(calcolaDisallineatiLoginPrimaria(rows)).toEqual([
      { contattoId: 'A', loginEmail: 'a@x.it', primaryEmail: 'b@x.it' }
    ])
  })

  it('ignora righe senza login o senza primaria', () => {
    expect(calcolaDisallineatiLoginPrimaria([{ contattoId: 'A', loginEmail: null, primaryEmail: 'x' }])).toEqual([])
    expect(calcolaDisallineatiLoginPrimaria([{ contattoId: 'A', loginEmail: 'x', primaryEmail: null }])).toEqual([])
  })
})
