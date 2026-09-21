import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAuthStore } from 'src/stores/auth.store'

const mockLogin = vi.fn()
const mockGetMe = vi.fn()
const mockLogout = vi.fn()
const mockGetRole = vi.fn()
const mockGetByUserId = vi.fn()
const mockGetFamiglieByVolontario = vi.fn()
const mockGetProgetti = vi.fn()
const mockGetGiustificativiByProgetti = vi.fn()
const mockUpdateProgetto = vi.fn()

vi.mock('src/services/auth.service', () => ({
  authService: {
    login: (...args) => mockLogin(...args),
    getMe: (...args) => mockGetMe(...args),
    logout: (...args) => mockLogout(...args),
    getRole: (...args) => mockGetRole(...args)
  }
}))

vi.mock('src/services/contatti.service', () => ({
  contattiService: {
    getByUserId: (...args) => mockGetByUserId(...args)
  }
}))

vi.mock('src/services/famiglie.service', () => ({
  famiglieService: {
    getFamiglieByVolontario: (...args) => mockGetFamiglieByVolontario(...args)
  }
}))

vi.mock('src/services/verifica.service', () => ({
  verificaService: {
    getProgetti: (...args) => mockGetProgetti(...args),
    getGiustificativiByProgetti: (...args) => mockGetGiustificativiByProgetti(...args),
    updateProgetto: (...args) => mockUpdateProgetto(...args)
  }
}))

function createTokenPayload(role) {
  const payload = { role, exp: 9_999_999_999, iat: 0 }
  const encoded = btoa(JSON.stringify(payload))
  return `header.${encoded}.signature`
}

describe('auth store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('initial state', () => {
    it('has correct defaults', () => {
      const store = useAuthStore()
      expect(store.token).toBeNull()
      expect(store.refreshToken).toBeNull()
      expect(store.user).toBeNull()
      expect(store.contatto).toBeNull()
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
      expect(store.initialized).toBe(false)
    })
  })

  describe('isAuthenticated getter', () => {
    it('returns true when token exists', () => {
      const store = useAuthStore()
      store.token = 'abc'
      expect(store.isAuthenticated).toBe(true)
    })

    it('returns false when token is null', () => {
      const store = useAuthStore()
      expect(store.isAuthenticated).toBe(false)
    })
  })

  describe('roleName getter', () => {
    it('returns normalized role name from user object', () => {
      const store = useAuthStore()
      store.user = { role: { name: 'Admin' } }
      expect(store.roleName).toBe('admin')
    })

    it('returns empty string when no user', () => {
      const store = useAuthStore()
      expect(store.roleName).toBe('')
    })
  })

  describe('canManager getter', () => {
    it('allows manager role', () => {
      const store = useAuthStore()
      store.user = { role: { name: 'Manager' } }
      expect(store.canManager).toBe(true)
    })

    it('allows admin role', () => {
      const store = useAuthStore()
      store.user = { role: { name: 'admin' } }
      expect(store.canManager).toBe(true)
    })

    it('denies unknown role', () => {
      const store = useAuthStore()
      store.user = { role: { name: 'user' } }
      expect(store.canManager).toBe(false)
    })
  })

  describe('canAdmin getter', () => {
    it('allows admin role', () => {
      const store = useAuthStore()
      store.user = { role: { name: 'admin' } }
      expect(store.canAdmin).toBe(true)
    })

    it('denies unknown role', () => {
      const store = useAuthStore()
      store.user = { role: { name: 'manager' } }
      expect(store.canAdmin).toBe(false)
    })
  })

  describe('user and role getters', () => {
    it('returns userId and contattoId getters', () => {
      const store = useAuthStore()
      store.user = { id: 'user-1' }
      store.contatto = { id_contatto: 'cont-1' }
      expect(store.userId).toBe('user-1')
      expect(store.contattoId).toBe('cont-1')
    })

    it('falls back to user email in userName', () => {
      const store = useAuthStore()
      store.user = { email: 'mail@test.it' }
      expect(store.userName).toBe('mail@test.it')
    })
  })

  describe('userName getter', () => {
    it('returns contatto name when available', () => {
      const store = useAuthStore()
      store.contatto = { Nome: 'Mario', Cognome: 'Rossi' }
      expect(store.userName).toBe('Mario Rossi')
    })

    it('falls back to user first_name', () => {
      const store = useAuthStore()
      store.user = { first_name: 'Mario' }
      expect(store.userName).toBe('Mario')
    })

    it('returns empty string when no data', () => {
      const store = useAuthStore()
      expect(store.userName).toBe('')
    })
  })

  describe('login', () => {
    it('stores tokens and fetches user data on success', async () => {
      mockLogin.mockResolvedValue({
        data: { data: { access_token: 'new-token', refresh_token: 'new-refresh' } }
      })
      mockGetMe.mockResolvedValue({
        data: { data: { id: 'user-1', role: { name: 'Verifica' } } }
      })
      mockGetByUserId.mockResolvedValue({
        data: { data: [{ id_contatto: 1, Nome: 'Mario', Cognome: 'Rossi' }] }
      })
      mockGetFamiglieByVolontario.mockResolvedValue({
        data: { data: [{ Famiglia: { id_famiglia: 1 } }] }
      })

      const store = useAuthStore()
      await store.login('test@example.com', 'password')

      expect(store.token).toBe('new-token')
      expect(store.refreshToken).toBeNull()
      expect(store.user.id).toBe('user-1')
      expect(store.contatto.Nome).toBe('Mario')
      expect(store.loading).toBe(false)
    })

    it('throws on login failure', async () => {
      mockLogin.mockRejectedValue({
        response: { data: { errors: [{ message: 'Credenziali errate' }] } }
      })

      const store = useAuthStore()
      await expect(store.login('bad@email', 'wrong')).rejects.toThrow()
      expect(store.error).toBe('Credenziali errate')
      expect(store.token).toBeNull()
    })

    it('sets generic error on network failure', async () => {
      mockLogin.mockRejectedValue(new Error('Network failure'))

      const store = useAuthStore()
      await expect(store.login('test@example.com', 'password')).rejects.toThrow()
      expect(store.error).toBe('Errore di login')
    })
  })

  describe('fetchUserData and resolveFamiglieAccess', () => {
    it('preserves token when getMe fails (non-destructive)', async () => {
      mockGetMe.mockRejectedValue(new Error('boom'))
      localStorage.setItem('access_token', 'tok')
      localStorage.setItem('refresh_token', 'ref')

      const store = useAuthStore()
      store.token = 'tok'
      store.refreshToken = 'ref'
      await store.fetchUserData()

      expect(store.token).toBe('tok')
      expect(store.refreshToken).toBe('ref')
      expect(store.user).toBeNull()
      expect(store.contatto).toBeNull()
    })

    it('sets contatto null when contatto lookup fails', async () => {
      mockGetMe.mockResolvedValue({ data: { data: { id: 'user-1', role: { name: 'volontario' } } } })
      mockGetByUserId.mockRejectedValue(new Error('forbidden'))

      const store = useAuthStore()
      await store.fetchUserData()

      expect(store.contatto).toBeNull()
      expect(store.hasFamiglieAccess).toBe(false)
    })

    it('resolveFamiglieAccess returns false without contatto and on API error', async () => {
      const store = useAuthStore()
      await store.resolveFamiglieAccess()
      expect(store.hasFamiglieAccess).toBe(false)

      store.contatto = { id_contatto: 'cont-1' }
      mockGetFamiglieByVolontario.mockRejectedValue(new Error('boom'))
      await store.resolveFamiglieAccess()
      expect(store.hasFamiglieAccess).toBe(false)
    })
  })

  describe('logout', () => {
    it('clears tokens and user data', async () => {
      mockLogout.mockResolvedValue({})
      const store = useAuthStore()
      store.token = 'abc'
      store.refreshToken = 'def'
      store.user = { id: 'user-1' }
      store.contatto = { id_contatto: 1 }

      await store.logout()

      expect(mockLogout).toHaveBeenCalledWith(null)
      expect(store.token).toBeNull()
      expect(store.refreshToken).toBeNull()
      expect(store.user).toBeNull()
      expect(store.contatto).toBeNull()
    })

    it('handles logout without refresh token', async () => {
      const store = useAuthStore()
      await store.logout()
      expect(store.token).toBeNull()
    })

    it('clears local data even when logout API fails', async () => {
      mockLogout.mockRejectedValue(new Error('boom'))
      const store = useAuthStore()
      store.refreshToken = 'ref'
      store.token = 'tok'
      store.user = { id: 'u1' }
      await store.logout()
      expect(store.token).toBeNull()
      expect(store.user).toBeNull()
    })
  })

  describe('initFromStorage', () => {
    it('restores session when tokens exist', async () => {
      localStorage.setItem('access_token', 'stored-token')
      localStorage.setItem('refresh_token', 'stored-refresh')

      mockGetMe.mockResolvedValue({
        data: { data: { id: 'user-1', role: { name: 'volontario' } } }
      })
      mockGetByUserId.mockResolvedValue({ data: { data: [] } })

      const store = useAuthStore()
      await store.initFromStorage()

      expect(store.token).toBe('stored-token')
      expect(store.refreshToken).toBe('stored-refresh')
      expect(store.initialized).toBe(true)
    })

    it('skips fetch when no tokens', async () => {
      const store = useAuthStore()
      await store.initFromStorage()

      expect(store.token).toBeNull()
      expect(store.initialized).toBe(true)
    })
  })

  describe('resolveUserRole', () => {
    it('resolves role from default_admin role id in token', async () => {
      const store = useAuthStore()
      store.token = createTokenPayload('role-id-1')
      store.user = { id: 'user-1', role: 'role-id-1' }
      mockGetRole.mockResolvedValue({
        data: { data: { id: 'role-id-1', name: 'Administrator' } }
      })

      await store.resolveUserRole()

      expect(store.user.role.name).toBe('Administrator')
    })

    it('skips resolution when user.role already has a name', async () => {
      const store = useAuthStore()
      store.user = { id: 'user-1', role: { name: 'Volontario' } }
      await store.resolveUserRole()
      expect(mockGetRole).not.toHaveBeenCalled()
    })

    it('does nothing when role is empty string', async () => {
      const store = useAuthStore()
      store.token = 'header.' + btoa(JSON.stringify({ role: '', exp: 9_999_999_999 })) + '.sig'
      store.user = { id: 'user-1', role: '' }
      await store.resolveUserRole()
      expect(store.user.role).toBe('')
    })

    it('keeps role id when role lookup fails', async () => {
      const store = useAuthStore()
      store.token = createTokenPayload('role-id-2')
      store.user = { id: 'user-1', role: 'role-id-2' }
      mockGetRole.mockRejectedValue(new Error('forbidden'))

      await store.resolveUserRole()
      expect(store.user.role).toBe('role-id-2')
    })
  })
})
