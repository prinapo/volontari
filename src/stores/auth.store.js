import { defineStore } from 'pinia'
import { authService } from 'src/services/auth.service'
import { contattiService } from 'src/services/contatti.service'
import { famiglieService } from 'src/services/famiglie.service'
import { STORAGE_KEYS, VERIFICA_ROLE_IDS, VERIFICA_ROLE_NAMES } from 'src/utils/constants'

function normalizeRoleName(role) {
  if (!role) return ''
  const roleName = typeof role === 'string' ? role : role.name
  return String(roleName || '').trim().toLowerCase()
}

function getRoleId(role) {
  if (!role) return ''
  if (typeof role === 'string') return role
  return role.id || ''
}

function decodeJwtPayload(token) {
  if (!token) return null
  try {
    const base64Url = token.split('.')[1]
    if (!base64Url) return null
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - base64.length % 4) % 4), '=')
    return JSON.parse(window.atob(padded))
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
    initialized: false
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
    roleName: (state) => {
      return normalizeRoleName(state.user?.role)
    },
    hasRole: (state) => (roleName) => {
      return normalizeRoleName(state.user?.role) === String(roleName || '').trim().toLowerCase()
    },
    canVerifica: (state) => {
      const roleName = normalizeRoleName(state.user?.role)
      const roleId = getRoleId(state.user?.role)
      return VERIFICA_ROLE_NAMES.includes(roleName) || VERIFICA_ROLE_IDS.includes(roleId)
    },
    userName: (state) => {
      if (state.contatto) {
        return `${state.contatto.Nome} ${state.contatto.Cognome}`
      }
      if (state.user) {
        return state.user.first_name || state.user.email
      }
      return ''
    },
    userId: (state) => state.user?.id,
    contattoId: (state) => state.contatto?.id_contatto
  },

  actions: {
    async initFromStorage() {
      const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
      const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
      if (token && refreshToken) {
        this.token = token
        this.refreshToken = refreshToken
        await this.fetchUserData()
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
        this.refreshToken = tokens.refresh_token
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.access_token)
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refresh_token)
        await this.fetchUserData()
        return true
      } catch (err) {
        this.error = err.response?.data?.errors?.[0]?.message || 'Errore di login'
        return false
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
      } catch (err) {
        console.error('Failed to fetch user data:', err)
        this.token = null
        this.refreshToken = null
        this.user = null
        this.contatto = null
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN)
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
        return
      }

      try {
        const contattoRes = await contattiService.getByUserId(this.user.id)
        if (contattoRes.data.data?.length > 0) {
          this.contatto = contattoRes.data.data[0]
          await this.resolveFamiglieAccess()
        }
      } catch (err) {
        this.contatto = null
        this.hasFamiglieAccess = false
        console.warn('No contatto linked to current user or missing contatti permissions:', err)
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
      } catch (err) {
        this.hasFamiglieAccess = false
        console.warn('Unable to resolve family access:', err)
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
      } catch {
        // If directus_roles is not readable, canVerifica can still match VITE_VERIFICA_ROLE_IDS.
      }
    },

    async logout() {
      const refreshToken = this.refreshToken || localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
      try {
        if (refreshToken) {
          await authService.logout(refreshToken)
        }
      } catch {
        // ignore logout API errors
      } finally {
        this.token = null
        this.refreshToken = null
        this.user = null
        this.contatto = null
        this.hasFamiglieAccess = false
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN)
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
      }
    }
  }
})
