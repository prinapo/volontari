import { defineStore } from 'pinia'
import { authService } from 'src/services/auth.service'
import { contattiService } from 'src/services/contatti.service'
import { STORAGE_KEYS } from 'src/utils/constants'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) || null,
    refreshToken: localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN) || null,
    user: null,
    contatto: null,
    loading: false,
    error: null,
    initialized: false
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
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

        const contattoRes = await contattiService.getByUserId(this.user.id)
        if (contattoRes.data.data?.length > 0) {
          this.contatto = contattoRes.data.data[0]
        }
      } catch (err) {
        console.error('Failed to fetch user data:', err)
      }
    },

    logout() {
      try {
        authService.logout()
      } catch {
        // ignore logout API errors
      }
      this.token = null
      this.refreshToken = null
      this.user = null
      this.contatto = null
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN)
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
    }
  }
})
