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

  it('crea la nota e ritorna il record creato (origine volontario)', async () => {
    mockCreate.mockResolvedValue({ data: { data: { id: 7, Progetto: 1, Testo: 'ciao', AutoreNome: 'Mario Rossi' } } })

    const created = await creaNota(
      { Progetto: 1, Testo: '  ciao  ', AutoreNome: 'Mario Rossi' },
      { origine: 'volontario' }
    )

    expect(mockCreate).toHaveBeenCalledWith({ Progetto: 1, Testo: 'ciao', AutoreNome: 'Mario Rossi' })
    expect(created).toEqual({ id: 7, Progetto: 1, Testo: 'ciao', AutoreNome: 'Mario Rossi' })
  })

  it('produce lo stesso esito per origine verificatore', async () => {
    mockCreate.mockResolvedValue({ data: { data: { id: 8, Progetto: 2, Testo: 'nota', AutoreNome: 'Manager' } } })

    const created = await creaNota({ Progetto: 2, Testo: 'nota', AutoreNome: 'Manager' }, { origine: 'verificatore' })

    expect(created).toEqual({ id: 8, Progetto: 2, Testo: 'nota', AutoreNome: 'Manager' })
  })

  it('usa null come AutoreNome se non fornito', async () => {
    mockCreate.mockResolvedValue({ data: { data: { id: 9, Progetto: 3, Testo: 'x', AutoreNome: null } } })

    const created = await creaNota({ Progetto: 3, Testo: 'x' }, { origine: 'verificatore' })

    expect(mockCreate).toHaveBeenCalledWith({ Progetto: 3, Testo: 'x', AutoreNome: null })
    expect(created.AutoreNome).toBeNull()
  })

  it('lancia errore se Progetto mancante', async () => {
    await expect(creaNota({ Testo: 'x' }, { origine: 'volontario' })).rejects.toThrow('Progetto mancante')
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('lancia errore se Testo vuoto', async () => {
    await expect(creaNota({ Progetto: 1, Testo: ' '.repeat(3) }, { origine: 'volontario' })).rejects.toThrow(
      'Testo nota mancante'
    )
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('lancia errore se la creazione fallisce', async () => {
    mockCreate.mockResolvedValue({ data: { data: null } })

    await expect(creaNota({ Progetto: 1, Testo: 'x' }, { origine: 'volontario' })).rejects.toThrow(
      'Creazione nota fallita'
    )
  })
})
