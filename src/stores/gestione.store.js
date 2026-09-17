import { defineStore } from 'pinia'
import { contattiService } from 'src/services/contatti.service'
import { gestioneService } from 'src/services/gestione.service'
import {
  aggiornaContatto as aggiornaContattoUseCase,
  aggiornaFamiglia as aggiornaFamigliaUseCase,
  assegnaAFamiglia as assegnaAFamigliaUseCase,
  assegnaReferente as assegnaReferenteUseCase,
  creaFamiglia as creaFamigliaUseCase,
  creaGenitore as creaGenitoreUseCase,
  creaUtentePerVolontario as creaUtentePerVolontarioUseCase,
  marcaReferente as marcaReferenteUseCase,
  rimuoviDaFamiglia as rimuoviDaFamigliaUseCase,
  rimuoviReferente as rimuoviReferenteUseCase
} from 'src/usecases/famiglie'
import { abilitaUtente as abilitaUtenteUseCase, disabilitaUtente as disabilitaUtenteUseCase } from 'src/usecases/utenti'

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

        const ids = famiglie.map(f => f.id_famiglia).filter(Boolean)
        if (ids.length > 0) {
          const volRes = await gestioneService.checkFamiglieVolontari(ids)
          const volCounts = volRes.data.data || []
          const volMap = {}
          for (const vc of volCounts) {
            volMap[vc.Famiglia] = true
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
        return await creaGenitoreUseCase(data)
      } catch (error) {
        this.error =
          error.message === 'Email duplicata'
            ? 'Questa email è già associata a un altro contatto'
            : error.response?.data?.errors?.[0]?.message || 'Errore nella creazione del contatto'
        throw error
      } finally {
        this.saving = false
      }
    },

    async updateContatto(id, data) {
      this.saving = true
      this.error = null
      try {
        await aggiornaContattoUseCase(id, data)
      } catch (error) {
        this.error =
          error.message === 'Email duplicata'
            ? 'Questa email è già associata a un altro contatto'
            : error.response?.data?.errors?.[0]?.message || 'Errore nella modifica del contatto'
        throw error
      } finally {
        this.saving = false
      }
    },

    async disableUser(userId) {
      try {
        await disabilitaUtenteUseCase(userId)
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || 'Errore nella disattivazione'
        throw error
      }
    },

    async enableUser(userId) {
      try {
        await abilitaUtenteUseCase(userId)
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || 'Errore nella riattivazione'
        throw error
      }
    },

    async createFamiglia(data) {
      this.saving = true
      this.error = null
      try {
        await creaFamigliaUseCase(data)
        await this.fetchAll()
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || 'Errore nella creazione della famiglia'
        throw error
      } finally {
        this.saving = false
      }
    },

    async updateFamiglia(id, data) {
      this.saving = true
      this.error = null
      try {
        await aggiornaFamigliaUseCase(id, data)
        await this.fetchAll()
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || 'Errore nella modifica della famiglia'
        throw error
      } finally {
        this.saving = false
      }
    },

    async assignToFamiglia(contattoId, famigliaId, ruolo) {
      this.error = null
      try {
        await assegnaAFamigliaUseCase(contattoId, famigliaId, ruolo)
      } catch (error) {
        this.error =
          error.message === 'Email mancante'
            ? 'Email mancante: sistema il contatto prima di associarlo come volontario'
            : error.response?.data?.errors?.[0]?.message || "Errore nell'assegnazione"
        throw error
      }
    },

    async removeFromFamiglia(fcId, contattoId, ruolo) {
      try {
        await rimuoviDaFamigliaUseCase(fcId, contattoId, ruolo)
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || 'Errore nella rimozione'
        throw error
      }
    },

    async assignReferente(volontarioId, referenteId) {
      this.error = null
      try {
        await assegnaReferenteUseCase(volontarioId, referenteId)
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || "Errore nell'assegnazione referente"
        throw error
      }
    },

    async removeReferente(relationId) {
      this.error = null
      try {
        await rimuoviReferenteUseCase(relationId)
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || 'Errore nella rimozione referente'
        throw error
      }
    },

    async markAsReferente(contattoId) {
      this.error = null
      try {
        await marcaReferenteUseCase(contattoId)
      } catch (error) {
        this.error =
          error.message === 'Email mancante'
            ? "Email mancante: prima aggiungi un'email al contatto"
            : error.response?.data?.errors?.[0]?.message || "Errore nell'impostazione referente"
        throw error
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
        await creaUtentePerVolontarioUseCase(contattoId)
        await this.fetchVolontariSenzaUtente()
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || error.message || 'Errore creazione utente'
        throw error
      } finally {
        this.saving = false
      }
    }
  }
})
