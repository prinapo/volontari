import { defineStore } from 'pinia'
import { contattiService } from 'src/services/contatti.service'
import { emailService } from 'src/services/email.service'
import { gestioneService } from 'src/services/gestione.service'
import { referentiService } from 'src/services/referenti.service'
import { usersService } from 'src/services/users.service'
import { RUOLI_FAMIGLIA } from 'src/utils/constants'

const RESET_URL = import.meta.env.VITE_RESET_URL

export const useGestioneStore = defineStore('gestione', {
  state: () => ({
    famiglie: [],
    totalFamiglie: 0,
    loading: false,
    saving: false,
    error: null,
    volontarioFilter: 'tutti',
    volontariSenzaUtente: [],
    loadingVolontariSenzaUtente: false
  }),

  actions: {
    async fetchAll(params = {}) {
      this.loading = true
      this.error = null
      try {
        // Se filtro volontario attivo, ottieni prima tutti gli ID matching
        let famigliaIds
        let excludeIds

        if (this.volontarioFilter !== 'tutti') {
          const volRes = await gestioneService.checkAllFamiglieVolontari()
          const idsConVolontari = volRes.data.data?.map(vc => vc.Famiglia) || []

          if (this.volontarioFilter === 'con') {
            famigliaIds = idsConVolontari
          } else {
            excludeIds = idsConVolontari
          }

          if (this.volontarioFilter === 'con' && famigliaIds.length === 0) {
            this.famiglie = []
            this.totalFamiglie = 0
            this.loading = false
            return
          }
        }

        const famRes = await gestioneService.getFamiglie({ ...params, famigliaIds, excludeIds, meta: 'filter_count' })
        const famiglie = famRes.data.data || []
        this.totalFamiglie = famRes.data.meta?.filter_count || 0

        // Arricchisci con HasVolontario
        const ids = famiglie.map(f => f.id_famiglia).filter(Boolean)
        if (ids.length > 0) {
          const volRes = await gestioneService.checkFamiglieVolontari(ids)
          const volCounts = volRes.data.data || []
          const volMap = {}
          for (const vc of volCounts) {
            volMap[vc.Famiglia] = (vc.count?.id || 0) > 0
          }
          for (const f of famiglie) {
            f.HasVolontario = volMap[f.id_famiglia] || false
          }
        } else {
          for (const f of famiglie) {
            f.HasVolontario = false
          }
        }

        this.famiglie = famiglie
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || 'Errore nel caricamento dei dati'
        this.famiglie = []
      } finally {
        this.loading = false
      }
    },

    async createGenitore(data) {
      this.saving = true
      this.error = null
      try {
        if (data.Email) {
          const emailCheck = await contattiService.getByEmails([data.Email])
          const existingContatti = emailCheck.data.data || []
          if (existingContatti.length > 0) {
            this.error = 'Questa email è già associata a un altro contatto'
            return false
          }
        }
        const contattoRes = await contattiService.create({
          id_contatto: data.id_contatto,
          Nome: data.Nome,
          Cognome: data.Cognome,
          Numero_di_cellulare: data.Numero_di_cellulare || null,
          Numero_di_telefono: data.Numero_di_telefono || null
        })
        const contattoId = contattoRes.data.data?.id_contatto
        if (contattoId && data.Email) {
          await emailService.create({
            email_address: data.Email,
            Contatto_Relation: contattoId,
            Primary: true
          })
        }
        if (contattoId && data.IsReferente) {
          await contattiService.update(contattoId, { IsReferente: true })
        }
        return contattoId
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || 'Errore nella creazione del contatto'
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

        await contattiService.update(id, contattoData)

        if (newEmail !== undefined && newEmail) {
          const emailCheck = await contattiService.getByEmails([newEmail])
          const existingContatti = emailCheck.data.data || []
          const duplicateContatto = existingContatti.find(c => c.id_contatto !== id)
          if (duplicateContatto) {
            this.error = 'Questa email è già associata a un altro contatto'
            return false
          }
          const emailRes = await emailService.getRecordByContatto(id)
          const existing = emailRes.data.data?.[0]
          await (existing ? emailService.update(existing.id, { email_address: newEmail }) : emailService.create({
              email_address: newEmail,
              Contatto_Relation: id,
              Primary: true
            }));
        }

        return true
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || 'Errore nella modifica del contatto'
        return false
      } finally {
        this.saving = false
      }
    },

    async disableUser(userId) {
      try {
        await usersService.update(userId, { status: 'suspended' })
        return true
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || 'Errore nella disattivazione'
        return false
      }
    },

    async enableUser(userId) {
      try {
        await usersService.update(userId, { status: 'active' })
        return true
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || 'Errore nella riattivazione'
        return false
      }
    },

    async createFamiglia(data) {
      this.saving = true
      this.error = null
      try {
        await gestioneService.createFamiglia({
          id_famiglia: `FAM_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          Nome_Famiglia: data.Nome_Famiglia,
          IBAN: data.IBAN || null,
          Intestatario_CC: data.Intestatario_CC || null
        })
        await this.fetchAll()
        return true
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || 'Errore nella creazione della famiglia'
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
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || 'Errore nella modifica della famiglia'
        return false
      } finally {
        this.saving = false
      }
    },

    async assignToFamiglia(contattoId, famigliaId, ruolo) {
      this.error = null
      try {
        if (ruolo === 'Volontario') {
          const contattoRes = await contattiService.getById(contattoId)
          const contatto = contattoRes.data.data
          if (contatto && !contatto.user_id) {
            const email =
              contatto.email?.find(e => e.Primary === true)?.email_address || contatto.email?.[0]?.email_address
            if (!email) {
              this.error = 'Email mancante: sistema il contatto prima di associarlo come volontario'
              return false
            }
            const userRes = await usersService.searchByEmail(email)
            const existing = (userRes.data.data || [])[0]
            if (existing) {
              await contattiService.update(contattoId, { user_id: existing.id })
            } else {
              const rolesRes = await usersService.getRoleByName('Volontario')
              const ruoloId = rolesRes.data.data?.[0]?.id
              if (!ruoloId) {
                this.error = "Ruolo Volontario non trovato in Directus. Contatta l'amministratore."
                return false
              }
              const newUserRes = await usersService.create({
                email,
                password: 'Temp_' + Math.random().toString(36).slice(2, 10) + '_2026!',
                first_name: contatto.Nome || '',
                last_name: contatto.Cognome || '',
                role: ruoloId
              })
              const newUserId = newUserRes.data.data?.id
              if (newUserId) {
                await contattiService.update(contattoId, { user_id: newUserId })
                await usersService.sendInvite(email, RESET_URL)
              }
            }
          }
        }
        await gestioneService.assignToFamiglia({
          Contatto: contattoId,
          Famiglia: famigliaId,
          Ruolo_nella_Famiglia: ruolo || RUOLI_FAMIGLIA.VOLONTARIO
        })
        const flagPatch = {}
        if (ruolo === 'Volontario') flagPatch.IsVolontario = true
        else if (ruolo === 'Genitore') flagPatch.IsGenitore = true
        if (Object.keys(flagPatch).length > 0) {
          await contattiService.update(contattoId, flagPatch)
        }
        return true
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || "Errore nell'assegnazione"
        return false
      }
    },

    async removeFromFamiglia(fcId, contattoId, ruolo) {
      try {
        await gestioneService.removeFromFamiglia(fcId)
        if (contattoId) {
          const flagPatch = {}
          if (ruolo === 'Genitore') flagPatch.IsGenitore = false
          else if (ruolo === 'Referente') flagPatch.IsReferente = false
          if (Object.keys(flagPatch).length > 0) {
            await contattiService.update(contattoId, flagPatch)
          }
        }
        return true
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || 'Errore nella rimozione'
        return false
      }
    },

    async sendInvite(email) {
      try {
        await usersService.sendInvite(email, RESET_URL)
        return true
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || "Errore nell'invio dell'invito"
        return false
      }
    },

    async assignReferente(volontarioId, referenteId) {
      this.error = null
      try {
        await referentiService.create(volontarioId, referenteId)
        return true
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || "Errore nell'assegnazione referente"
        return false
      }
    },

    async removeReferente(relationId) {
      this.error = null
      try {
        await referentiService.remove(relationId)
        return true
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || 'Errore nella rimozione referente'
        return false
      }
    },

    async markAsReferente(contattoId) {
      this.error = null
      try {
        const contattoRes = await contattiService.getById(contattoId)
        const contatto = contattoRes.data.data
        if (contatto && !contatto.user_id) {
          const email =
            contatto.email?.find(e => e.Primary === true)?.email_address || contatto.email?.[0]?.email_address
          if (!email) {
            this.error = "Email mancante: prima aggiungi un'email al contatto"
            return false
          }
          const userRes = await usersService.searchByEmail(email)
          const existing = (userRes.data.data || [])[0]
          if (existing) {
            await contattiService.update(contattoId, { user_id: existing.id })
          } else {
            const rolesRes = await usersService.getRoleByName('Volontario')
            const ruoloId = rolesRes.data.data?.[0]?.id
            const newUserRes = await usersService.create({
              email,
              password: 'Temp_' + Math.random().toString(36).slice(2, 10) + '_2026!',
              first_name: contatto.Nome || '',
              last_name: contatto.Cognome || '',
              role: ruoloId
            })
            const newUserId = newUserRes.data.data?.id
            if (newUserId) {
              await contattiService.update(contattoId, { user_id: newUserId })
              await usersService.sendInvite(email, RESET_URL)
            }
          }
        }
        await contattiService.update(contattoId, { IsReferente: true })
        return true
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || "Errore nell'impostazione referente"
        return false
      }
    },

    async fetchVolontariSenzaUtente() {
      this.loadingVolontariSenzaUtente = true
      this.error = null
      try {
        const res = await contattiService.getVolontariSenzaUtente()
        this.volontariSenzaUtente = res.data.data || []
      } catch (error) {
        this.volontariSenzaUtente = []
        this.error = error.response?.data?.errors?.[0]?.message || 'Errore nel caricamento'
      } finally {
        this.loadingVolontariSenzaUtente = false
      }
    },

    async creaUtentePerVolontario(contattoId) {
      this.saving = true
      this.error = null
      try {
        const contattoRes = await contattiService.getById(contattoId)
        const contatto = contattoRes.data.data
        if (!contatto) {
          this.error = 'Contatto non trovato'
          return false
        }

        const email = contatto.email?.find(e => e.Primary === true)?.email_address || contatto.email?.[0]?.email_address
        if (!email) {
          this.error = 'Email mancante'
          return false
        }

        const userRes = await usersService.searchByEmail(email)
        const existing = (userRes.data.data || [])[0]
        if (existing) {
          await contattiService.update(contattoId, { user_id: existing.id })
        } else {
          const rolesRes = await usersService.getRoleByName('Volontario')
          const ruoloId = rolesRes.data.data?.[0]?.id
          const newUserRes = await usersService.create({
            email,
            password: 'Temp_' + Math.random().toString(36).slice(2, 10) + '_2026!',
            first_name: contatto.Nome || '',
            last_name: contatto.Cognome || '',
            role: ruoloId
          })
          const newUserId = newUserRes.data.data?.id
          if (newUserId) {
            await contattiService.update(contattoId, { user_id: newUserId })
            await usersService.sendInvite(email, RESET_URL)
          }
        }
        await this.fetchVolontariSenzaUtente()
        return true
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || 'Errore creazione utente'
        return false
      } finally {
        this.saving = false
      }
    }
  }
})
