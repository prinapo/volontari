import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAdminStore } from 'src/stores/admin.store'

const mockGetUsers = vi.fn()
const mockGetRoles = vi.fn()
const mockSearchEmail = vi.fn()
const mockCreateContatto = vi.fn()
const mockCreateEmail = vi.fn()
const mockCreateUser = vi.fn()
const mockUpdateUser = vi.fn()
const mockSendEmail = vi.fn()
const mockGetProgetti = vi.fn()
const mockUpdateProgetto = vi.fn()

vi.mock('src/services/admin.service', () => ({
  adminService: {
    getUsers: (...a) => mockGetUsers(...a),
    getRoles: (...a) => mockGetRoles(...a),
    searchContattoByEmail: (...a) => mockSearchEmail(...a),
    createContatto: (...a) => mockCreateContatto(...a),
    createEmail: (...a) => mockCreateEmail(...a),
    createUser: (...a) => mockCreateUser(...a),
    updateUser: (...a) => mockUpdateUser(...a),
    sendEmail: (...a) => mockSendEmail(...a),
    getProgetti: (...a) => mockGetProgetti(...a),
    updateProgetto: (...a) => mockUpdateProgetto(...a)
  }
}))

describe('admin store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('has initial state', () => {
    const store = useAdminStore()
    expect(store.users).toEqual([])
    expect(store.roles).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('fetchAll loads users and roles', async () => {
    mockGetUsers.mockResolvedValue({ data: { data: [{ id: 'u-1' }] } })
    mockGetRoles.mockResolvedValue({ data: { data: [{ id: 'r-1', name: 'Admin' }] } })
    const store = useAdminStore()
    await store.fetchAll()
    expect(store.users).toHaveLength(1)
    expect(store.roles).toHaveLength(1)
    expect(store.loading).toBe(false)
  })

  it('fetchUsers handles error', async () => {
    mockGetUsers.mockRejectedValue({ response: { data: { errors: [{ message: 'No access' }] } } })
    const store = useAdminStore()
    await store.fetchUsers()
    expect(store.error).toBe('No access')
    expect(store.loading).toBe(false)
  })

  it('searchContatto finds contatto by email', async () => {
    mockSearchEmail.mockResolvedValue({ data: { data: [{ Contatto_Relation: { id_contatto: 'c-1' } }] } })
    const store = useAdminStore()
    await store.searchContatto('test@r.it')
    expect(store.contattoTrovato).toEqual({ id_contatto: 'c-1' })
  })

  it('createUser creates contatto + user', async () => {
    mockCreateContatto.mockResolvedValue({ data: { data: { id_contatto: 'c-1' } } })
    mockCreateEmail.mockResolvedValue({})
    mockCreateUser.mockResolvedValue({})
    mockGetUsers.mockResolvedValue({ data: { data: [] } })
    const store = useAdminStore()
    const ok = await store.createUser('test@r.it', 'role-1', 'Mario', 'Rossi')
    expect(ok).toBe(true)
    expect(mockCreateContatto).toHaveBeenCalled()
    expect(mockCreateUser).toHaveBeenCalled()
    expect(store.nuovaPassword).toBeTruthy()
    expect(store.saving).toBe(false)
  })

  it('updateUserRole updates and refetches', async () => {
    mockUpdateUser.mockResolvedValue({})
    mockGetUsers.mockResolvedValue({ data: { data: [] } })
    const store = useAdminStore()
    const ok = await store.updateUserRole('u-1', 'role-new')
    expect(ok).toBe(true)
    expect(store.saving).toBe(false)
  })

  it('resetUserPassword resets password', async () => {
    mockUpdateUser.mockResolvedValue({})
    const store = useAdminStore()
    const ok = await store.resetUserPassword('u-1', 'new-pwd')
    expect(ok).toBe(true)
    expect(store.saving).toBe(false)
  })

  it('sendCustomEmail sends with template', async () => {
    mockSendEmail.mockResolvedValue({})
    const store = useAdminStore()
    const ok = await store.sendCustomEmail('test@r.it', 'Subject', 'Ciao {email}')
    expect(ok).toBe(true)
    expect(mockSendEmail).toHaveBeenCalled()
    expect(store.sending).toBe(false)
  })

  it('fetchProgetti loads projects', async () => {
    mockGetProgetti.mockResolvedValue({ data: { data: [{ id_progetto: 1 }] } })
    const store = useAdminStore()
    await store.fetchProgetti()
    expect(store.progetti).toHaveLength(1)
    expect(store.progettiLoading).toBe(false)
  })

  it('updateProgettoBeneficiario updates project', async () => {
    mockUpdateProgetto.mockResolvedValue({})
    const store = useAdminStore()
    const ok = await store.updateProgettoBeneficiario(1, 'Rossi', 'Mario')
    expect(ok).toBe(true)
    expect(store.saving).toBe(false)
  })
})
