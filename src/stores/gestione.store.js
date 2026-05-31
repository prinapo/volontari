import { defineStore } from 'pinia'
import { gestioneService } from 'src/services/gestione.service'
import { RUOLI_FAMIGLIA } from 'src/utils/constants'

const RESET_URL = 'https://volontari.sostienilsostegno.com/reset-password'

export const useGestioneStore = defineStore('gestione', {
  state: () => ({
    famiglie: [],
    loading: false,
    saving: false,
    error: null
  }),

  actions: {
    async fetchAll() {
      this.loading = true
      this.error = null
      try {
        const famRes = await gestioneService.getFamiglie()
        this.famiglie = famRes.data.data || []
      } catch (err) {
        this.error = 'Errore nel caricamento dei dati'
        console.error(err)
      } finally {
        this.loading = false
      }
    },

    async createGenitore(data) {
      this.saving = true
      this.error = null
      try {
        const contattoRes = await gestioneService.createContatto({
          id_contatto: data.id_contatto,
          Nome: data.Nome,
          Cognome: data.Cognome,
          Numero_di_cellulare: data.Numero_di_cellulare || null,
          Numero_di_telefono: data.Numero_di_telefono || null
        })
        const contattoId = contattoRes.data.data?.id_contatto
        if (contattoId && data.Email) {
          await gestioneService.createEmail({
            email_address: data.Email,
            Contatto_Relation: contattoId,
            Primary: 'true'
          })
        }
        return true
      } catch (err) {
        this.error = err.response?.data?.errors?.[0]?.message || 'Errore nella creazione del contatto'
        console.error(err)
        return false
      } finally {
        this.saving = false
      }
    },

    async updateContatto(id, data) {
      this.saving = true
      this.error = null
      try {
        const newEmail = data.Email
        const contattoData = { ...data }
        delete contattoData.Email

        await gestioneService.updateContatto(id, contattoData)

        if (newEmail !== undefined) {
          const emailRes = await gestioneService.getEmailRecordByContatto(id)
          const existing = emailRes.data.data?.[0]
          if (existing) {
            if (newEmail) {
              await gestioneService.updateEmail(existing.id, { email_address: newEmail })
            }
          } else if (newEmail) {
            await gestioneService.createEmail({
              email_address: newEmail,
              Contatto_Relation: id,
              Primary: 'true'
            })
          }
        }

        return true
      } catch (err) {
        this.error = 'Errore nella modifica del contatto'
        console.error(err)
        return false
      } finally {
        this.saving = false
      }
    },

    async disableUser(userId) {
      try {
        await gestioneService.updateDirectusUser(userId, { status: 'suspended' })
        return true
      } catch (err) {
        this.error = 'Errore nella disattivazione'
        console.error(err)
        return false
      }
    },

    async enableUser(userId) {
      try {
        await gestioneService.updateDirectusUser(userId, { status: 'active' })
        return true
      } catch (err) {
        this.error = 'Errore nella riattivazione'
        console.error(err)
        return false
      }
    },

    async createFamiglia(data) {
      this.saving = true
      this.error = null
      try {
        await gestioneService.createFamiglia({
          Nome_Famiglia: data.Nome_Famiglia,
          IBAN: data.IBAN || null,
          Intestatario_CC: data.Intestatario_CC || null
        })
        await this.fetchAll()
        return true
      } catch (err) {
        this.error = 'Errore nella creazione della famiglia'
        console.error(err)
        return false
      } finally {
        this.saving = false
      }
    },

    async updateFamiglia(id, data) {
      this.saving = true
      this.error = null
      try {
        await gestioneService.updateFamiglia(id, data)
        await this.fetchAll()
        return true
      } catch (err) {
        this.error = 'Errore nella modifica della famiglia'
        console.error(err)
        return false
      } finally {
        this.saving = false
      }
    },

    async assignToFamiglia(contattoId, famigliaId, ruolo) {
      this.error = null
      try {
        if (ruolo === 'Volontario') {
          const contattoRes = await gestioneService.getContattoById(contattoId)
          const contatto = contattoRes.data.data
          if (contatto && !contatto.user_id) {
            const email = contatto.email?.find(e => e.Primary === true)?.email_address || contatto.email?.[0]?.email_address
            if (!email) {
              this.error = 'Email mancante: sistema il contatto prima di associarlo come volontario'
              return false
            }
            const userRes = await gestioneService.searchUsersByEmail(email)
            const existing = (userRes.data.data || [])[0]
            if (existing) {
              await gestioneService.updateContatto(contattoId, { user_id: existing.id })
            } else {
              const newUserRes = await gestioneService.createDirectusUser({
                email,
                password: 'Temp_' + Math.random().toString(36).slice(2, 10) + '_2026!',
                first_name: contatto.Nome || '',
                last_name: contatto.Cognome || ''
              })
              const newUserId = newUserRes.data.data?.id
              if (newUserId) {
                await gestioneService.updateContatto(contattoId, { user_id: newUserId })
                await gestioneService.sendInvite(email, RESET_URL)
              }
            }
          }
        }
        await gestioneService.assignToFamiglia({
          Contatto: contattoId,
          Famiglia: famigliaId,
          Ruolo_nella_Famiglia: ruolo || RUOLI_FAMIGLIA.VOLONTARIO
        })
        return true
      } catch (err) {
        this.error = err.response?.data?.errors?.[0]?.message || 'Errore nell\'assegnazione'
        console.error(err)
        return false
      }
    },

    async removeFromFamiglia(fcId, contattoId, ruolo) {
      try {
        await gestioneService.removeFromFamiglia(fcId)
        if (ruolo === 'Genitore' && contattoId) {
          await gestioneService.updateContatto(contattoId, { IsGenitore: false })
        }
        return true
      } catch (err) {
        this.error = 'Errore nella rimozione'
        console.error(err)
        return false
      }
    },

    async sendInvite(email) {
      try {
        await gestioneService.sendInvite(email, RESET_URL)
        return true
      } catch (err) {
        this.error = 'Errore nell\'invio dell\'invito'
        console.error(err)
        return false
      }
    }
  }
})
