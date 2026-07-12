import { describe, it, expect, vi, beforeEach } from 'vitest'
import { quasarMount } from '../quasar-mount'
import LoginPage from 'src/pages/LoginPage.vue'

const mockPush = vi.fn()
const mockLogin = vi.fn()
const mockRequestPasswordReset = vi.fn()
const mockNotifyError = vi.fn()
const mockNotifySuccess = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useRoute: () => ({ query: {} })
}))

const mockAuthStore = {
  login: (...a) => mockLogin(...a),
  initialized: true,
  isAuthenticated: false,
  canManager: false
}

vi.mock('stores/auth.store', () => ({
  useAuthStore: () => mockAuthStore
}))

vi.mock('src/utils/notify', () => ({
  notifyError: (...args) => mockNotifyError(...args),
  notifySuccess: (...args) => mockNotifySuccess(...args)
}))

vi.mock('src/services/auth.service', () => ({
  authService: { requestPasswordReset: (...args) => mockRequestPasswordReset(...args) }
}))

vi.mock('../../package.json', () => ({ version: '3.1.1' }))

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthStore.loading = false
    mockAuthStore.error = null
    mockAuthStore.canManager = false
    mockRequestPasswordReset.mockResolvedValue({})
  })

  it('renders login form', () => {
    const wrapper = quasarMount(LoginPage)
    expect(wrapper.text()).toContain('Accedi')
  })

  it('calls store.login on handleLogin', async () => {
    mockLogin.mockResolvedValue(true)
    const wrapper = quasarMount(LoginPage)
    wrapper.vm.email = 'mario@test.it'
    wrapper.vm.password = 'Secret123!'

    await wrapper.vm.handleLogin()

    expect(mockLogin).toHaveBeenCalledWith('mario@test.it', 'Secret123!')
  })

  it('redirects to gestione after login for manager role', async () => {
    mockLogin.mockResolvedValue(true)
    mockAuthStore.canManager = true
    const wrapper = quasarMount(LoginPage)

    await wrapper.vm.handleLogin()

    expect(mockPush).toHaveBeenCalledWith('/gestione')
  })

  it('redirects to famiglie after generic successful login', async () => {
    mockLogin.mockResolvedValue(true)
    const wrapper = quasarMount(LoginPage)

    await wrapper.vm.handleLogin()

    expect(mockPush).toHaveBeenCalledWith('/famiglie')
  })

  it('does not redirect when login fails', async () => {
    mockLogin.mockResolvedValue(false)
    const wrapper = quasarMount(LoginPage)

    await wrapper.vm.handleLogin()

    expect(mockPush).not.toHaveBeenCalled()
  })

  it('returns early on forgot password without email', async () => {
    const wrapper = quasarMount(LoginPage)

    await wrapper.vm.handleForgotPassword()

    expect(mockRequestPasswordReset).not.toHaveBeenCalled()
    expect(wrapper.vm.sendingReset).toBe(false)
  })

  it('requests password reset and closes dialog on success', async () => {
    const wrapper = quasarMount(LoginPage)
    wrapper.vm.resetEmail = 'reset@test.it'
    wrapper.vm.showForgotPassword = true

    await wrapper.vm.handleForgotPassword()

    expect(mockRequestPasswordReset).toHaveBeenCalledTimes(1)
    expect(mockRequestPasswordReset.mock.calls[0][0]).toBe('reset@test.it')
    expect(mockNotifySuccess).toHaveBeenCalled()
    expect(wrapper.vm.showForgotPassword).toBe(false)
    expect(wrapper.vm.sendingReset).toBe(false)
  })

  it('shows notify error when forgot password fails', async () => {
    mockRequestPasswordReset.mockRejectedValueOnce(new Error('boom'))
    const wrapper = quasarMount(LoginPage)
    wrapper.vm.resetEmail = 'reset@test.it'

    await wrapper.vm.handleForgotPassword()

    expect(mockNotifyError).toHaveBeenCalled()
    expect(wrapper.vm.sendingReset).toBe(false)
  })
})
