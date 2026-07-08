import { beforeEach, describe, expect, it, vi } from 'vitest'
import { quasarMount } from '../quasar-mount'
import AdminPage from 'src/pages/AdminPage.vue'

const mockFetchAll = vi.fn()
const mockFetchProgetti = vi.fn()
const mockUpdateBeneficiario = vi.fn()
const mockSearchContatto = vi.fn()
const mockCreateUser = vi.fn()
const mockSendCustomEmail = vi.fn()
const mockResetUserPassword = vi.fn()
const mockUpdateUserRole = vi.fn()
const mockGetVolontariSenzaUtente = vi.fn()
const mockContattoUpdate = vi.fn()
const mockSearchByEmail = vi.fn()
const mockGetRoleByName = vi.fn()
const mockUsersCreate = vi.fn()
const mockSendInvite = vi.fn()
const mockAssocGetAll = vi.fn()
const mockAssocUpdate = vi.fn()
const mockNotifySuccess = vi.fn()
const mockNotifyError = vi.fn()
const mockErrorFetchAll = vi.fn()

const adminState = {
  users: [],
  roles: [],
  progetti: [],
  error: null,
  loading: false,
  saving: false,
  contattoTrovato: null,
  fetchAll: (...a) => mockFetchAll(...a),
  fetchProgetti: (...a) => mockFetchProgetti(...a),
  updateProgettoBeneficiario: (...a) => mockUpdateBeneficiario(...a),
  searchContatto: (...a) => mockSearchContatto(...a),
  createUser: (...a) => mockCreateUser(...a),
  sendCustomEmail: (...a) => mockSendCustomEmail(...a),
  resetUserPassword: (...a) => mockResetUserPassword(...a),
  updateUserRole: (...a) => mockUpdateUserRole(...a)
}

const authState = { canAdmin: true, initialized: true }
const errorLogState = { items: [], unreadCount: 0, fetchAll: (...a) => mockErrorFetchAll(...a) }

vi.mock('stores/admin.store', () => ({
  useAdminStore: () => adminState
}))

vi.mock('stores/auth.store', () => ({
  useAuthStore: () => authState
}))

vi.mock('stores/error-log.store', () => ({
  useErrorLogStore: () => errorLogState
}))

vi.mock('src/utils/notify', () => ({
  notifyError: (...a) => mockNotifyError(...a),
  notifySuccess: (...a) => mockNotifySuccess(...a)
}))

vi.mock('src/services/contatti.service', () => ({
  contattiService: {
    getVolontariSenzaUtente: (...a) => mockGetVolontariSenzaUtente(...a),
    update: (...a) => mockContattoUpdate(...a)
  }
}))

vi.mock('src/services/users.service', () => ({
  usersService: {
    searchByEmail: (...a) => mockSearchByEmail(...a),
    getRoleByName: (...a) => mockGetRoleByName(...a),
    create: (...a) => mockUsersCreate(...a),
    sendInvite: (...a) => mockSendInvite(...a)
  }
}))

vi.mock('src/services/associazioni.service', () => ({
  associazioniService: {
    getAll: (...a) => mockAssocGetAll(...a),
    update: (...a) => mockAssocUpdate(...a)
  }
}))

vi.mock('quasar', () => ({
  useQuasar: () => ({ platform: { is: { mobile: false } }, screen: { width: 1024, sm: true, lt: { sm: false } } })
}))

describe('AdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.initialized = true
    adminState.users = [
      {
        id: 'u-1',
        email: 'mario@test.it',
        first_name: 'Mario',
        last_name: 'Rossi',
        role: { id: 'r1', name: 'Volontario' }
      }
    ]
    adminState.roles = [
      { id: 'r1', name: 'Volontario' },
      { id: 'r2', name: 'Administrator' },
      { id: 'r3', name: 'Gestore Volontari' }
    ]
    adminState.progetti = []
    adminState.error = null
    adminState.loading = false
    adminState.saving = false
    adminState.contattoTrovato = null
    errorLogState.unreadCount = 0
    mockAssocGetAll.mockResolvedValue({ data: { data: [{ id: 'a1', Nome: 'Assoc', Budget: 100 }] } })
    mockGetVolontariSenzaUtente.mockResolvedValue({ data: { data: [] } })
  })

  it('renders loader when auth is not initialized', () => {
    authState.initialized = false
    const wrapper = quasarMount(AdminPage)
    expect(wrapper.text()).toContain('Caricamento...')
  })

  it('renders user list and filters users by search', () => {
    const wrapper = quasarMount(AdminPage)
    expect(wrapper.text()).toContain('User Admin')
    wrapper.vm.usersSearch = 'rossi'
    expect(wrapper.vm.filteredUsers).toHaveLength(1)
    wrapper.vm.usersSearch = 'missing'
    expect(wrapper.vm.filteredUsers).toEqual([])
  })

  it('shows empty state when no users', () => {
    adminState.users = []
    const wrapper = quasarMount(AdminPage)
    expect(wrapper.text()).toContain('Nessun utente trovato')
  })

  it('fetches initial data on mount', async () => {
    quasarMount(AdminPage)
    await Promise.resolve()
    expect(mockFetchAll).toHaveBeenCalled()
    expect(mockFetchProgetti).toHaveBeenCalled()
    expect(mockGetVolontariSenzaUtente).toHaveBeenCalled()
    expect(mockErrorFetchAll).toHaveBeenCalled()
  })

  it('manages beneficiary edit buffers, single save and saveAll', async () => {
    mockUpdateBeneficiario.mockResolvedValue(true)
    mockFetchProgetti.mockResolvedValue()
    const wrapper = quasarMount(AdminPage)
    const progetto = { id_progetto: 1, Cognome_Beneficiario: 'Rossi', Nome_Beneficiario: 'Mario' }

    const buf = wrapper.vm.getBuffer(progetto)
    expect(buf.cognome).toBe('Rossi')
    expect(wrapper.vm.isModified(progetto)).toBe(false)

    wrapper.vm.setCognome(progetto, 'Verdi')
    wrapper.vm.setNome(progetto, 'Luigi')
    expect(wrapper.vm.isModified(progetto)).toBe(true)

    await wrapper.vm.saveBeneficiario(progetto)
    expect(mockUpdateBeneficiario).toHaveBeenCalledWith(1, 'Verdi', 'Luigi')
    expect(mockFetchProgetti).toHaveBeenCalled()

    adminState.progetti = [progetto, { id_progetto: 2, Cognome_Beneficiario: 'Bianchi', Nome_Beneficiario: 'Anna' }]
    wrapper.vm.getBuffer(adminState.progetti[1])
    wrapper.vm.setNome(adminState.progetti[1], 'Anna Maria')
    await wrapper.vm.saveAll()
    expect(mockNotifySuccess).toHaveBeenCalledWith(expect.anything(), 'Tutti i beneficiari aggiornati')
  })

  it('handles save errors, refreshes projects and shows error details', async () => {
    adminState.error = 'Errore update'
    mockUpdateBeneficiario.mockResolvedValue(false)
    const wrapper = quasarMount(AdminPage)
    const progetto = { id_progetto: 1, Cognome_Beneficiario: 'Rossi', Nome_Beneficiario: 'Mario' }
    wrapper.vm.getBuffer(progetto)

    await wrapper.vm.saveBeneficiario(progetto)
    expect(mockNotifyError).toHaveBeenCalled()

    wrapper.vm.showErrorDetail('stacktrace')
    expect(wrapper.vm.errorDetail).toEqual({ visible: true, text: 'stacktrace' })

    wrapper.vm.refreshProgetti()
    expect(mockFetchProgetti).toHaveBeenCalled()
  })

  it('edits associazioni budget and saves it', async () => {
    mockAssocUpdate.mockResolvedValue({})
    const wrapper = quasarMount(AdminPage)

    wrapper.vm.editAssocBudget({ id: 'a1' }, '25.5')
    expect(wrapper.vm.assocBudgetCache.a1).toBe(25.5)

    await wrapper.vm.fetchAssociazioni()
    await wrapper.vm.saveAssocBudget({ id: 'a1' })
    expect(mockAssocUpdate).toHaveBeenCalledWith('a1', { Budget: 25.5 })
    expect(mockNotifySuccess).toHaveBeenCalledWith(expect.anything(), 'Budget aggiornato')
    expect(wrapper.vm.savingAssoc).toBe(false)
  })

  it('creates or links volunteer users and handles missing email', async () => {
    mockGetRoleByName.mockResolvedValue({ data: { data: [{ id: 'role-vol' }] } })
    mockSearchByEmail.mockResolvedValue({ data: { data: [{ id: 'user-existing' }] } })
    const wrapper = quasarMount(AdminPage)
    const volontario = {
      id_contatto: 'c1',
      Nome: 'Mario',
      Cognome: 'Rossi',
      email: [{ email_address: 'mario@test.it', Primary: true }]
    }

    await wrapper.vm.creaUtenteVolontario(volontario)
    expect(mockContattoUpdate).toHaveBeenCalledWith('c1', { user_id: 'user-existing' })
    expect(mockNotifySuccess).toHaveBeenCalled()

    mockSearchByEmail.mockResolvedValueOnce({ data: { data: [] } })
    mockUsersCreate.mockResolvedValueOnce({ data: { data: { id: 'user-new' } } })
    await wrapper.vm.creaUtenteVolontario(volontario)
    expect(mockUsersCreate).toHaveBeenCalled()
    expect(mockSendInvite).toHaveBeenCalled()

    await wrapper.vm.creaUtenteVolontario({ id_contatto: 'c2', Nome: 'NoMail', Cognome: 'User', email: [] })
    expect(mockNotifyError).toHaveBeenCalledWith(expect.anything(), null, 'Email mancante')
  })

  it('handles create-user dialog, email sending, reset password and role change', async () => {
    mockCreateUser.mockResolvedValue(true)
    mockSendCustomEmail.mockResolvedValue(true)
    mockResetUserPassword.mockResolvedValue(true)
    mockUpdateUserRole.mockResolvedValue(true)
    const wrapper = quasarMount(AdminPage)

    wrapper.vm.openCreateDialog()
    expect(wrapper.vm.showCreateDialog).toBe(true)

    adminState.contattoTrovato = null
    await wrapper.vm.handleSearchContatto()
    expect(mockSearchContatto).toHaveBeenCalled()

    wrapper.vm.searchEmail = 'mario@test.it'
    wrapper.vm.newRole = 'r1'
    wrapper.vm.newFirstName = 'Mario'
    wrapper.vm.newLastName = 'Rossi'
    await wrapper.vm.handleCreateUser()
    expect(mockCreateUser).toHaveBeenCalledWith('mario@test.it', 'r1', 'Mario', 'Rossi')
    expect(wrapper.vm.userCreated).toBe(true)

    adminState.contattoTrovato = { Nome: 'Mario', Cognome: 'Rossi' }
    wrapper.vm.emailSubject = 'Ciao'
    wrapper.vm.emailBody = 'Benvenuto {nome}'
    await wrapper.vm.handleSendEmail()
    expect(mockSendCustomEmail).toHaveBeenCalledWith('mario@test.it', 'Ciao', 'Benvenuto Mario Rossi')
    expect(wrapper.vm.emailSubject).toBe('')
    expect(wrapper.vm.emailBody).toBe('')

    wrapper.vm.openResetPasswordDialog({ id: 'u-1' })
    wrapper.vm.resetPassword = 'NuovaPass123'
    await wrapper.vm.handleResetPassword()
    expect(mockResetUserPassword).toHaveBeenCalledWith('u-1', 'NuovaPass123')
    expect(wrapper.vm.showResetDialog).toBe(false)

    await wrapper.vm.handleRoleChange('u-1', 'r2')
    expect(mockUpdateUserRole).toHaveBeenCalledWith('u-1', 'r2')
  })

  it('computes role colors correctly', () => {
    const wrapper = quasarMount(AdminPage)
    expect(wrapper.vm.roleColor('Administrator')).toBe('negative')
    expect(wrapper.vm.roleColor('Gestore Volontari')).toBe('secondary')
    expect(wrapper.vm.roleColor('Verificatore')).toBe('primary')
    expect(wrapper.vm.roleColor('Altro')).toBe('grey')
  })
})
