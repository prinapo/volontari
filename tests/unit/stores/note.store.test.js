import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useNoteStore } from 'src/stores/note.store'

const mockGetByProgetto = vi.fn()
const mockCreate = vi.fn()

vi.mock('src/services/note-progetti.service', () => ({
  noteProgettiService: {
    getByProgetto: (...a) => mockGetByProgetto(...a),
    create: (...a) => mockCreate(...a)
  }
}))

vi.mock('src/usecases/noteProgetti', () => ({
  creaNota: (...a) => mockCreate(...a)
}))

vi.mock('src/stores/auth.store', () => ({
  useAuthStore: () => ({ userName: 'Volontario Test' })
}))

describe('note store', () => {
  beforeEach(() => vi.clearAllMocks())

  it('has initial state', () => {
    const store = useNoteStore()
    expect(store.dataByProgetto).toEqual({})
    expect(store.loading).toBe(false)
    expect(store.saving).toBe(false)
    expect(store.error).toBeNull()
  })

  describe('fetchByProgetto', () => {
    it('loads notes scoped per progetto', async () => {
      mockGetByProgetto.mockResolvedValue({ data: { data: [{ id: 1, Testo: 'nota' }] } })
      const store = useNoteStore()

      await store.fetchByProgetto(10)

      expect(mockGetByProgetto).toHaveBeenCalledWith(10)
      expect(store.dataByProgetto[10]).toHaveLength(1)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('handles API error', async () => {
      mockGetByProgetto.mockRejectedValue({ response: { data: { errors: [{ message: 'Forbidden' }] } } })
      const store = useNoteStore()

      await store.fetchByProgetto(10)

      expect(store.dataByProgetto).toEqual({})
      expect(store.error).toBe('Forbidden')
      expect(store.loading).toBe(false)
    })
  })

  describe('createNota', () => {
    it('delega allo use case con origine e autore nome, antepone la nota', async () => {
      mockCreate.mockResolvedValue({ id: 5, Progetto: 10, Testo: 'nuova', AutoreNome: 'Volontario Test' })
      const store = useNoteStore()
      store.dataByProgetto = { 10: [{ id: 1, Testo: 'vecchia' }] }

      await store.createNota(10, 'nuova', 'verificatore')

      expect(mockCreate).toHaveBeenCalledWith(
        { Progetto: 10, Testo: 'nuova', AutoreNome: 'Volontario Test' },
        { origine: 'verificatore' }
      )
      expect(store.dataByProgetto[10]).toHaveLength(2)
      expect(store.dataByProgetto[10][0]).toEqual({
        id: 5,
        Progetto: 10,
        Testo: 'nuova',
        AutoreNome: 'Volontario Test'
      })
      expect(store.saving).toBe(false)
    })

    it("inizializza l'array se il progetto non ha ancora note", async () => {
      mockCreate.mockResolvedValue({ id: 5, Progetto: 10, Testo: 'nuova', AutoreNome: 'Volontario Test' })
      const store = useNoteStore()

      await store.createNota(10, 'nuova', 'volontario')

      expect(store.dataByProgetto[10]).toHaveLength(1)
      expect(store.dataByProgetto[10][0].id).toBe(5)
    })

    it("rilancia l'errore e imposta store.error", async () => {
      mockCreate.mockRejectedValue({ response: { data: { errors: [{ message: 'Nope' }] } } })
      const store = useNoteStore()

      await expect(store.createNota(10, 'x', 'volontario')).rejects.toEqual({
        response: { data: { errors: [{ message: 'Nope' }] } }
      })

      expect(store.error).toBe('Nope')
      expect(store.saving).toBe(false)
    })
  })

  describe('notesByProgetto getter', () => {
    it('ritorna le note del progetto', () => {
      const store = useNoteStore()
      store.$state.dataByProgetto = { 1: [{ id: 1 }], 2: [{ id: 2 }] }

      expect(store.notesByProgetto(1)).toHaveLength(1)
      expect(store.notesByProgetto(99)).toEqual([])
    })
  })
})
