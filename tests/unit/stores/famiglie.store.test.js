import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useFamiglieStore } from 'src/stores/famiglie.store'

const mockGetFamiglieByVolontario = vi.fn()
const mockGetById = vi.fn()
const mockGetGenitoriByFamiglia = vi.fn()
const mockGetVolontariByFamiglia = vi.fn()
const mockUpdate = vi.fn()
const mockGetByContatto = vi.fn()
const mockGetByVolontari = vi.fn()

vi.mock('src/services/famiglie.service', () => ({
  famiglieService: {
    getFamiglieByVolontario: (...args) => mockGetFamiglieByVolontario(...args),
    getById: (...args) => mockGetById(...args),
    getGenitoriByFamiglia: (...args) => mockGetGenitoriByFamiglia(...args),
    getVolontariByFamiglia: (...args) => mockGetVolontariByFamiglia(...args),
    update: (...args) => mockUpdate(...args)
  }
}))

vi.mock('src/services/email.service', () => ({
  emailService: {
    getByContatto: (...args) => mockGetByContatto(...args)
  }
}))

vi.mock('src/services/referenti.service', () => ({
  referentiService: {
    getByVolontari: (...args) => mockGetByVolontari(...args)
  }
}))

vi.mock('stores/auth.store', () => ({
  useAuthStore: () => ({
    contattoId: 'current-contatto'
  })
}))

describe('famiglie store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('has correct defaults', () => {
      const store = useFamiglieStore()
      expect(store.famiglieContatti).toEqual([])
      expect(store.famiglia).toBeNull()
      expect(store.loading).toBe(false)
      expect(store.saving).toBe(false)
      expect(store.error).toBeNull()
    })
  })

  describe('init', () => {
    it('loads famiglie from contattoId', async () => {
      mockGetFamiglieByVolontario.mockResolvedValue({
        data: {
          data: [
            {
              Famiglia: { id_famiglia: 1, Nome_Famiglia: 'Famiglia Test' }
            }
          ]
        }
      })
      mockGetById.mockResolvedValue({
        data: {
          data: {
            id_famiglia: 1,
            Nome_Famiglia: 'Famiglia Test',
            Progetti: [{ id_progetto: 10, nome: 'Progetto 1' }],
            IBAN: '',
            Intestatario_CC: ''
          }
        }
      })
      mockGetGenitoriByFamiglia.mockResolvedValue({ data: { data: [] } })
      mockGetVolontariByFamiglia.mockResolvedValue({ data: { data: [] } })

      const store = useFamiglieStore()
      await store.init('contatto-1')

      expect(mockGetFamiglieByVolontario).toHaveBeenCalledWith('contatto-1')
      expect(store.famiglieContatti).toHaveLength(1)
      expect(store.famiglia.Nome_Famiglia).toBe('Famiglia Test')
      expect(store.loading).toBe(false)
    })

    it('does not load famiglia when multiple famiglie', async () => {
      mockGetFamiglieByVolontario.mockResolvedValue({
        data: {
          data: [{ Famiglia: { id_famiglia: 1 } }, { Famiglia: { id_famiglia: 2 } }]
        }
      })

      const store = useFamiglieStore()
      await store.init('contatto-1')

      expect(mockGetById).not.toHaveBeenCalled()
      expect(store.famiglia).toBeNull()
    })

    it('handles fetch error gracefully', async () => {
      mockGetFamiglieByVolontario.mockRejectedValue({
        response: { data: { errors: [{ message: 'Forbidden' }] } }
      })

      const store = useFamiglieStore()
      await store.init('contatto-1')

      expect(store.famiglieContatti).toEqual([])
      expect(store.error).toBe('Forbidden')
    })
  })

  describe('selectFamiglia', () => {
    it('loads the selected family', async () => {
      mockGetById.mockResolvedValue({
        data: {
          data: {
            id_famiglia: 5,
            Nome_Famiglia: 'Altri',
            Progetti: [{ id_progetto: 20 }]
          }
        }
      })
      mockGetGenitoriByFamiglia.mockResolvedValue({ data: { data: [] } })
      mockGetVolontariByFamiglia.mockResolvedValue({ data: { data: [] } })

      const store = useFamiglieStore()
      await store.selectFamiglia(5)

      expect(mockGetById).toHaveBeenCalledWith(5)
      expect(store.selectedFamigliaId).toBe(5)
      expect(store.famiglia.Nome_Famiglia).toBe('Altri')
    })
  })

  describe('getters and selection helpers', () => {
    it('exposes famiglia-related getters', () => {
      const store = useFamiglieStore()
      store.famiglieContatti = [
        { Famiglia: { id_famiglia: 1, Nome_Famiglia: 'Famiglia Uno' } },
        { Famiglia: { id_famiglia: 2, Nome_Famiglia: 'Famiglia Due' } }
      ]
      store.famiglia = {
        Nome_Famiglia: 'Famiglia Uno',
        IBAN: 'IT00X',
        Intestatario_CC: 'Mario Rossi',
        Progetti: [{ id_progetto: 10 }, { id_progetto: 20 }]
      }
      store.selectedProgettoId = 20

      expect(store.famigliaOptions).toEqual([
        { label: 'Famiglia Uno', value: 1 },
        { label: 'Famiglia Due', value: 2 }
      ])
      expect(store.progetti).toHaveLength(2)
      expect(store.selectedProgetto).toEqual({ id_progetto: 20 })
      expect(store.famigliaName).toBe('Famiglia Uno')
      expect(store.iban).toBe('IT00X')
      expect(store.intestatarioCC).toBe('Mario Rossi')

      store.selectProgetto(10)
      expect(store.selectedProgettoId).toBe(10)
    })
  })

  describe('hasMultipleFamiglie getter', () => {
    it('returns true when multiple families exist', () => {
      const store = useFamiglieStore()
      store.famiglieContatti = [{ id: 1 }, { id: 2 }]
      expect(store.hasMultipleFamiglie).toBe(true)
    })

    it('returns false for single family', () => {
      const store = useFamiglieStore()
      store.famiglieContatti = [{ id: 1 }]
      expect(store.hasMultipleFamiglie).toBe(false)
    })
  })

  describe('checkAccess and contacts loading', () => {
    it('checkAccess returns true when at least one family exists', async () => {
      mockGetFamiglieByVolontario.mockResolvedValue({ data: { data: [{ Famiglia: { id_famiglia: 1 } }] } })
      const store = useFamiglieStore()
      const ok = await store.checkAccess('cont-1')
      expect(ok).toBe(true)
      expect(store.famiglieContatti).toHaveLength(1)
    })

    it('checkAccess returns false on missing contatto or service error', async () => {
      const store = useFamiglieStore()
      expect(await store.checkAccess(null)).toBe(false)

      mockGetFamiglieByVolontario.mockRejectedValue(new Error('boom'))
      expect(await store.checkAccess('cont-1')).toBe(false)
      expect(store.famiglieContatti).toEqual([])
    })

    it('loadGenitori enriches emails and handles enrichment/service failure', async () => {
      mockGetGenitoriByFamiglia.mockResolvedValue({
        data: {
          data: [{ Contatto: { id_contatto: 'g1', Nome: 'Anna', Cognome: 'Verdi' } }]
        }
      })
      mockGetByContatto.mockResolvedValueOnce({
        data: { data: [{ Contatto_Relation: 'g1', email_address: 'anna@test.it', Primary: true }] }
      })

      const store = useFamiglieStore()
      await store.loadGenitori('fam-1')
      expect(store.genitori[0]._emails[0].email_address).toBe('anna@test.it')

      mockGetByContatto.mockRejectedValueOnce(new Error('boom'))
      await store.loadGenitori('fam-1')
      expect(store.genitori[0]._emails).toEqual([])

      mockGetGenitoriByFamiglia.mockRejectedValueOnce(new Error('service down'))
      await store.loadGenitori('fam-1')
      expect(store.genitori).toEqual([])
    })

    it('loadVolontari filters current user, enriches emails/referenti, and handles failures', async () => {
      mockGetVolontariByFamiglia.mockResolvedValue({
        data: {
          data: [
            { Contatto: { id_contatto: 'current-contatto', Nome: 'Io', Cognome: 'Corrente' } },
            { Contatto: { id_contatto: 'v2', Nome: 'Luca', Cognome: 'Bianchi' } }
          ]
        }
      })
      mockGetByContatto.mockResolvedValueOnce({
        data: { data: [{ Contatto_Relation: 'v2', email_address: 'luca@test.it', Primary: true }] }
      })
      mockGetByVolontari.mockResolvedValueOnce({
        data: {
          data: [{ id: 'rel-1', Volontario: 'v2', Referente: { id_contatto: 'r1', Nome: 'Ref', Cognome: 'Uno' } }]
        }
      })

      const store = useFamiglieStore()
      await store.loadVolontari('fam-1')
      expect(store.altriVolontari).toHaveLength(1)
      expect(store.altriVolontari[0]._emails[0].email_address).toBe('luca@test.it')
      expect(store.altriVolontari[0]._referenti[0].id_contatto).toBe('r1')

      mockGetVolontariByFamiglia.mockResolvedValueOnce({
        data: { data: [{ Contatto: { id_contatto: 'v3', Nome: 'Sara', Cognome: 'Blu' } }] }
      })
      mockGetByContatto.mockRejectedValueOnce(new Error('no emails'))
      mockGetByVolontari.mockRejectedValueOnce(new Error('no referenti'))
      await store.loadVolontari('fam-1')
      expect(store.altriVolontari).toEqual([
        expect.objectContaining({ id_contatto: 'v3', _emails: [], _referenti: [] })
      ])

      mockGetVolontariByFamiglia.mockRejectedValueOnce(new Error('boom'))
      await store.loadVolontari('fam-2')
      expect(store.altriVolontari).toEqual([])
    })

    it('loadFamiglia stores service error when family load fails', async () => {
      mockGetById.mockRejectedValue({ response: { data: { errors: [{ message: 'No famiglia' }] } } })
      const store = useFamiglieStore()
      await store.loadFamiglia('fam-x')
      expect(store.error).toBe('No famiglia')
    })
  })

  describe('updateIBAN', () => {
    it('updates IBAN and intestatario', async () => {
      mockUpdate.mockResolvedValue({
        data: { data: { IBAN: 'IT00X', Intestatario_CC: 'Mario Rossi' } }
      })

      const store = useFamiglieStore()
      store.famiglia = {
        id_famiglia: 1,
        IBAN: '',
        Intestatario_CC: '',
        Progetti: []
      }

      const result = await store.updateIBAN('IT00X', 'Mario Rossi')

      expect(result).toBe(true)
      expect(store.famiglia.IBAN).toBe('IT00X')
      expect(store.famiglia.Intestatario_CC).toBe('Mario Rossi')
      expect(store.saving).toBe(false)
    })

    it('returns false when no famiglia loaded', async () => {
      const store = useFamiglieStore()
      const result = await store.updateIBAN('IT00X', 'Mario Rossi')
      expect(result).toBe(false)
    })

    it('handles error', async () => {
      mockUpdate.mockRejectedValue({
        response: { data: { errors: [{ message: 'Validation error' }] } }
      })

      const store = useFamiglieStore()
      store.famiglia = { id_famiglia: 1, IBAN: '', Intestatario_CC: '' }

      const result = await store.updateIBAN('IT00X', 'Mario Rossi')

      expect(result).toBe(false)
      expect(store.error).toBe('Validation error')
    })
  })
})
