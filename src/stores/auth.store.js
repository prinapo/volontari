import { defineStore } from 'pinia'
import { authService } from 'src/services/auth.service'
import { contattiService } from 'src/services/contatti.service'
import { famiglieService } from 'src/services/famiglie.service'
import { verificaService } from 'src/services/verifica.service'
import { STORAGE_KEYS, VERIFICA_ROLE_IDS, VERIFICA_ROLE_NAMES, GESTIONE_ROLE_IDS, GESTIONE_ROLE_NAMES, ADMIN_ROLE_IDS, ADMIN_ROLE_NAMES } from 'src/utils/constants'

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
    initialized: false,
    rendicontazioneCheck: {
      checked: false,
      ok: true,
      discrepancies: [],
      lastChecked: null
    }
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
    canGestione: (state) => {
      const roleName = normalizeRoleName(state.user?.role)
      const roleId = getRoleId(state.user?.role)
      return GESTIONE_ROLE_NAMES.includes(roleName) || GESTIONE_ROLE_IDS.includes(roleId)
    },
    canAdmin: (state) => {
      const roleName = normalizeRoleName(state.user?.role)
      const roleId = getRoleId(state.user?.role)
      return ADMIN_ROLE_NAMES.includes(roleName) || ADMIN_ROLE_IDS.includes(roleId)
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
      }

      if (this.canAdmin) {
        this.checkRendicontazioneConsistency()
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

    async checkRendicontazioneConsistency() {
      if (!this.canAdmin) return

      this.rendicontazioneCheck = { checked: false, ok: true, discrepancies: [], lastChecked: null }

      try {
        const projRes = await verificaService.getProgetti({ limit: -1 })
        const projects = projRes.data.data || []

        const progettoIds = projects.map(p => p.id_progetto).filter(Boolean)
        if (progettoIds.length === 0) {
          this.rendicontazioneCheck = {
            checked: true, ok: true, discrepancies: [], lastChecked: new Date().toISOString()
          }
          return
        }

        const giustRes = await verificaService.getGiustificativiByProgetti(progettoIds)
        const allGiust = giustRes.data.data || []

        const giustByProject = {}
        for (const g of allGiust) {
          if (g.Invalidato) continue
          const pid = typeof g.Progetto === 'object' ? g.Progetto?.id_progetto : g.Progetto
          if (!pid) continue
          if (!giustByProject[pid]) giustByProject[pid] = []
          giustByProject[pid].push(g)
        }

        const discrepancies = []

        for (const project of projects) {
          const projId = project.id_progetto
          const giustificativi = giustByProject[projId] || []

          const count = giustificativi.length
          const totaleImporto = giustificativi.reduce(
            (sum, g) => sum + (parseFloat(g.Importo) || 0), 0
          )

          let statoCalcolato = 'nessuno'
          if (count > 0) {
            const stati = giustificativi.map(g => (g.Stato || '').toLowerCase())
            if (stati.every(s => s === 'verificato' || s === 'approvato')) {
              statoCalcolato = 'verificato'
            } else if (stati.some(s => s === 'inviato')) {
              statoCalcolato = 'in_attesa'
            } else if (stati.every(s => s === 'bozza' || s === '')) {
              statoCalcolato = 'bozza'
            } else {
              statoCalcolato = 'parziale'
            }
          }

          const statoDB = project.StatoRendicontazione || 'nessuno'
          const countDB = project.TotaleGiustificativi || 0
          const importoDB = parseFloat(project.TotaleImporto) || 0

          if (statoDB !== statoCalcolato || countDB !== count || Math.abs(importoDB - totaleImporto) > 0.01) {
            discrepancies.push({
              progettoId: projId,
              beneficiario: project.Cognome_e__Nome_Beneficiario || '',
              annoBando: project.AnnoBando || '',
              statoDB,
              statoCalcolato,
              countDB,
              countCalcolato: count,
              importoDB,
              importoCalcolato: totaleImporto,
              giustificativi: giustificativi.map(g => ({
                id: g.id,
                descrizione: g.Descrizione || '',
                stato: g.Stato || '',
                importo: parseFloat(g.Importo) || 0
              }))
            })
          }
        }

        this.rendicontazioneCheck = {
          checked: true,
          ok: discrepancies.length === 0,
          discrepancies,
          lastChecked: new Date().toISOString()
        }
      } catch (err) {
        this.rendicontazioneCheck = {
          checked: true,
          ok: false,
          discrepancies: [{ errore: true, messaggio: err.message }],
          lastChecked: new Date().toISOString()
        }
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
