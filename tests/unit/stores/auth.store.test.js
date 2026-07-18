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
    getGiustificativiByProgetti: (...args) => mockGetGiustificativiByProgetti(...args)
  }
}))

function createTokenPayload(role) {
  const payload = { role, exp: 9999999999, iat: 0 }
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
      const result = await store.login('test@example.com', 'password')

      expect(result).toBe(true)
      expect(store.token).toBe('new-token')
      expect(store.refreshToken).toBe('new-refresh')
      expect(store.user.id).toBe('user-1')
      expect(store.contatto.Nome).toBe('Mario')
      expect(store.loading).toBe(false)
    })

    it('returns false on login failure', async () => {
      mockLogin.mockRejectedValue({
        response: { data: { errors: [{ message: 'Credenziali errate' }] } }
      })

      const store = useAuthStore()
      const result = await store.login('bad@email', 'wrong')

      expect(result).toBe(false)
      expect(store.error).toBe('Credenziali errate')
      expect(store.token).toBeNull()
    })

    it('sets generic error on network failure', async () => {
      mockLogin.mockRejectedValue(new Error('Network failure'))

      const store = useAuthStore()
      await store.login('test@example.com', 'password')

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

      expect(mockLogout).toHaveBeenCalledWith('def')
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
      store.token = 'header.' + btoa(JSON.stringify({ role: '', exp: 9999999999 })) + '.sig'
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

  describe('rendicontazione consistency helpers', () => {
    it('returns null when project is consistent', () => {
      const store = useAuthStore()
      const result = store._compareProject(
        {
          id_progetto: 'p1',
          StatoRendicontazione: 'in_attesa',
          TotaleGiustificativi: 1,
          TotaleImporto: 10,
          Cognome_Beneficiario: 'Rossi',
          Nome_Beneficiario: 'Mario'
        },
        'p1',
        [{ id: 'g1', Stato: 'inviato', Importo: 10 }]
      )
      expect(result).toBeNull()
    })

    it('builds discrepancy payloads for inconsistent projects', () => {
      const store = useAuthStore()
      const discrepancy = store._compareProject(
        {
          id_progetto: 'p2',
          StatoRendicontazione: 'nessuno',
          TotaleGiustificativi: 0,
          TotaleImporto: 0,
          Cognome_Beneficiario: 'Verdi',
          Nome_Beneficiario: 'Anna',
          AnnoBando: 2026
        },
        'p2',
        [{ id: 'g2', Descrizione: 'Spesa', Stato: 'verificato', Importo: '25.50' }]
      )

      expect(discrepancy).toEqual(
        expect.objectContaining({
          progettoId: 'p2',
          beneficiario: 'Verdi Anna',
          annoBando: 2026,
          statoDB: 'nessuno',
          statoCalcolato: 'verificato',
          countDB: 0,
          countCalcolato: 1,
          importoDB: 0,
          importoCalcolato: 25.5
        })
      )
      expect(discrepancy.giustificativi).toEqual([
        { id: 'g2', descrizione: 'Spesa', stato: 'verificato', importo: 25.5 }
      ])
    })

    it('checkRendicontazioneConsistency exits when not admin', async () => {
      const store = useAuthStore()
      store.user = { role: { name: 'volontario' } }
      await store.checkRendicontazioneConsistency()
      expect(mockGetProgetti).not.toHaveBeenCalled()
    })

    it('checkRendicontazioneConsistency handles empty projects', async () => {
      const store = useAuthStore()
      store.user = { role: { name: 'admin' } }
      mockGetProgetti.mockResolvedValue({ data: { data: [] } })

      await store.checkRendicontazioneConsistency()
      expect(store.rendicontazioneCheck.ok).toBe(true)
      expect(store.rendicontazioneCheck.discrepancies).toEqual([])
    })

    it('checkRendicontazioneConsistency stores discrepancies from computed totals', async () => {
      const store = useAuthStore()
      store.user = { role: { name: 'admin' } }
      mockGetProgetti.mockResolvedValue({
        data: {
          data: [
            {
              id_progetto: 'p3',
              StatoRendicontazione: 'nessuno',
              TotaleGiustificativi: 0,
              TotaleImporto: 0,
              Cognome_Beneficiario: 'Neri',
              Nome_Beneficiario: 'Luca',
              AnnoBando: 2026
            }
          ]
        }
      })
      mockGetGiustificativiByProgetti.mockResolvedValue({
        data: {
          data: [
            { id: 'g1', Progetto: { id_progetto: 'p3' }, Stato: 'verificato', Importo: '30' },
            { id: 'g2', Progetto: { id_progetto: 'p3' }, Stato: 'draft', Importo: '99', Invalidato: true }
          ]
        }
      })

      await store.checkRendicontazioneConsistency()
      expect(store.rendicontazioneCheck.checked).toBe(true)
      expect(store.rendicontazioneCheck.ok).toBe(false)
      expect(store.rendicontazioneCheck.discrepancies).toHaveLength(1)
      expect(store.rendicontazioneCheck.discrepancies[0]).toEqual(
        expect.objectContaining({
          progettoId: 'p3',
          statoCalcolato: 'verificato',
          countCalcolato: 1,
          importoCalcolato: 30
        })
      )
    })

    it('checkRendicontazioneConsistency stores service errors', async () => {
      const store = useAuthStore()
      store.user = { role: { name: 'admin' } }
      mockGetProgetti.mockRejectedValue(new Error('service down'))

      await store.checkRendicontazioneConsistency()
      expect(store.rendicontazioneCheck.ok).toBe(false)
      expect(store.rendicontazioneCheck.discrepancies[0]).toEqual({ errore: true, messaggio: 'service down' })
    })
  })
})
