import { describe, it, expect, vi, beforeEach } from 'vitest'
import { quasarMount } from '../quasar-mount'
import AdminPage from 'src/pages/AdminPage.vue'

const mockFetchAll = vi.fn()
const mockFetchProgetti = vi.fn()
const mockUpdateBeneficiario = vi.fn()

const adminState = {
  users: [{ id: 'u-1', email: 'mario@test.it', first_name: 'Mario', last_name: 'Rossi', role: { name: 'Volontario' } }],
  roles: [],
  progetti: [],
  error: null,
  loading: false,
  saving: false,
  contattoTrovato: null,
  fetchAll: (...a) => mockFetchAll(...a),
  fetchProgetti: (...a) => mockFetchProgetti(...a),
  updateProgettoBeneficiario: (...a) => mockUpdateBeneficiario(...a)
}

vi.mock('stores/admin.store', () => ({
  useAdminStore: () => adminState
}))

vi.mock('stores/auth.store', () => ({
  useAuthStore: () => ({ canAdmin: true, initialized: true })
}))

vi.mock('stores/error-log.store', () => ({
  useErrorLogStore: () => ({ items: [], unreadCount: 0, fetchAll: vi.fn() })
}))

vi.mock('src/utils/notify', () => ({ notifyError: vi.fn(), notifySuccess: vi.fn() }))
vi.mock('src/services/contatti.service', () => ({ contattiService: { search: vi.fn() } }))
vi.mock('src/services/users.service', () => ({ usersService: { searchByEmail: vi.fn() } }))
vi.mock('quasar', () => ({
  useQuasar: () => ({ platform: { is: { mobile: false } }, screen: { width: 1024, sm: true, lt: { sm: false } } })
}))

describe('AdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    adminState.users = [
      { id: 'u-1', email: 'mario@test.it', first_name: 'Mario', last_name: 'Rossi', role: { name: 'Volontario' } }
    ]
    adminState.progetti = []
    adminState.error = null
  })

  it('renders user list', () => {
    const wrapper = quasarMount(AdminPage)
    expect(wrapper.text()).toContain('User Admin')
  })

  it('shows empty state when no users', () => {
    adminState.users = []
    const wrapper = quasarMount(AdminPage)
    expect(wrapper.text()).toContain('Nessun utente trovato')
  })

  it('fetches data on mount', () => {
    quasarMount(AdminPage)
    expect(mockFetchAll).toHaveBeenCalled()
  })

  it('getBuffer creates edit cache entry', () => {
    const wrapper = quasarMount(AdminPage)
    const progetto = { id_progetto: 1, Cognome_Beneficiario: 'Rossi', Nome_Beneficiario: 'Mario' }
    const buf = wrapper.vm.getBuffer(progetto)
    expect(buf.cognome).toBe('Rossi')
    expect(buf.nome).toBe('Mario')
  })

  it('isModified detects changes', () => {
    const wrapper = quasarMount(AdminPage)
    const progetto = { id_progetto: 1, Cognome_Beneficiario: 'Rossi', Nome_Beneficiario: 'Mario' }
    wrapper.vm.getBuffer(progetto)
    expect(wrapper.vm.isModified(progetto)).toBe(false)
    wrapper.vm.setCognome(progetto, 'Verdi')
    expect(wrapper.vm.isModified(progetto)).toBe(true)
  })

  it('saveBeneficiario calls store and updates cache', async () => {
    mockUpdateBeneficiario.mockResolvedValue(true)
    mockFetchProgetti.mockResolvedValue()
    const wrapper = quasarMount(AdminPage)
    const progetto = { id_progetto: 1, Cognome_Beneficiario: 'Rossi', Nome_Beneficiario: 'Mario' }
    wrapper.vm.getBuffer(progetto)
    wrapper.vm.setCognome(progetto, 'Verdi')
    await wrapper.vm.saveBeneficiario(progetto)
    expect(mockUpdateBeneficiario).toHaveBeenCalledWith(1, 'Verdi', 'Mario')
  })
})
