import { defineStore } from 'pinia'
import { adminService } from 'src/services/admin.service'

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
    error: null
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
      } catch (err) {
        this.error = "Errore nel caricamento degli utenti"
        console.error(err)
      } finally {
        this.loading = false
      }
    },

    async fetchRoles() {
      try {
        const res = await adminService.getRoles()
        this.roles = res.data.data || []
      } catch (err) {
        console.error(err)
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
      } catch (err) {
        console.error(err)
      }
    },

    async createUser(email, role, firstName, lastName) {
      this.saving = true
      this.error = null
      this.nuovaPassword = ''
      try {
        // 1. Create contatto if not exists
        if (!this.contattoTrovato) {
          const contattoRes = await adminService.createContatto({
            Nome: firstName || '',
            Cognome: lastName || ''
          })
          const contattoId = contattoRes.data.data?.id_contatto
          await adminService.createEmail({
            email_address: email,
            Contatto_Relation: contattoId,
            Primary: true
          })
        }

        // 2. Create Directus user with random password
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
      } catch (err) {
        this.error = "Errore nella creazione dell'utente"
        console.error(err)
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
      } catch (err) {
        this.error = "Errore nell'aggiornamento del ruolo"
        console.error(err)
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
      } catch (err) {
        this.error = "Errore nel reset della password"
        console.error(err)
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
          .replace(/\{email\}/g, to)
          .replace(/\{link_login\}/g, window.location.origin + '/login')
        await adminService.sendEmail({
          to,
          subject,
          body: resolvedBody,
          type: 'html'
        })
        return true
      } catch (err) {
        this.error = "Errore nell'invio dell'email"
        console.error(err)
        return false
      } finally {
        this.sending = false
      }
    }
  }
})
