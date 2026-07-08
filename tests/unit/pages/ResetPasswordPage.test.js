import { beforeEach, describe, expect, it, vi } from 'vitest'
import { quasarMount } from '../quasar-mount'
import ResetPasswordPage from 'src/pages/ResetPasswordPage.vue'

const mockPush = vi.fn()
const mockResetPassword = vi.fn()
const mockNotify = vi.fn()

let routeState = { query: { token: 'reset-token' } }

vi.mock('vue-router', () => ({
  useRoute: () => routeState,
  useRouter: () => ({ push: mockPush })
}))

vi.mock('src/services/auth.service', () => ({
  authService: { resetPassword: (...args) => mockResetPassword(...args) }
}))

vi.mock('quasar', () => ({
  useQuasar: () => ({ notify: mockNotify })
}))

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    routeState = { query: { token: 'reset-token' } }
  })

  it('shows invalid link state when token is missing', () => {
    routeState = { query: {} }
    const wrapper = quasarMount(ResetPasswordPage)
    expect(wrapper.text()).toContain('Link non valido')
  })

  it('shows mismatch error and skips service call', async () => {
    const wrapper = quasarMount(ResetPasswordPage)
    wrapper.vm.newPassword = 'uno'
    wrapper.vm.confirmPassword = 'due'

    await wrapper.vm.handleReset()

    expect(wrapper.vm.error).toBe('Le password non coincidono')
    expect(mockResetPassword).not.toHaveBeenCalled()
  })

  it('resets password successfully and redirects to login', async () => {
    mockResetPassword.mockResolvedValue({})
    const wrapper = quasarMount(ResetPasswordPage)
    wrapper.vm.newPassword = 'Password123!'
    wrapper.vm.confirmPassword = 'Password123!'

    await wrapper.vm.handleReset()

    expect(mockResetPassword).toHaveBeenCalledWith('reset-token', 'Password123!')
    expect(wrapper.vm.success).toBe(true)
    expect(mockNotify).toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(2000)
    expect(mockPush).toHaveBeenCalledWith('/login')
  })

  it('shows backend error on reset failure', async () => {
    mockResetPassword.mockRejectedValue({
      response: { data: { errors: [{ message: 'Token scaduto' }] } }
    })
    const wrapper = quasarMount(ResetPasswordPage)
    wrapper.vm.newPassword = 'Password123!'
    wrapper.vm.confirmPassword = 'Password123!'

    await wrapper.vm.handleReset()

    expect(wrapper.vm.error).toBe('Token scaduto')
    expect(wrapper.vm.loading).toBe(false)
  })

  it('falls back to generic message when backend error has no details', async () => {
    mockResetPassword.mockRejectedValue(new Error('boom'))
    const wrapper = quasarMount(ResetPasswordPage)
    wrapper.vm.newPassword = 'Password123!'
    wrapper.vm.confirmPassword = 'Password123!'

    await wrapper.vm.handleReset()

    expect(wrapper.vm.error).toBe('Errore durante il reset della password')
    expect(wrapper.vm.loading).toBe(false)
  })
})
