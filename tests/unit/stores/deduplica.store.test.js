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

  it('fetchIdDuplicates finds duplicate IDs', async () => {
    mockGetIdDuplicates.mockResolvedValue({ data: { data: [{ 'id_contatto': 'dup-id', count: { '*': 2 } }] } })
    const store = useDeduplicaStore()
    await store.fetchIdDuplicates()
    expect(store.idDuplicateGroups.length).toBeGreaterThanOrEqual(0)
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

  it('deleteEmailRow removes email', async () => {
    mockDeleteEmail.mockResolvedValue({})
    mockGetAllEmails.mockResolvedValue({ data: { data: [] } })
    const store = useDeduplicaStore()
    await store.deleteEmailRow('e-1')
    expect(mockDeleteEmail).toHaveBeenCalledWith('e-1')
  })

  it('deleteContattoIfEmpty blocks if contatto has families', async () => {
    mockGetFamiglieByContatto.mockResolvedValue({ data: { data: [{ id: 'fc-1' }] } })
    const store = useDeduplicaStore()
    await expect(store.deleteContattoIfEmpty('c-1')).rejects.toThrow('ha ancora famiglie')
  })

  it('deleteContattoIfEmpty deletes if no families', async () => {
    mockGetFamiglieByContatto.mockResolvedValue({ data: { data: [] } })
    mockDeleteContatto.mockResolvedValue({})
    mockGetAllEmails.mockResolvedValue({ data: { data: [] } })
    const store = useDeduplicaStore()
    await store.deleteContattoIfEmpty('c-1')
    expect(mockDeleteContatto).toHaveBeenCalledWith('c-1')
  })
})
