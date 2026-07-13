import { defineStore } from 'pinia'
import { adminService } from 'src/services/admin.service'
import api from 'src/services/api'
import { contattiService } from 'src/services/contatti.service'
import { emailService } from 'src/services/email.service'
import { gestioneService } from 'src/services/gestione.service'
import { usersService } from 'src/services/users.service'
import { VOLONTARIO_ROLE_NAMES } from 'src/utils/permissions'

function generatePassword(length = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export const useAdminStore = defineStore('admin', {
  state: () => ({
    users: [],
    roles: [],
    contattoTrovato: null,
    nuovaPassword: '',
    loading: false,
    saving: false,
    sending: false,
    error: null,
    progetti: [],
    progettiLoading: false,
    searchProgetti: '',
    volontariCheck: null,
    volontariCheckLoading: false
  }),

  actions: {
    async fetchAll() {
      await Promise.all([this.fetchUsers(), this.fetchRoles()])
    },

    async fetchUsers() {
      this.loading = true
      this.error = null
      try {
        const res = await adminService.getUsers()
        this.users = res.data.data || []
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || 'Errore nel caricamento degli utenti'
      } finally {
        this.loading = false
      }
    },

    async fetchRoles() {
      try {
        const res = await adminService.getRoles()
        this.roles = res.data.data || []
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || error.message || 'Error message'
      }
    },

    async searchContatto(email) {
      this.error = null
      this.contattoTrovato = null
      if (!email) return
      try {
        const res = await adminService.searchContattoByEmail(email)
        const emails = res.data.data || []
        if (emails.length > 0) {
          this.contattoTrovato = emails[0].Contatto_Relation
        }
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || error.message || 'Error message'
      }
    },

    async createUser(email, role, firstName, lastName) {
      this.saving = true
      this.error = null
      this.nuovaPassword = ''
      try {
        if (!this.contattoTrovato) {
          const contattoRes = await contattiService.create({
            Nome: firstName || '',
            Cognome: lastName || ''
          })
          const contattoId = contattoRes.data.data?.id_contatto
          await emailService.createSafe({
            email_address: email.toLowerCase(),
            Contatto_Relation: contattoId,
            Primary: true
          })
        }

        const pwd = generatePassword()
        await usersService.create({
          email,
          password: pwd,
          role,
          first_name: firstName || this.contattoTrovato?.Nome || '',
          last_name: lastName || this.contattoTrovato?.Cognome || ''
        })

        this.nuovaPassword = pwd
        await this.fetchUsers()
        return true
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || "Errore nella creazione dell'utente"
        return false
      } finally {
        this.saving = false
      }
    },

    async updateUserRole(userId, roleId) {
      this.saving = true
      this.error = null
      try {
        await usersService.update(userId, { role: roleId })
        await this.fetchUsers()
        return true
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || "Errore nell'aggiornamento del ruolo"
        return false
      } finally {
        this.saving = false
      }
    },

    async resetUserPassword(userId, password) {
      this.saving = true
      this.error = null
      try {
        await usersService.update(userId, { password })
        return true
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || 'Errore nel reset della password'
        return false
      } finally {
        this.saving = false
      }
    },

    async sendCustomEmail(to, subject, body) {
      this.sending = true
      this.error = null
      try {
        const resolvedBody = body
          .replaceAll('{email}', to)
          .replaceAll('{link_login}', window.location.origin + '/login')
        await adminService.sendEmail({
          to,
          subject,
          body: resolvedBody,
          type: 'html'
        })
        return true
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || "Errore nell'invio dell'email"
        return false
      } finally {
        this.sending = false
      }
    },

    async fetchProgetti() {
      this.progettiLoading = true
      this.error = null
      try {
        const res = await adminService.getProgetti({ search: this.searchProgetti || undefined })
        this.progetti = res.data.data || []
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || 'Errore nel caricamento dei progetti'
      } finally {
        this.progettiLoading = false
      }
    },

    async updateProgettoBeneficiario(id, cognome, nome) {
      this.saving = true
      this.error = null
      try {
        await adminService.updateProgetto(id, {
          Cognome_Beneficiario: cognome,
          Nome_Beneficiario: nome
        })
        return true
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || "Errore nell'aggiornamento del progetto"
        return false
      } finally {
        this.saving = false
      }
    },

    // ── Volontari Consistency Check ──
    async _checkSenzaUtente() {
      const res = await contattiService.getVolontariSenzaUtente()
      return (res.data.data || []).map(c => ({
        id_contatto: c.id_contatto,
        Nome: c.Nome,
        Cognome: c.Cognome,
        email: Array.isArray(c.email)
          ? c.email.find(e => e.Primary)?.email_address || c.email[0]?.email_address || ''
          : c.email || ''
      }))
    },

    async _checkUtenteCancellato() {
      const res = await contattiService.query({ isVolontario: true, limit: -1 })
      const contatti = res.data.data || []
      if (contatti.length === 0) return []
      // Batch-check all users at once
      const userIds = contatti.map(c => c.user_id).filter(Boolean)
      try {
        await usersService.getByIds(userIds)
        // All users exist — no deleted ones
        return []
      } catch {
        // If batch fails, find which ones are missing
        const result = []
        for (const c of contatti) {
          if (!c.user_id) continue
          try {
            await usersService.getByIds([c.user_id])
          } catch {
            result.push({ id_contatto: c.id_contatto, Nome: c.Nome, Cognome: c.Cognome, user_id: c.user_id })
          }
        }
        return result
      }
    },

    async _checkFlagOrfani() {
      const res = await contattiService.query({ isVolontario: true, limit: -1 })
      const contatti = res.data.data || []
      if (contatti.length === 0) return []
      const ids = contatti.map(c => c.id_contatto)
      // Batch query all FCs at once
      const fcRes = await gestioneService.queryFamiglieContatti(ids)
      const fcContattoIds = new Set(
        (fcRes.data.data || []).map(fc => (typeof fc.Contatto === 'object' ? fc.Contatto?.id_contatto : fc.Contatto))
      )
      return contatti.filter(c => !fcContattoIds.has(c.id_contatto))
    },

    async _checkLinkSenzaFlag() {
      const res = await gestioneService.checkAllFamiglieVolontari()
      const fcList = res.data.data || []
      if (fcList.length === 0) return []
      // Collect unique contattoIds from all FCs
      const seen = new Set()
      const contattoIds = []
      for (const fc of fcList) {
        const id = typeof fc.Contatto === 'object' ? fc.Contatto?.id_contatto : fc.Contatto
        if (id && !seen.has(id)) {
          seen.add(id)
          contattoIds.push(id)
        }
      }
      if (contattoIds.length === 0) return []
      // Batch fetch all contatti at once
      const cRes = await contattiService.getByIds(contattoIds)
      return (cRes.data.data || []).filter(c => !c.IsVolontario)
    },

    async _checkSenzaRuolo() {
      const usersRes = await usersService.searchByRoleNull()
      const users = usersRes.data || []
      if (users.length === 0) return []
      // Batch fetch all contatti with these user_ids
      const userIds = users.map(u => u.id)
      const cRes = await api.get('/items/contatti', {
        params: { 'filter[user_id][_in]': userIds.join(','), fields: 'id_contatto,Nome,Cognome,user_id', limit: -1 }
      })
      const contattiMap = {}
      for (const c of cRes.data.data || []) {
        if (c.user_id) contattiMap[c.user_id] = c
      }
      return users
        .filter(u => contattiMap[u.id])
        .map(u => ({
          ...contattiMap[u.id],
          email: u.email || ''
        }))
    },

    async fetchVolontariConsistency() {
      this.volontariCheckLoading = true
      this.volontariCheck = null
      try {
        this.volontariCheck = {
          senzaUtente: await this._checkSenzaUtente(),
          utenteCancellato: await this._checkUtenteCancellato(),
          flagOrfano: await this._checkFlagOrfani(),
          linkSenzaFlag: await this._checkLinkSenzaFlag(),
          senzaRuolo: await this._checkSenzaRuolo()
        }
      } catch (error) {
        this.error =
          error.response?.data?.errors?.[0]?.message || error.message || 'Errore nella verifica consistenza volontari'
      } finally {
        this.volontariCheckLoading = false
      }
    },

    async clearIsVolontarioFlag(contattoId) {
      try {
        await api.patch(`/items/contatti/${contattoId}`, { IsVolontario: false })
        return true
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || error.message || 'Error message'
        return false
      }
    },

    async setUserReference(contattoId, userId) {
      try {
        await api.patch(`/items/contatti/${contattoId}`, { user_id: userId })
        return true
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || error.message || 'Error message'
        return false
      }
    },

    async setVolontarioFlag(contattoId) {
      try {
        await api.patch(`/items/contatti/${contattoId}`, { IsVolontario: true })
        return true
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || error.message || 'Error message'
        return false
      }
    },

    async assignVolontarioRole(userId) {
      try {
        const roleRes = await api.get('/roles', {
          params: { 'filter[name][_eq]': VOLONTARIO_ROLE_NAMES[0], fields: 'id', limit: 1 }
        })
        const ruoloId = roleRes.data.data?.[0]?.id
        if (!ruoloId) {
          this.error = 'Ruolo "Volontario" non trovato'
          return false
        }
        await api.patch(`/users/${userId}`, { role: ruoloId })
        return true
      } catch {
        this.error = 'Errore assegnazione ruolo'
        return false
      }
    },

    async startImpersonation(userId) {
      try {
        const currentToken = localStorage.getItem('access_token')
        if (!currentToken) return false
        const uuid = crypto.randomUUID()
        await usersService.setToken(userId, uuid)
        sessionStorage.setItem('admin_jwt', currentToken)
        sessionStorage.setItem('admin_refresh', localStorage.getItem('refresh_token') || '')
        localStorage.setItem('impersonating_user_id', userId)
        localStorage.setItem('access_token', uuid)
        localStorage.removeItem('refresh_token')
        window.location.reload()
      } catch (error) {
        this.error =
          error.response?.data?.errors?.[0]?.message || error.message || "Errore nell'avvio dell'impersonazione"
        return false
      }
    },

    async stopImpersonation() {
      try {
        const userId = localStorage.getItem('impersonating_user_id')
        if (userId) await usersService.clearToken(userId)
        const adminJwt = sessionStorage.getItem('admin_jwt')
        const adminRefresh = sessionStorage.getItem('admin_refresh')
        if (adminJwt) {
          localStorage.setItem('access_token', adminJwt)
          sessionStorage.removeItem('admin_jwt')
        }
        if (adminRefresh) {
          localStorage.setItem('refresh_token', adminRefresh)
          sessionStorage.removeItem('admin_refresh')
        }
        localStorage.removeItem('impersonating_user_id')
        window.location.reload()
      } catch (error) {
        this.error =
          error.response?.data?.errors?.[0]?.message || error.message || "Errore nel termine dell'impersonazione"
      }
    }
  }
})
