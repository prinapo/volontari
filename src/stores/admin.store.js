import { defineStore } from 'pinia'
import { adminService } from 'src/services/admin.service'
import api from 'src/services/api'

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
          const contattoRes = await adminService.createContatto({
            Nome: firstName || '',
            Cognome: lastName || ''
          })
          const contattoId = contattoRes.data.data?.id_contatto
          await adminService.createEmail({
            email_address: email.toLowerCase(),
            Contatto_Relation: contattoId,
            Primary: true
          })
        }

        const pwd = generatePassword()
        await adminService.createUser({
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
        await adminService.updateUser(userId, { role: roleId })
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
        await adminService.updateUser(userId, { password })
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
    async fetchVolontariConsistency() {
      this.volontariCheckLoading = true
      this.volontariCheck = null
      try {
        const result = { senzaUtente: [], utenteCancellato: [], flagOrfano: [], linkSenzaFlag: [] }

        // 1. Contatti con IsVolontario=true e user_id=null
        const senzaUtenteRes = await api.get('/items/contatti', {
          params: {
            'filter[IsVolontario][_eq]': 'true',
            'filter[user_id][_null]': 'true',
            fields: 'id_contatto,Nome,Cognome',
            limit: -1
          }
        })
        for (const c of (senzaUtenteRes.data.data || [])) {
          const emailRes = await api.get('/items/email', {
            params: {
              'filter[Contatto_Relation][_eq]': c.id_contatto,
              'filter[Primary][_eq]': 'true',
              fields: 'email_address',
              limit: 1
            }
          })
          const email = emailRes.data.data?.[0]?.email_address || ''
          result.senzaUtente.push({ ...c, email })
        }

        // 2. Contatti con IsVolontario=true e user_id non null (verifica se utente Directus esiste)
        const conUtenteRes = await api.get('/items/contatti', {
          params: {
            'filter[IsVolontario][_eq]': 'true',
            'filter[user_id][_nnull]': 'true',
            fields: 'id_contatto,Nome,Cognome,user_id',
            limit: -1
          }
        })
        for (const c of (conUtenteRes.data.data || [])) {
          try {
            await api.get(`/users/${c.user_id}`)
          } catch {
            result.utenteCancellato.push({
              id_contatto: c.id_contatto,
              Nome: c.Nome,
              Cognome: c.Cognome,
              user_id: c.user_id
            })
          }
        }

        // 3. Contatti con IsVolontario=true ma nessun Famiglie_Contatti Volontario attivo
        const flagOrfaniRes = await api.get('/items/contatti', {
          params: {
            'filter[IsVolontario][_eq]': 'true',
            fields: 'id_contatto,Nome,Cognome',
            limit: -1
          }
        })
        for (const c of (flagOrfaniRes.data.data || [])) {
          const fcRes = await api.get('/items/Famiglie_Contatti', {
            params: {
              'filter[Contatto][_eq]': c.id_contatto,
              'filter[Ruolo_nella_Famiglia][_eq]': 'Volontario',
              'filter[Disattivo][_neq]': 'true',
              fields: 'id',
              limit: 1
            }
          })
          if (!fcRes.data.data || fcRes.data.data.length === 0) {
            result.flagOrfano.push(c)
          }
        }

        // 4. Famiglie_Contatti Volontario attivi su contatti con IsVolontario=false/null
        const linkVolontariRes = await api.get('/items/Famiglie_Contatti', {
          params: {
            'filter[Ruolo_nella_Famiglia][_eq]': 'Volontario',
            'filter[Disattivo][_neq]': 'true',
            fields: 'id,Contatto',
            limit: -1
          }
        })
        const seenContatti = new Set()
        for (const fc of (linkVolontariRes.data.data || [])) {
          const contattoId = typeof fc.Contatto === 'object' ? fc.Contatto?.id_contatto : fc.Contatto
          if (!contattoId || seenContatti.has(contattoId)) continue
          seenContatti.add(contattoId)
          try {
            const cRes = await api.get(`/items/contatti/${contattoId}`, {
              params: { fields: 'id_contatto,Nome,Cognome,IsVolontario' }
            })
            const c = cRes.data.data
            if (c && !c.IsVolontario) {
              result.linkSenzaFlag.push(c)
            }
          } catch { /* contatto potrebbe non esistere */ }
        }

        this.volontariCheck = result
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
    }
  }
})
