import { describe, it, expect } from 'vitest'
import { calcolaDisallineati, calcolaStatoProgetto, statoProgettoEffettivo } from 'src/utils/statoProgetto'

describe('calcolaStatoProgetto', () => {
  const giust = [{ Stato: 'verificato' }]

  describe('fasi manuali', () => {
    it('lascia invariato proposito', () => {
      expect(
        calcolaStatoProgetto({ statoProgetto: 'proposto', allocato: 1000, rimborsato: 0, giustificativi: giust })
      ).toBe('proposto')
    })

    it('lascia invariato validato', () => {
      expect(
        calcolaStatoProgetto({ statoProgetto: 'validato', allocato: 1000, rimborsato: 0, giustificativi: giust })
      ).toBe('validato')
    })

    it('lascia invariato approvato', () => {
      expect(
        calcolaStatoProgetto({ statoProgetto: 'approvato', allocato: 1000, rimborsato: 0, giustificativi: giust })
      ).toBe('approvato')
    })

    it('non applica il flusso automatico alle fasi manuali anche se pagato=allocato', () => {
      expect(
        calcolaStatoProgetto({ statoProgetto: 'proposto', allocato: 100, rimborsato: 100, giustificativi: giust })
      ).toBe('proposto')
    })
  })

  describe('legacy aperto', () => {
    it('traduce aperto in accettato senza giustificativi', () => {
      expect(calcolaStatoProgetto({ statoProgetto: 'aperto', allocato: 1000, rimborsato: 0 })).toBe('accettato')
    })

    it('traduce assenza valore in accettato', () => {
      expect(calcolaStatoProgetto({ allocato: 1000, rimborsato: 0 })).toBe('accettato')
    })
  })

  describe('chiusura per pagamento completo', () => {
    it('chiuso quando rimborsato = allocato', () => {
      expect(
        calcolaStatoProgetto({
          statoProgetto: 'in_rendicontazione',
          allocato: 500,
          rimborsato: 500,
          giustificativi: giust
        })
      ).toBe('chiuso')
    })

    it('chiuso quando rimborsato > allocato (arrotondamenti)', () => {
      expect(
        calcolaStatoProgetto({ statoProgetto: 'accettato', allocato: 500, rimborsato: 500.01, giustificativi: giust })
      ).toBe('chiuso')
    })

    it('non chiude se allocato è 0', () => {
      expect(
        calcolaStatoProgetto({ statoProgetto: 'accettato', allocato: 0, rimborsato: 100, giustificativi: giust })
      ).toBe('in_rendicontazione')
    })
  })

  describe('stati finali non tornano indietro automaticamente', () => {
    it('mantiene chiuso anche se i giustificativi vengono invalidati', () => {
      expect(
        calcolaStatoProgetto({
          statoProgetto: 'chiuso',
          allocato: 500,
          rimborsato: 500,
          giustificativi: [{ Stato: 'verificato', Invalidato: true }]
        })
      ).toBe('chiuso')
    })

    it('mantiene rimborso_parziale', () => {
      expect(
        calcolaStatoProgetto({
          statoProgetto: 'rimborso_parziale',
          allocato: 500,
          rimborsato: 300,
          giustificativi: giust
        })
      ).toBe('rimborso_parziale')
    })
  })

  describe('rimborso_parziale automatico', () => {
    it('NULL con pagamento parziale assume rimborso_parziale', () => {
      expect(calcolaStatoProgetto({ allocato: 1000, rimborsato: 300 })).toBe('rimborso_parziale')
    })

    it('accettato con pagamento parziale assume rimborso_parziale', () => {
      expect(calcolaStatoProgetto({ statoProgetto: 'accettato', allocato: 1000, rimborsato: 176 })).toBe(
        'rimborso_parziale'
      )
    })

    it('in_rendicontazione con pagamento parziale assume rimborso_parziale', () => {
      expect(
        calcolaStatoProgetto({
          statoProgetto: 'in_rendicontazione',
          allocato: 1000,
          rimborsato: 176,
          giustificativi: giust
        })
      ).toBe('rimborso_parziale')
    })

    it('chiuso con pagato < allocato retrocede a rimborso_parziale', () => {
      expect(calcolaStatoProgetto({ statoProgetto: 'chiuso', allocato: 875, rimborsato: 176 })).toBe(
        'rimborso_parziale'
      )
    })

    it('rimborso_parziale che completa il pagamento avanza a chiuso', () => {
      expect(calcolaStatoProgetto({ statoProgetto: 'rimborso_parziale', allocato: 875, rimborsato: 875 })).toBe(
        'chiuso'
      )
    })
  })

  describe('in_rendicontazione', () => {
    it('passa a in_rendicontazione con prima fattura', () => {
      expect(
        calcolaStatoProgetto({ statoProgetto: 'accettato', allocato: 500, rimborsato: 0, giustificativi: giust })
      ).toBe('in_rendicontazione')
    })

    it('resta in_rendicontazione con giustificativi presenti', () => {
      expect(
        calcolaStatoProgetto({
          statoProgetto: 'in_rendicontazione',
          allocato: 500,
          rimborsato: 0,
          giustificativi: giust
        })
      ).toBe('in_rendicontazione')
    })
  })

  describe('ritorno ad accettato', () => {
    it('torna ad accettato quando tutti i giustificativi sono invalidati e mai chiuso', () => {
      expect(
        calcolaStatoProgetto({
          statoProgetto: 'in_rendicontazione',
          allocato: 500,
          rimborsato: 0,
          giustificativi: [{ Stato: 'verificato', Invalidato: true }]
        })
      ).toBe('accettato')
    })
  })
})

describe('statoProgettoEffettivo', () => {
  it('normalizza NULL in accettato', () => {
    expect(statoProgettoEffettivo(null)).toBe('accettato')
  })

  it('normalizza aperto in accettato', () => {
    expect(statoProgettoEffettivo('aperto')).toBe('accettato')
  })

  it('lascia invariati gli stati manuali', () => {
    expect(statoProgettoEffettivo('proposto')).toBe('proposto')
    expect(statoProgettoEffettivo('validato')).toBe('validato')
  })

  it('lascia invariati gli stati automatizzati', () => {
    expect(statoProgettoEffettivo('in_rendicontazione')).toBe('in_rendicontazione')
    expect(statoProgettoEffettivo('chiuso')).toBe('chiuso')
    expect(statoProgettoEffettivo('rimborso_parziale')).toBe('rimborso_parziale')
  })
})

describe('calcolaDisallineati', () => {
  const row = extra => ({
    idProgetto: 'p1',
    beneficiario: 'Rossi Mario',
    statoProgetto: 'accettato',
    allocato: 1000,
    totalePagato: 0,
    giustificativi: [],
    ...extra
  })

  it('restituisce lista vuota quando tutti i progetti sono allineati', () => {
    expect(
      calcolaDisallineati([
        row({ statoProgetto: 'accettato', giustificativi: [] }),
        row({ idProgetto: 'p2', statoProgetto: 'in_rendicontazione', giustificativi: [{ Stato: 'verificato' }] })
      ])
    ).toEqual([])
  })

  it('segnala un progetto con pagamento parziale ma stato accettato', () => {
    const res = calcolaDisallineati([row({ statoProgetto: 'accettato', totalePagato: 300 })])
    expect(res).toHaveLength(1)
    expect(res[0]).toMatchObject({ idProgetto: 'p1', statoDB: 'accettato', statoCalcolato: 'rimborso_parziale' })
  })

  it('segnala un progetto legacy NULL che ha giustificativi', () => {
    const res = calcolaDisallineati([row({ statoProgetto: 'accettato', giustificativi: [{ Stato: 'verificato' }] })])
    expect(res).toHaveLength(1)
    expect(res[0]).toMatchObject({ statoDB: 'accettato', statoCalcolato: 'in_rendicontazione' })
  })

  it('non segnala il pagamento completo se il progetto è già chiuso', () => {
    expect(calcolaDisallineati([row({ statoProgetto: 'chiuso', totalePagato: 1000, giustificativi: [] })])).toEqual([])
  })

  it('ignora gli stati manuali', () => {
    expect(calcolaDisallineati([row({ statoProgetto: 'proposto', allocato: 1000, totalePagato: 1000 })])).toEqual([])
  })

  it('gestisce input vuoto', () => {
    expect(calcolaDisallineati([])).toEqual([])
  })
})
