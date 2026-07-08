import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useDeduplicaStore } from 'src/stores/deduplica.store'

const mockGetAllEmails = vi.fn()
const mockGetContatto = vi.fn()
const mockGetFamiglieByContatto = vi.fn()
const mockUpdateContatto = vi.fn()
const mockUpdateFamigliaContatto = vi.fn()
const mockUpdateEmail = vi.fn()
const mockDeleteContatto = vi.fn()
const mockDeleteEmail = vi.fn()
const mockGetIdDuplicates = vi.fn()

vi.mock('src/services/deduplica.service', () => ({
  deduplicaService: {
    getAllEmails: (...a) => mockGetAllEmails(...a),
    getContatto: (...a) => mockGetContatto(...a),
    getFamiglieByContatto: (...a) => mockGetFamiglieByContatto(...a),
    updateContatto: (...a) => mockUpdateContatto(...a),
    updateFamigliaContatto: (...a) => mockUpdateFamigliaContatto(...a),
    updateEmail: (...a) => mockUpdateEmail(...a),
    deleteContatto: (...a) => mockDeleteContatto(...a),
    deleteEmail: (...a) => mockDeleteEmail(...a),
    getIdDuplicates: (...a) => mockGetIdDuplicates(...a)
  }
}))

describe('deduplica store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('has initial state', () => {
    const store = useDeduplicaStore()
    expect(store.duplicateGroups).toEqual([])
    expect(store.idDuplicateGroups).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('fetchDuplicates finds cross-contatto duplicates', async () => {
    mockGetAllEmails.mockResolvedValue({
      data: {
        data: [
          { id: 1, email_address: 'dup@r.it', Contatto_Relation: 'c-1' },
          { id: 2, email_address: 'dup@r.it', Contatto_Relation: 'c-2' }
        ]
      }
    })
    mockGetContatto.mockResolvedValue({ data: { data: { id_contatto: 'c-1' } } })
    mockGetFamiglieByContatto.mockResolvedValue({ data: { data: [] } })
    const store = useDeduplicaStore()
    await store.fetchDuplicates()
    expect(store.duplicateGroups).toHaveLength(1)
    expect(store.duplicateGroups[0].types).toContain('cross-contatto')
    expect(store.error).toBeNull()
  })

  it('fetchDuplicates handles orphan entries', async () => {
    mockGetAllEmails.mockResolvedValue({
      data: {
        data: [
          { id: 1, email_address: 'orphan@r.it', Contatto_Relation: 'c-1' },
          { id: 2, email_address: 'orphan@r.it', Contatto_Relation: null }
        ]
      }
    })
    mockGetContatto.mockResolvedValue({ data: { data: { id_contatto: 'c-1' } } })
    mockGetFamiglieByContatto.mockResolvedValue({ data: { data: [] } })
    const store = useDeduplicaStore()
    await store.fetchDuplicates()
    expect(store.duplicateGroups[0].types).toContain('orphan')
  })

  it('fetchDuplicates detects same-contatto duplicates and survives contatto lookup errors', async () => {
    mockGetAllEmails.mockResolvedValue({
      data: {
        data: [
          { id: 1, email_address: 'dup@r.it', Contatto_Relation: 'c-1' },
          { id: 2, email_address: 'dup@r.it', Contatto_Relation: 'c-1' }
        ]
      }
    })
    mockGetContatto.mockRejectedValueOnce(new Error('boom'))
    const store = useDeduplicaStore()
    await store.fetchDuplicates()
    expect(store.duplicateGroups).toHaveLength(1)
    expect(store.duplicateGroups[0].types).toContain('same-contatto')
    expect(store.duplicateGroups[0].contattiData['c-1']).toEqual(
      expect.objectContaining({ contatto: null, famiglieContatti: [] })
    )
  })

  it('fetchDuplicates skips blank or non-duplicate emails and handles top-level errors', async () => {
    mockGetAllEmails.mockResolvedValueOnce({
      data: {
        data: [
          { id: 1, email_address: '  ', Contatto_Relation: 'c-1' },
          { id: 2, email_address: 'single@r.it', Contatto_Relation: 'c-2' }
        ]
      }
    })
    const store = useDeduplicaStore()
    await store.fetchDuplicates()
    expect(store.duplicateGroups).toEqual([])

    mockGetAllEmails.mockRejectedValueOnce({ response: { data: { errors: [{ message: 'dedup fail' }] } } })
    await store.fetchDuplicates()
    expect(store.error).toBe('dedup fail')
  })

  it('fetchIdDuplicates finds duplicate IDs and skips inaccessible tables', async () => {
    mockGetIdDuplicates
      .mockResolvedValueOnce({ data: { data: [{ id_contatto: 'dup-id', count: { '*': 2 } }] } })
      .mockRejectedValueOnce(new Error('forbidden'))
      .mockResolvedValueOnce({
        data: {
          data: [
            { id_progetto: 'p-1', count: { '*': 1 } },
            { id_progetto: 'p-2', count: { '*': 3 } }
          ]
        }
      })
    const store = useDeduplicaStore()
    await store.fetchIdDuplicates()
    expect(store.idDuplicateGroups).toEqual([
      expect.objectContaining({ table: 'contatti', id: 'dup-id', count: 2 }),
      expect.objectContaining({ table: 'progetti', id: 'p-2', count: 3 })
    ])
    expect(store.totalIdDuplicates).toBe(3)
    expect(store.idLoading).toBe(false)
  })

  it('totalDuplicates / totalContattiCoinvolti getters', () => {
    const store = useDeduplicaStore()
    store.duplicateGroups = [{ contattiIds: ['a', 'b'] }, { contattiIds: ['c'] }]
    expect(store.totalDuplicates).toBe(2)
    expect(store.totalContattiCoinvolti).toBe(3)
  })

  it('merge moves data from B to A', async () => {
    mockUpdateContatto.mockResolvedValue({})
    mockGetFamiglieByContatto
      .mockResolvedValueOnce({ data: { data: [{ id: 'fc-1', Contatto: 'c-2' }] } })
      .mockResolvedValue({ data: { data: [] } })
    mockUpdateFamigliaContatto.mockResolvedValue({})
    mockUpdateEmail.mockResolvedValue({})
    mockDeleteContatto.mockResolvedValue({})
    mockGetAllEmails
      .mockResolvedValueOnce({ data: { data: [{ id: 'e-1', Contatto_Relation: 'c-2' }] } })
      .mockResolvedValue({ data: { data: [] } })
    const store = useDeduplicaStore()
    await store.merge('c-1', 'c-2', { Nome: 'Mario' })
    expect(mockUpdateContatto).toHaveBeenCalledWith('c-1', { Nome: 'Mario' })
    expect(mockUpdateFamigliaContatto).toHaveBeenCalled()
    expect(mockUpdateEmail).toHaveBeenCalled()
    expect(mockDeleteContatto).toHaveBeenCalledWith('c-2')
  })

  it('merge skips empty overrides and surfaces service errors', async () => {
    mockGetFamiglieByContatto.mockResolvedValueOnce({ data: { data: [] } })
    mockGetAllEmails.mockResolvedValueOnce({ data: { data: [] } })
    mockDeleteContatto.mockResolvedValueOnce({})
    const store = useDeduplicaStore()
    await store.merge('c-1', 'c-2', { Nome: undefined, Cognome: null })
    expect(mockUpdateContatto).not.toHaveBeenCalled()

    mockGetFamiglieByContatto.mockRejectedValueOnce({ response: { data: { errors: [{ message: 'merge fail' }] } } })
    await expect(store.merge('c-1', 'c-2', {})).rejects.toBeTruthy()
    expect(store.error).toBe('merge fail')
  })

  it('deleteEmailRow removes email and reports errors', async () => {
    mockDeleteEmail.mockResolvedValueOnce({})
    mockGetAllEmails.mockResolvedValueOnce({ data: { data: [] } })
    const store = useDeduplicaStore()
    await store.deleteEmailRow('e-1')
    expect(mockDeleteEmail).toHaveBeenCalledWith('e-1')

    mockDeleteEmail.mockRejectedValueOnce({ response: { data: { errors: [{ message: 'delete email fail' }] } } })
    await expect(store.deleteEmailRow('e-2')).rejects.toBeTruthy()
    expect(store.error).toBe('delete email fail')
  })

  it('deleteContattoIfEmpty blocks if contatto has families', async () => {
    mockGetFamiglieByContatto.mockResolvedValue({ data: { data: [{ id: 'fc-1' }] } })
    const store = useDeduplicaStore()
    await expect(store.deleteContattoIfEmpty('c-1')).rejects.toThrow('ha ancora famiglie')
  })

  it('deleteContattoIfEmpty deletes if no families and reports delete errors', async () => {
    mockGetFamiglieByContatto.mockResolvedValueOnce({ data: { data: [] } })
    mockDeleteContatto.mockResolvedValueOnce({})
    mockGetAllEmails.mockResolvedValueOnce({ data: { data: [] } })
    const store = useDeduplicaStore()
    await store.deleteContattoIfEmpty('c-1')
    expect(mockDeleteContatto).toHaveBeenCalledWith('c-1')

    mockGetFamiglieByContatto.mockResolvedValueOnce({ data: { data: [] } })
    mockDeleteContatto.mockRejectedValueOnce({ response: { data: { errors: [{ message: 'delete contatto fail' }] } } })
    await expect(store.deleteContattoIfEmpty('c-2')).rejects.toBeTruthy()
    expect(store.error).toBe('delete contatto fail')
  })
})
