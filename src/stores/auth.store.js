import { defineStore } from 'pinia'
import { authService } from 'src/services/auth.service'
import { contattiService } from 'src/services/contatti.service'
import { famiglieService } from 'src/services/famiglie.service'
import { STORAGE_KEYS } from 'src/utils/constants'
import { MANAGER_ROLE_NAMES, ADMIN_ROLE_NAMES } from 'src/utils/permissions'
import { logSessionEvent } from 'src/utils/session-log'

const AUTH_MODE = 'cookie'

function normalizeRoleName(role) {
  if (!role) return ''
  const roleName = typeof role === 'string' ? role : role.name
  return String(roleName || '')
    .trim()
    .toLowerCase()
}

function getRoleId(role) {
  if (!role) return ''
  if (typeof role === 'string') return role
  return role.id || ''
}

function decodeJwtPayload(token) {
  if (!token) return null
  try {
    const base64Url = token.split('.', 2)[1]
    if (!base64Url) return null
    const base64 = base64Url.replaceAll('-', '+').replaceAll('_', '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    return JSON.parse(globalThis.atob(padded))
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) || null,
    refreshToken: localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN) || null,
    user: null,
    contatto: null,
    hasFamiglieAccess: false,
    loading: false,
    error: null,
    initialized: false,
    isImpersonating: false,
    impersonatedUserId: null
  }),

  getters: {
    isAuthenticated: state => !!(state.token || (AUTH_MODE === 'cookie' && state.user)),
    roleName: state => {
      return normalizeRoleName(state.user?.role)
    },
    canManager: state => {
      const roleName = normalizeRoleName(state.user?.role)
      return MANAGER_ROLE_NAMES.includes(roleName)
    },
    canAdmin: state => {
      const roleName = normalizeRoleName(state.user?.role)
      return ADMIN_ROLE_NAMES.includes(roleName)
    },
    canImpersonate: state => {
      const roleName = normalizeRoleName(state.user?.role)
      return ADMIN_ROLE_NAMES.includes(roleName) && !state.isImpersonating
    },
    userName: state => {
      if (state.contatto) {
        return `${state.contatto.Nome} ${state.contatto.Cognome}`
      }
      if (state.user) {
        return state.user.first_name || state.user.email
      }
      return ''
    },
    userId: state => state.user?.id,
    contattoId: state => state.contatto?.id_contatto
  },

  actions: {
    async initFromStorage() {
      const adminJwt = sessionStorage.getItem('admin_jwt')
      if (adminJwt) {
        this.isImpersonating = true
      }
      const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
      if (token) {
        this.token = token
        if (AUTH_MODE === 'json') {
          this.refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
        }
      }
      if (this.token) {
        try {
          await this.fetchUserData()
        } catch {
          // fetchUserData già gestisce l'errore
        }
      }
      this.initialized = true
    },

    async login(email, password) {
      this.loading = true
      this.error = null
      try {
        const res = await authService.login(email, password)
        const tokens = res.data.data
        this.token = tokens.access_token
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.access_token)
        if (AUTH_MODE === 'json') {
          this.refreshToken = tokens.refresh_token
          localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refresh_token)
        }
        await this.fetchUserData()
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || 'Errore di login'
        throw error
      } finally {
        this.loading = false
      }
    },

    async fetchUserData() {
      try {
        const meRes = await authService.getMe()
        this.user = meRes.data.data
        await this.resolveUserRole()

        if (!this.user?.id) return
      } catch (error) {
        logSessionEvent(
          'fetch_user_fallito',
          error.response?.data?.errors?.[0]?.message || error.message || 'Errore recupero utente'
        )
        this.error = error.response?.data?.errors?.[0]?.message || error.message || 'Errore recupero utente'
        return
      }

      try {
        // Se la sessione è stata invalidata durante gli await precedenti (es. token
        // rimosso da clearSessionAndRedirectToLogin), non chiamare contatti: la
        // richiesta partirebbe senza autenticazione → 403.
        if (!this.user?.id || !localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)) return
        const contattoRes = await contattiService.getByUserId(this.user.id)
        if (contattoRes.data.data?.length > 0) {
          this.contatto = contattoRes.data.data[0]
          await this.resolveFamiglieAccess()
        }
      } catch (error) {
        logSessionEvent(
          'contatto_lookup_fallito',
          error.response?.data?.errors?.[0]?.message || error.message || 'Error message'
        )
        this.error = error.response?.data?.errors?.[0]?.message || error.message || 'Error message'
        this.contatto = null
        this.hasFamiglieAccess = false
      }
    },

    async resolveFamiglieAccess() {
      if (!this.contatto?.id_contatto) {
        this.hasFamiglieAccess = false
        return
      }

      try {
        const fcRes = await famiglieService.getFamiglieByVolontario(this.contatto.id_contatto)
        this.hasFamiglieAccess = (fcRes.data.data || []).length > 0
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || error.message || 'Error message'
        this.hasFamiglieAccess = false
      }
    },

    async resolveUserRole() {
      if (!this.user) return
      const tokenPayload = decodeJwtPayload(this.token)
      const roleFromMe = this.user.role
      const roleId = getRoleId(roleFromMe) || tokenPayload?.role || ''

      if (roleFromMe && typeof roleFromMe === 'object' && roleFromMe.name) return

      if (!roleId) return

      this.user.role = roleId

      try {
        const roleRes = await authService.getRole(roleId)
        const role = roleRes.data.data
        if (role?.id) {
          this.user.role = role
        }
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || error.message || 'Error message'
        // If directus_roles is not readable, canAdmin can still match ADMIN_ROLE_NAMES.
      }
    },

    async logout() {
      const refreshToken =
        AUTH_MODE === 'json' ? this.refreshToken || localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN) : null
      try {
        await authService.logout(refreshToken)
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || error.message || 'Error message'
      } finally {
        this.token = null
        this.refreshToken = null
        this.user = null
        this.contatto = null
        this.hasFamiglieAccess = false
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN)
        if (AUTH_MODE === 'json') localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
      }
    }
  }
})
