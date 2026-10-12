import { describe, it, expect, vi, beforeEach } from 'vitest'
import { creaNota } from 'src/usecases/noteProgetti'

const mockCreate = vi.fn()

vi.mock('src/services/note-progetti.service', () => ({
  noteProgettiService: {
    create: (...a) => mockCreate(...a)
  }
}))

describe('creaNota', () => {
  beforeEach(() => vi.clearAllMocks())

  it('crea la nota e ritorna il record creato', async () => {
    mockCreate.mockResolvedValue({ data: { data: { id: 7, Progetto: 1, Testo: 'ciao', AutoreNome: 'Mario Rossi' } } })

    const created = await creaNota({ Progetto: 1, Testo: '  ciao  ', AutoreNome: 'Mario Rossi' })

    expect(mockCreate).toHaveBeenCalledWith({ Progetto: 1, Testo: 'ciao', AutoreNome: 'Mario Rossi' })
    expect(created).toEqual({ id: 7, Progetto: 1, Testo: 'ciao', AutoreNome: 'Mario Rossi' })
  })

  it('usa null come AutoreNome se non fornito', async () => {
    mockCreate.mockResolvedValue({ data: { data: { id: 9, Progetto: 3, Testo: 'x', AutoreNome: null } } })

    const created = await creaNota({ Progetto: 3, Testo: 'x' })

    expect(mockCreate).toHaveBeenCalledWith({ Progetto: 3, Testo: 'x', AutoreNome: null })
    expect(created.AutoreNome).toBeNull()
  })

  it('lancia errore se Progetto mancante', async () => {
    await expect(creaNota({ Testo: 'x' })).rejects.toThrow('Progetto mancante')
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('lancia errore se Testo vuoto', async () => {
    await expect(creaNota({ Progetto: 1, Testo: ' '.repeat(3) })).rejects.toThrow('Testo nota mancante')
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('lancia errore se la creazione fallisce', async () => {
    mockCreate.mockResolvedValue({ data: { data: null } })

    await expect(creaNota({ Progetto: 1, Testo: 'x' })).rejects.toThrow('Creazione nota fallita')
  })
})
