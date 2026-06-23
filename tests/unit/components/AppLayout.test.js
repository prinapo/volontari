import { describe, it, expect, vi, beforeEach } from 'vitest'
import { quasarMount } from '../quasar-mount'
import AppLayout from 'src/components/Layout/AppLayout.vue'

const mockPush = vi.fn()
const mockLogout = vi.fn()

const authStoreState = {
  isAuthenticated: false,
  userName: '',
  hasFamiglieAccess: false,
  canVerifica: false,
  canGestione: false,
  canAdmin: false,
  logout: (...a) => mockLogout(...a)
}

vi.mock('stores/auth.store', () => ({
  useAuthStore: () => authStoreState
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useRoute: () => ({ name: 'Famiglie' })
}))

vi.mock('src/services/auth.service', () => ({
  authService: { changePassword: vi.fn() }
}))

vi.mock('src/utils/notify', () => ({
  notifyError: vi.fn(),
  notifySuccess: vi.fn()
}))

vi.mock('../../package.json', () => ({ version: '2.9.0' }))

describe('AppLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authStoreState.isAuthenticated = false
    authStoreState.userName = ''
    authStoreState.hasFamiglieAccess = false
    authStoreState.canVerifica = false
    authStoreState.canGestione = false
    authStoreState.canAdmin = false
  })

  it('renders app title', () => {
    const wrapper = quasarMount(AppLayout)
    expect(wrapper.text()).toContain('Portale Volontario')
  })

  it('shows user name when authenticated', () => {
    authStoreState.isAuthenticated = true
    authStoreState.userName = 'Mario Rossi'
    const wrapper = quasarMount(AppLayout)
    expect(wrapper.text()).toContain('Mario Rossi')
  })

  it('shows Famiglie nav item when hasFamiglieAccess', () => {
    authStoreState.isAuthenticated = true
    authStoreState.hasFamiglieAccess = true
    const wrapper = quasarMount(AppLayout)
    expect(wrapper.text()).toContain('Famiglie')
  })

  it('shows Verifica when canVerifica', () => {
    authStoreState.isAuthenticated = true
    authStoreState.canVerifica = true
    const wrapper = quasarMount(AppLayout)
    expect(wrapper.text()).toContain('Verifica')
    expect(wrapper.text()).toContain('Riconciliazione')
  })

  it('shows Gestione when canGestione', () => {
    authStoreState.isAuthenticated = true
    authStoreState.canGestione = true
    const wrapper = quasarMount(AppLayout)
    expect(wrapper.text()).toContain('Gestione')
  })

  it('shows Admin when canAdmin', () => {
    authStoreState.isAuthenticated = true
    authStoreState.canAdmin = true
    const wrapper = quasarMount(AppLayout)
    expect(wrapper.text()).toContain('User Admin')
    expect(wrapper.text()).toContain('Duplicati')
  })

  it('calls logout and redirects to login', async () => {
    authStoreState.isAuthenticated = true
    mockLogout.mockResolvedValue()
    const wrapper = quasarMount(AppLayout)
    await wrapper.vm.handleLogout()
    expect(mockLogout).toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledWith('/login')
  })

  it('hides nav when not authenticated', () => {
    authStoreState.isAuthenticated = false
    const wrapper = quasarMount(AppLayout)
    expect(wrapper.text()).not.toContain('Famiglie')
    expect(wrapper.text()).not.toContain('Verifica')
  })
})
