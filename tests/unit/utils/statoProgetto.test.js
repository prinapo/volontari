import { describe, it, expect } from 'vitest'
import { calcolaStatoProgetto } from 'src/utils/statoProgetto'

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
