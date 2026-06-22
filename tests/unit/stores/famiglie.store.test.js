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
          data: [
            { Famiglia: { id_famiglia: 1 } },
            { Famiglia: { id_famiglia: 2 } }
          ]
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
