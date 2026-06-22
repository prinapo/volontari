import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useGestioneStore } from 'src/stores/gestione.store'

const mockGetFamiglie = vi.fn()
const mockCheckAllFamiglieVolontari = vi.fn()
const mockCheckFamiglieVolontari = vi.fn()
const mockCreateFamiglia = vi.fn()
const mockUpdateFamiglia = vi.fn()
const mockAssignToFamiglia = vi.fn()
const mockRemoveFromFamiglia = vi.fn()
const mockGetContattoById = vi.fn()
const mockGetContattoByEmails = vi.fn()
const mockCreateContatto = vi.fn()
const mockUpdateContatto = vi.fn()
const mockCreateEmail = vi.fn()
const mockUpdateEmail = vi.fn()
const mockGetEmailRecord = vi.fn()
const mockSearchEmail = vi.fn()
const mockCreateUser = vi.fn()
const mockUpdateUser = vi.fn()
const mockGetRoleByName = vi.fn()
const mockSendInvite = vi.fn()
const mockCreateReferente = vi.fn()
const mockRemoveReferente = vi.fn()
const mockGetVolontariSenzaUtente = vi.fn()

vi.mock('src/services/gestione.service', () => ({
  gestioneService: {
    getFamiglie: (...a) => mockGetFamiglie(...a),
    checkAllFamiglieVolontari: (...a) => mockCheckAllFamiglieVolontari(...a),
    checkFamiglieVolontari: (...a) => mockCheckFamiglieVolontari(...a),
    createFamiglia: (...a) => mockCreateFamiglia(...a),
    updateFamiglia: (...a) => mockUpdateFamiglia(...a),
    assignToFamiglia: (...a) => mockAssignToFamiglia(...a),
    removeFromFamiglia: (...a) => mockRemoveFromFamiglia(...a)
  }
}))

vi.mock('src/services/contatti.service', () => ({
  contattiService: {
    getById: (...a) => mockGetContattoById(...a),
    getByEmails: (...a) => mockGetContattoByEmails(...a),
    create: (...a) => mockCreateContatto(...a),
    update: (...a) => mockUpdateContatto(...a),
    getVolontariSenzaUtente: (...a) => mockGetVolontariSenzaUtente(...a)
  }
}))

vi.mock('src/services/email.service', () => ({
  emailService: {
    create: (...a) => mockCreateEmail(...a),
    update: (...a) => mockUpdateEmail(...a),
    getRecordByContatto: (...a) => mockGetEmailRecord(...a)
  }
}))

vi.mock('src/services/referenti.service', () => ({
  referentiService: {
    create: (...a) => mockCreateReferente(...a),
    remove: (...a) => mockRemoveReferente(...a)
  }
}))

vi.mock('src/services/users.service', () => ({
  usersService: {
    searchByEmail: (...a) => mockSearchEmail(...a),
    create: (...a) => mockCreateUser(...a),
    update: (...a) => mockUpdateUser(...a),
    getRoleByName: (...a) => mockGetRoleByName(...a),
    sendInvite: (...a) => mockSendInvite(...a)
  }
}))

describe('gestione store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('has initial state', () => {
    const store = useGestioneStore()
    expect(store.famiglie).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.saving).toBe(false)
    expect(store.error).toBeNull()
    expect(store.volontarioFilter).toBe('tutti')
  })

  it('fetchAll loads famiglie case "tutti"', async () => {
    mockGetFamiglie.mockResolvedValue({ data: { data: [{ id_famiglia: 1, Nome_Famiglia: 'F1' }], meta: { filter_count: 1 } } })
    mockCheckFamiglieVolontari.mockResolvedValue({ data: { data: [{ Famiglia: 1, count: { id: 1 } }] } })
    const store = useGestioneStore()
    store.volontarioFilter = 'tutti'
    await store.fetchAll()
    expect(store.famiglie).toHaveLength(1)
    expect(store.famiglie[0].HasVolontario).toBe(true)
    expect(store.totalFamiglie).toBe(1)
  })

  it('fetchAll case "con" filters by volontari', async () => {
    mockCheckAllFamiglieVolontari.mockResolvedValue({ data: { data: [{ Famiglia: 1 }] } })
    mockGetFamiglie.mockResolvedValue({ data: { data: [{ id_famiglia: 1 }] } })
    const store = useGestioneStore()
    store.volontarioFilter = 'con'
    await store.fetchAll()
    expect(mockGetFamiglie).toHaveBeenCalled()
  })

  it('createGenitore creates contatto and email', async () => {
    mockGetContattoByEmails.mockResolvedValue({ data: { data: [] } })
    mockCreateContatto.mockResolvedValue({ data: { data: { id_contatto: 'c-1' } } })
    mockCreateEmail.mockResolvedValue({})
    const store = useGestioneStore()
    const id = await store.createGenitore({ Nome: 'M', Cognome: 'R', Email: 'm@r.it' })
    expect(id).toBe('c-1')
    expect(mockCreateEmail).toHaveBeenCalled()
    expect(store.saving).toBe(false)
  })

  it('createGenitore rejects duplicate email', async () => {
    mockGetContattoByEmails.mockResolvedValue({ data: { data: [{ id_contatto: 'other' }] } })
    const store = useGestioneStore()
    const id = await store.createGenitore({ Email: 'dup@r.it' })
    expect(id).toBe(false)
    expect(store.error).toContain('già associata')
  })

  it('updateContatto updates fields and email', async () => {
    mockGetContattoByEmails.mockResolvedValue({ data: { data: [{ id_contatto: 'c-1' }] } })
    mockGetEmailRecord.mockResolvedValue({ data: { data: [{ id: 'e-1' }] } })
    mockUpdateEmail.mockResolvedValue({})
    const store = useGestioneStore()
    const ok = await store.updateContatto('c-1', { Nome: 'New', Email: 'new@r.it' })
    expect(ok).toBe(true)
    expect(mockUpdateContatto).toHaveBeenCalled()
    expect(mockUpdateEmail).toHaveBeenCalled()
    expect(store.saving).toBe(false)
  })

  it('createFamiglia sends and refetches', async () => {
    mockCreateFamiglia.mockResolvedValue({})
    mockGetFamiglie.mockResolvedValue({ data: { data: [], meta: {} } })
    const store = useGestioneStore()
    const ok = await store.createFamiglia({ Nome_Famiglia: 'Fam Test' })
    expect(ok).toBe(true)
    expect(mockCreateFamiglia).toHaveBeenCalled()
    expect(store.saving).toBe(false)
  })

  it('updateFamiglia updates and refetches', async () => {
    mockUpdateFamiglia.mockResolvedValue({})
    mockGetFamiglie.mockResolvedValue({ data: { data: [], meta: {} } })
    const store = useGestioneStore()
    const ok = await store.updateFamiglia(1, { Nome_Famiglia: 'New' })
    expect(ok).toBe(true)
  })

  it('assignToFamiglia for Volontario creates user', async () => {
    mockGetContattoById.mockResolvedValue({ data: { data: { id_contatto: 'c-1', email: [{ Primary: true, email_address: 'v@r.it' }], user_id: null } } })
    mockSearchEmail.mockResolvedValue({ data: { data: [] } })
    mockGetRoleByName.mockResolvedValue({ data: { data: [{ id: 'role-vol' }] } })
    mockCreateUser.mockResolvedValue({ data: { data: { id: 'u-1' } } })
    mockUpdateContatto.mockResolvedValue({})
    mockSendInvite.mockResolvedValue({})
    mockAssignToFamiglia.mockResolvedValue({})
    const store = useGestioneStore()
    const ok = await store.assignToFamiglia('c-1', 'fam-1', 'Volontario')
    expect(ok).toBe(true)
    expect(mockCreateUser).toHaveBeenCalled()
  })

  it('removeFromFamiglia removes and clears flag', async () => {
    mockRemoveFromFamiglia.mockResolvedValue({})
    const store = useGestioneStore()
    const ok = await store.removeFromFamiglia('fc-1', 'c-1', 'Genitore')
    expect(ok).toBe(true)
    expect(mockUpdateContatto).toHaveBeenCalledWith('c-1', { IsGenitore: false })
  })

  it('sendInvite calls service', async () => {
    mockSendInvite.mockResolvedValue({})
    const store = useGestioneStore()
    const ok = await store.sendInvite('test@r.it')
    expect(ok).toBe(true)
  })

  it('assignReferente creates relation', async () => {
    mockCreateReferente.mockResolvedValue({})
    const store = useGestioneStore()
    const ok = await store.assignReferente('v-1', 'r-1')
    expect(ok).toBe(true)
  })

  it('removeReferente removes relation', async () => {
    mockRemoveReferente.mockResolvedValue({})
    const store = useGestioneStore()
    const ok = await store.removeReferente('rel-1')
    expect(ok).toBe(true)
  })

  it('markAsReferente creates user if needed', async () => {
    mockGetContattoById.mockResolvedValue({ data: { data: { email: [{ Primary: true, email_address: 'v@r.it' }], user_id: null } } })
    mockSearchEmail.mockResolvedValue({ data: { data: [] } })
    mockGetRoleByName.mockResolvedValue({ data: { data: [{ id: 'role-vol' }] } })
    mockCreateUser.mockResolvedValue({ data: { data: { id: 'u-1' } } })
    mockUpdateContatto.mockResolvedValue({})
    const store = useGestioneStore()
    const ok = await store.markAsReferente('c-1')
    expect(ok).toBe(true)
    expect(mockUpdateContatto).toHaveBeenCalledWith('c-1', { IsReferente: true })
  })

  it('disableUser / enableUser toggle status', async () => {
    mockUpdateUser.mockResolvedValue({})
    const store = useGestioneStore()

    const disabled = await store.disableUser('u-1')
    expect(disabled).toBe(true)
    expect(mockUpdateUser).toHaveBeenCalledWith('u-1', { status: 'suspended' })

    const enabled = await store.enableUser('u-1')
    expect(enabled).toBe(true)
    expect(mockUpdateUser).toHaveBeenCalledWith('u-1', { status: 'active' })
  })

  it('fetchVolontariSenzaUtente loads list', async () => {
    mockGetVolontariSenzaUtente.mockResolvedValue({ data: { data: [{ id: 1 }] } })
    const store = useGestioneStore()
    await store.fetchVolontariSenzaUtente()
    expect(store.volontariSenzaUtente).toHaveLength(1)
    expect(store.loadingVolontariSenzaUtente).toBe(false)
  })

  it('creaUtentePerVolontario creates user for contatto', async () => {
    mockGetContattoById.mockResolvedValue({ data: { data: { id_contatto: 'c-1', email: [{ Primary: true, email_address: 'v@r.it' }], user_id: null } } })
    mockSearchEmail.mockResolvedValue({ data: { data: [] } })
    mockGetRoleByName.mockResolvedValue({ data: { data: [{ id: 'role-vol' }] } })
    mockCreateUser.mockResolvedValue({ data: { data: { id: 'u-1' } } })
    mockUpdateContatto.mockResolvedValue({})
    mockSendInvite.mockResolvedValue({})
    mockGetVolontariSenzaUtente.mockResolvedValue({ data: { data: [] } })
    const store = useGestioneStore()
    const ok = await store.creaUtentePerVolontario('c-1')
    expect(ok).toBe(true)
    expect(mockCreateUser).toHaveBeenCalled()
    expect(store.saving).toBe(false)
  })
})
