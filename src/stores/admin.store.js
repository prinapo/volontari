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
      } catch {
        // silent
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
      } catch {
        // silent
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
      const result = []
      for (const c of res.data.data || []) {
        try {
          await usersService.getByIds([c.user_id])
        } catch {
          result.push({ id_contatto: c.id_contatto, Nome: c.Nome, Cognome: c.Cognome, user_id: c.user_id })
        }
      }
      return result
    },

    async _checkFlagOrfani() {
      const res = await contattiService.query({ isVolontario: true, limit: -1 })
      const result = []
      for (const c of res.data.data || []) {
        const fcRes = await gestioneService.queryFamiglieContatti([c.id_contatto])
        if (!fcRes.data.data || fcRes.data.data.length === 0) {
          result.push(c)
        }
      }
      return result
    },

    async _checkLinkSenzaFlag() {
      const res = await gestioneService.checkAllFamiglieVolontari()
      const seen = new Set()
      const result = []
      for (const fc of res.data.data || []) {
        const contattoId = typeof fc.Contatto === 'object' ? fc.Contatto?.id_contatto : fc.Contatto
        if (!contattoId || seen.has(contattoId)) continue
        seen.add(contattoId)
        try {
          const cRes = await contattiService.getById(contattoId)
          if (cRes.data.data && !cRes.data.data.IsVolontario) result.push(cRes.data.data)
        } catch {
          /* contatto potrebbe non esistere */
        }
      }
      return result
    },

    async _checkSenzaRuolo() {
      const usersRes = await usersService.searchByRoleNull()
      const result = []
      for (const u of usersRes.data || []) {
        const cRes = await contattiService.getByUserId(u.id)
        const c = cRes.data.data?.[0]
        if (c) result.push({ ...c, email: u.email || '' })
      }
      return result
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
        this.error = error.message || 'Errore nella verifica consistenza volontari'
      } finally {
        this.volontariCheckLoading = false
      }
    },

    async clearIsVolontarioFlag(contattoId) {
      try {
        await api.patch(`/items/contatti/${contattoId}`, { IsVolontario: false })
        return true
      } catch {
        return false
      }
    },

    async setUserReference(contattoId, userId) {
      try {
        await api.patch(`/items/contatti/${contattoId}`, { user_id: userId })
        return true
      } catch {
        return false
      }
    },

    async setVolontarioFlag(contattoId) {
      try {
        await api.patch(`/items/contatti/${contattoId}`, { IsVolontario: true })
        return true
      } catch {
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
    }
  }
})
