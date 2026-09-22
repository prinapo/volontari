import { beforeEach, describe, expect, it, vi } from 'vitest'
import { impostaEmailPrimaria, normalizzaEmailPrimarie } from 'src/usecases/email'

const mockGetAllByContatto = vi.fn()
const mockGetAll = vi.fn()
const mockUpdate = vi.fn()

vi.mock('src/services/email.service', () => ({
  emailService: {
    getAllByContatto: (...args) => mockGetAllByContatto(...args),
    getAll: (...args) => mockGetAll(...args),
    update: (...args) => mockUpdate(...args)
  }
}))

describe('usecases/email', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdate.mockResolvedValue({ data: { data: {} } })
  })

  it('impostaEmailPrimaria rende primaria solo quella scelta', async () => {
    mockGetAllByContatto.mockResolvedValue({
      data: { data: [{ id: 1 }, { id: 2 }, { id: 3 }] }
    })

    await impostaEmailPrimaria({ contattoId: 'A', emailId: 2 })

    expect(mockUpdate).toHaveBeenCalledTimes(3)
    expect(mockUpdate).toHaveBeenCalledWith(1, { Primary: false })
    expect(mockUpdate).toHaveBeenCalledWith(2, { Primary: true })
    expect(mockUpdate).toHaveBeenCalledWith(3, { Primary: false })
  })

  it('normalizzaEmailPrimarie corregge duplicati e mancanti', async () => {
    mockGetAll.mockResolvedValue({
      data: {
        data: [
          { id: 10, Primary: true, Contatto_Relation: { id_contatto: 'A' } },
          { id: 20, Primary: true, Contatto_Relation: { id_contatto: 'A' } },
          { id: 30, Primary: false, Contatto_Relation: { id_contatto: 'B' } }
        ]
      }
    })

    const result = await normalizzaEmailPrimarie()

    expect(result).toEqual({ contattiCorretti: 2, aggiornamenti: 2 })
    expect(mockUpdate).toHaveBeenCalledWith(20, { Primary: false })
    expect(mockUpdate).toHaveBeenCalledWith(30, { Primary: true })
    expect(mockUpdate).not.toHaveBeenCalledWith(10, expect.anything())
  })

  it('normalizzaEmailPrimarie è idempotente se non ci sono violazioni', async () => {
    mockGetAll.mockResolvedValue({
      data: { data: [{ id: 1, Primary: true, Contatto_Relation: { id_contatto: 'A' } }] }
    })

    const result = await normalizzaEmailPrimarie()

    expect(result).toEqual({ contattiCorretti: 0, aggiornamenti: 0 })
    expect(mockUpdate).not.toHaveBeenCalled()
  })
})
