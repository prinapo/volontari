import { describe, it, expect } from 'vitest'
import { calcolaStatoRiga, residuoErogabile, statoGiustificativoEff } from 'src/utils/statoRiga'

const base = {
  allocato: 5000,
  totaleVerificato: 0,
  totalePagato: 0,
  totaleInPagamento: 0,
  percentualeRimborso: 80,
  iban: 'IT',
  intestatario: 'Mario'
}

describe('residuoErogabile', () => {
  it('returns erogabile minus gia pagato e in pagamento, cap al allocato', () => {
    expect(
      residuoErogabile({
        allocato: 5000,
        totaleVerificato: 100,
        totalePagato: 0,
        totaleInPagamento: 0,
        percentualeRimborso: 80
      })
    ).toBe(80)
    expect(
      residuoErogabile({
        allocato: 50,
        totaleVerificato: 100,
        totalePagato: 0,
        totaleInPagamento: 0,
        percentualeRimborso: 80
      })
    ).toBe(50)
    expect(
      residuoErogabile({
        allocato: 5000,
        totaleVerificato: 100,
        totalePagato: 40,
        totaleInPagamento: 10,
        percentualeRimborso: 80
      })
    ).toBe(30)
    expect(
      residuoErogabile({
        allocato: 5000,
        totaleVerificato: 100,
        totalePagato: 200,
        totaleInPagamento: 0,
        percentualeRimborso: 80
      })
    ).toBe(-120)
  })

  it('clamps percentualeRimborso and defaults missing', () => {
    expect(residuoErogabile({ allocato: 5000, totaleVerificato: 100, percentualeRimborso: 120 })).toBe(100)
    expect(residuoErogabile({ allocato: 5000, totaleVerificato: 100, percentualeRimborso: -10 })).toBe(0)
    expect(residuoErogabile({ allocato: 5000, totaleVerificato: 100 })).toBe(80)
  })

  it('fallback alla somma giustificativi verificati quando totaleVerificato aggregato è 0', () => {
    expect(
      residuoErogabile({
        allocato: 5000,
        totaleVerificato: 0,
        totalePagato: 0,
        totaleInPagamento: 0,
        percentualeRimborso: 80,
        giustificativi: [{ Stato: 'verificato', Invalidato: false, Importo: 50 }]
      })
    ).toBe(40)
    expect(
      residuoErogabile({
        allocato: 5000,
        totaleVerificato: 0,
        totalePagato: 0,
        totaleInPagamento: 0,
        percentualeRimborso: 80,
        giustificativi: [
          { Stato: 'verificato', Invalidato: false, Importo: 50 },
          { Stato: 'verificato', Invalidato: true, Importo: 999 },
          { Stato: 'draft', Invalidato: false, Importo: 999 }
        ]
      })
    ).toBe(40)
  })
})

describe('statoGiustificativoEff', () => {
  it('deriva lo stato di riga per giustificativi verificati', () => {
    expect(statoGiustificativoEff({ Stato: 'verificato', Invalidato: false }, 'pagato')).toBe('pagato')
    expect(statoGiustificativoEff({ Stato: 'verificato', Invalidato: false }, 'in_pagamento')).toBe('in_pagamento')
    expect(statoGiustificativoEff({ Stato: 'verificato', Invalidato: false }, 'pronto')).toBe(null)
  })

  it('null per giustificativi non verificati o assenti', () => {
    expect(statoGiustificativoEff({ Stato: 'inviato' }, 'pagato')).toBe(null)
    expect(statoGiustificativoEff({ Stato: 'draft' }, 'in_pagamento')).toBe(null)
    expect(statoGiustificativoEff(undefined, 'pagato')).toBe(null)
    expect(statoGiustificativoEff(null, 'pagato')).toBe(null)
    expect(statoGiustificativoEff({ Stato: 'verificato' })).toBe(null)
  })
})

describe('calcolaStatoRiga', () => {
  it('Non ricevuta quando nessun importo rendicontato', () => {
    expect(calcolaStatoRiga({ ...base, totaleRendicontato: 0, giustificativi: [] })).toMatchObject({
      label: 'Non ricevuta',
      color: 'grey',
      key: 'nessuno'
    })
    expect(calcolaStatoRiga({ ...base, totaleRendicontato: 0, giustificativi: [{ Stato: 'draft' }] })).toMatchObject({
      label: 'Non ricevuta',
      color: 'grey'
    })
    expect(
      calcolaStatoRiga({
        ...base,
        totaleRendicontato: 0,
        giustificativi: [{ Stato: 'rifiutato', Invalidato: false }]
      })
    ).toMatchObject({ label: 'Non ricevuta', color: 'grey' })
  })

  it('return undefined senza row', () => {
    expect(calcolaStatoRiga()).toMatchObject({ label: 'Non ricevuta', color: 'grey' })
  })

  it('Dati bancari mancanti', () => {
    expect(
      calcolaStatoRiga({
        ...base,
        iban: '',
        intestatario: '',
        totaleRendicontato: 100,
        giustificativi: [{ Stato: 'verificato', Invalidato: false }]
      })
    ).toMatchObject({ label: 'Dati bancari mancanti', color: 'warning' })
  })

  it('Da verificare con almeno un inviato', () => {
    expect(
      calcolaStatoRiga({
        ...base,
        totaleRendicontato: 100,
        giustificativi: [{ Stato: 'inviato', Invalidato: false }]
      })
    ).toMatchObject({ label: 'Da verificare', color: 'orange' })
    expect(
      calcolaStatoRiga({
        ...base,
        totaleRendicontato: 100,
        giustificativi: [
          { Stato: 'verificato', Invalidato: false },
          { Stato: 'inviato', Invalidato: false }
        ]
      })
    ).toMatchObject({ label: 'Da verificare', color: 'orange' })
  })

  it('Da verificare ha priorità sui dati bancari mancanti', () => {
    expect(
      calcolaStatoRiga({
        ...base,
        iban: '',
        intestatario: '',
        totaleRendicontato: 100,
        giustificativi: [{ Stato: 'inviato', Invalidato: false }]
      })
    ).toMatchObject({ label: 'Da verificare', color: 'orange' })
  })

  it('Pronto quando tutto verificato e con residuo', () => {
    expect(
      calcolaStatoRiga({
        ...base,
        totaleRendicontato: 100,
        totaleVerificato: 100,
        giustificativi: [{ Stato: 'verificato', Invalidato: false, Importo: 50 }]
      })
    ).toMatchObject({ label: 'Pronto', color: 'positive' })
  })

  it("Pronto quando l'aggregato DB totaleVerificato non è ancora calcolato (fallback sui giustificativi)", () => {
    expect(
      calcolaStatoRiga({
        ...base,
        totaleRendicontato: 100,
        totaleVerificato: 0,
        giustificativi: [{ Stato: 'verificato', Invalidato: false, Importo: 50 }]
      })
    ).toMatchObject({ label: 'Pronto', color: 'positive' })
  })

  it('Pagato quando tutto verificato e residuo esaurito', () => {
    expect(
      calcolaStatoRiga({
        ...base,
        totaleRendicontato: 100,
        totaleVerificato: 100,
        totalePagato: 100,
        giustificativi: [{ Stato: 'verificato', Invalidato: false }]
      })
    ).toMatchObject({ label: 'Pagato', color: 'grey', key: 'pagato' })
  })

  it('In pagamento quando residuo coperto solo da importi in pagamento (pagato=0)', () => {
    expect(
      calcolaStatoRiga({
        ...base,
        totaleRendicontato: 100,
        totaleVerificato: 100,
        totalePagato: 0,
        totaleInPagamento: 80,
        giustificativi: [{ Stato: 'verificato', Invalidato: false }]
      })
    ).toMatchObject({ label: 'In pagamento', color: 'secondary', key: 'in_pagamento' })
  })

  it('In pagamento quando pagato parte del residuo e il resto è in pagamento', () => {
    expect(
      calcolaStatoRiga({
        ...base,
        totaleRendicontato: 100,
        totaleVerificato: 100,
        totalePagato: 40,
        totaleInPagamento: 40,
        giustificativi: [{ Stato: 'verificato', Invalidato: false }]
      })
    ).toMatchObject({ label: 'In pagamento', color: 'secondary', key: 'in_pagamento' })
  })

  it('Da completare con mix draft + verificato', () => {
    expect(
      calcolaStatoRiga({
        ...base,
        totaleRendicontato: 100,
        giustificativi: [
          { Stato: 'draft', Invalidato: false },
          { Stato: 'verificato', Invalidato: false }
        ]
      })
    ).toMatchObject({ label: 'Da completare', color: 'warning' })
  })
})
