import { describe, it, expect, vi, beforeEach } from 'vitest'
import { quasarMount } from '../quasar-mount'
import LoginPage from 'src/pages/LoginPage.vue'

const mockPush = vi.fn()
const mockLogin = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useRoute: () => ({ query: {} })
}))

const mockAuthStore = {
  login: (...a) => mockLogin(...a),
  initialized: true,
  isAuthenticated: false,
  canGestione: false,
  canVerifica: false
}

vi.mock('stores/auth.store', () => ({
  useAuthStore: () => mockAuthStore
}))

vi.mock('src/utils/notify', () => ({
  notifyError: vi.fn(),
  notifySuccess: vi.fn()
}))

vi.mock('src/services/auth.service', () => ({
  authService: { requestPasswordReset: vi.fn() }
}))

vi.mock('../../package.json', () => ({ version: '3.0.0' }))

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders login form', () => {
    const wrapper = quasarMount(LoginPage)
    expect(wrapper.text()).toContain('Accedi')
  })

  it('calls store.login on handleLogin', async () => {
    mockLogin.mockResolvedValue(true)
    const wrapper = quasarMount(LoginPage)

    await wrapper.vm.handleLogin()

    expect(mockLogin).toHaveBeenCalled()
  })

  it('does not redirect when login fails', async () => {
    mockLogin.mockResolvedValue(false)
    const wrapper = quasarMount(LoginPage)

    await wrapper.vm.handleLogin()

    expect(mockPush).not.toHaveBeenCalled()
  })
})
