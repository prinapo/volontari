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

vi.mock('src/services/contatti.service', () => ({
  contattiService: {
    create: (...a) => mockCreateContatto(...a)
  }
}))

vi.mock('src/services/users.service', () => ({
  usersService: {
    create: (...a) => mockCreateUser(...a),
    update: (...a) => mockUpdateUser(...a)
  }
}))

vi.mock('src/services/email.service', () => ({
  emailService: {
    createSafe: (...a) => mockCreateEmail(...a),
    create: (...a) => mockCreateEmail(...a)
  }
}))

vi.mock('src/services/admin.service', () => ({
  adminService: {
    getUsers: (...a) => mockGetUsers(...a),
    getRoles: (...a) => mockGetRoles(...a),
    searchContattoByEmail: (...a) => mockSearchEmail(...a),
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

  it('searchContatto keeps null on empty results or service failures', async () => {
    mockSearchEmail.mockResolvedValueOnce({ data: { data: [] } })
    const store = useAdminStore()
    await store.searchContatto('none@r.it')
    expect(store.contattoTrovato).toBeNull()

    mockSearchEmail.mockRejectedValueOnce(new Error('boom'))
    await store.searchContatto('fail@r.it')
    expect(store.contattoTrovato).toBeNull()
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

  it('createUser reuses existing contatto names and handles errors', async () => {
    mockCreateUser.mockResolvedValueOnce({})
    mockGetUsers.mockResolvedValueOnce({ data: { data: [] } })
    const store = useAdminStore()
    store.contattoTrovato = { id_contatto: 'c-9', Nome: 'Anna', Cognome: 'Verdi' }

    let ok = await store.createUser('anna@r.it', 'role-1')
    expect(ok).toBe(true)
    expect(mockCreateContatto).not.toHaveBeenCalled()
    expect(mockCreateEmail).not.toHaveBeenCalled()
    expect(mockCreateUser).toHaveBeenCalledWith(expect.objectContaining({ first_name: 'Anna', last_name: 'Verdi' }))

    mockCreateUser.mockRejectedValueOnce({ response: { data: { errors: [{ message: 'create user fail' }] } } })
    ok = await store.createUser('anna@r.it', 'role-1')
    expect(ok).toBe(false)
    expect(store.error).toBe('create user fail')
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
    const ok = await store.sendCustomEmail('test@r.it', 'Subject', 'Ciao {email} {link_login}')
    expect(ok).toBe(true)
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@r.it',
        body: expect.stringContaining('test@r.it')
      })
    )
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

  it('searchContatto returns early for empty email', async () => {
    const store = useAdminStore()
    await store.searchContatto('')
    expect(mockSearchEmail).not.toHaveBeenCalled()
  })

  it('fetchRoles fails silently and fetchUsers can use generic fallback error', async () => {
    mockGetRoles.mockRejectedValueOnce(new Error('forbidden'))
    mockGetUsers.mockRejectedValueOnce(new Error('boom'))
    const store = useAdminStore()
    await store.fetchRoles()
    expect(store.roles).toEqual([])

    await store.fetchUsers()
    expect(store.error).toBe('Errore nel caricamento degli utenti')
  })

  it('updateUserRole handles error', async () => {
    mockUpdateUser.mockRejectedValue({ response: { data: { errors: [{ message: 'no access' }] } } })
    const store = useAdminStore()
    const ok = await store.updateUserRole('u-1', 'r-new')
    expect(ok).toBe(false)
    expect(store.error).toBe('no access')
    expect(store.saving).toBe(false)
  })

  it('resetUserPassword handles specific and generic errors', async () => {
    mockUpdateUser.mockRejectedValueOnce({ response: { data: { errors: [{ message: 'fail' }] } } })
    const store = useAdminStore()
    let ok = await store.resetUserPassword('u-1', 'pwd')
    expect(ok).toBe(false)
    expect(store.error).toBe('fail')

    mockUpdateUser.mockRejectedValueOnce(new Error('boom'))
    ok = await store.resetUserPassword('u-1', 'pwd')
    expect(ok).toBe(false)
    expect(store.error).toBe('Errore nel reset della password')
  })

  it('sendCustomEmail handles specific and generic errors', async () => {
    mockSendEmail.mockRejectedValueOnce({ response: { data: { errors: [{ message: 'email fail' }] } } })
    const store = useAdminStore()
    let ok = await store.sendCustomEmail('test@r.it', 'Sub', 'body')
    expect(ok).toBe(false)
    expect(store.error).toBe('email fail')

    mockSendEmail.mockRejectedValueOnce(new Error('smtp'))
    ok = await store.sendCustomEmail('test@r.it', 'Sub', 'body')
    expect(ok).toBe(false)
    expect(store.error).toBe("Errore nell'invio dell'email")
  })

  it('fetchProgetti handles specific and generic errors', async () => {
    mockGetProgetti.mockRejectedValueOnce({ response: { data: { errors: [{ message: 'progetti fail' }] } } })
    const store = useAdminStore()
    await store.fetchProgetti()
    expect(store.error).toBe('progetti fail')
    expect(store.progettiLoading).toBe(false)

    mockGetProgetti.mockRejectedValueOnce(new Error('boom'))
    await store.fetchProgetti()
    expect(store.error).toBe('Errore nel caricamento dei progetti')
  })

  it('updateProgettoBeneficiario handles specific and generic errors', async () => {
    mockUpdateProgetto.mockRejectedValueOnce({ response: { data: { errors: [{ message: 'project fail' }] } } })
    const store = useAdminStore()
    let ok = await store.updateProgettoBeneficiario(1, 'Rossi', 'Mario')
    expect(ok).toBe(false)
    expect(store.error).toBe('project fail')

    mockUpdateProgetto.mockRejectedValueOnce(new Error('boom'))
    ok = await store.updateProgettoBeneficiario(1, 'Rossi', 'Mario')
    expect(ok).toBe(false)
    expect(store.error).toBe("Errore nell'aggiornamento del progetto")
  })
})
