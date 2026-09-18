import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useSubmitStore } from 'src/stores/submit.store'

const mockCreaSubmission = vi.fn()

vi.mock('src/usecases/giustificativi', () => ({
  creaSubmission: (...a) => mockCreaSubmission(...a)
}))

describe('submit store', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ha stato iniziale pulito', () => {
    const store = useSubmitStore()
    expect(store.saving).toBe(false)
    expect(store.error).toBeNull()
  })

  it('inviaSubmission delega allo use case e ritorna il risultato', async () => {
    mockCreaSubmission.mockResolvedValue({ id: 's-1' })
    const store = useSubmitStore()
    const res = await store.inviaSubmission({ email: 'a@b.it' })
    expect(mockCreaSubmission).toHaveBeenCalledWith({ email: 'a@b.it' }, { origine: 'modulo_libero' })
    expect(res).toEqual({ id: 's-1' })
    expect(store.saving).toBe(false)
    expect(store.error).toBeNull()
  })

  it('inviaSubmission mappa gli errori', async () => {
    mockCreaSubmission.mockRejectedValueOnce({ response: { data: { errors: [{ message: 'invio fail' }] } } })
    const store = useSubmitStore()
    await expect(store.inviaSubmission({ email: 'a@b.it' })).rejects.toThrow()
    expect(store.error).toBe('invio fail')
    expect(store.saving).toBe(false)
  })
})
