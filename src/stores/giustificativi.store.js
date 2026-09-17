import { defineStore } from 'pinia'
import { giustificativiService } from 'src/services/giustificativi.service'
import {
  aggiornaCampoGiustificativo,
  aggiornaGiustificativo,
  creaGiustificativo,
  invalidaGiustificativo,
  inviaGiustificativo
} from 'src/usecases/giustificativi'

export const useGiustificativiStore = defineStore('giustificativi', {
  state: () => ({
    data: [],
    loading: false,
    saving: false,
    editingItem: null,
    error: null
  }),

  getters: {
    draftItems: state => state.data.filter(i => i.Stato === 'draft'),
    inviatoItems: state => state.data.filter(i => i.Stato === 'inviato'),
    canEdit: state => itemId => {
      const item = state.data.find(i => i.id === itemId)
      return item && item.Stato === 'draft'
    }
  },

  actions: {
    async fetchByProgetto(progettoId) {
      this.loading = true
      this.error = null
      try {
        const res = await giustificativiService.getByProgetto(progettoId)
        this.data = res.data.data || []
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || 'Errore nel caricamento dei giustificativi'
      } finally {
        this.loading = false
      }
    },

    async createGiustificativo(data, file) {
      this.saving = true
      this.error = null
      try {
        await creaGiustificativo({ ...data, file }, { origine: 'volontario' })
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || 'Errore nella creazione'
        throw error
      } finally {
        this.saving = false
      }
    },

    async updateGiustificativo(id, data, newFile) {
      this.saving = true
      this.error = null
      try {
        const existingItem = this.data.find(i => i.id === id)
        const updated = await aggiornaGiustificativo({
          id,
          data,
          file: newFile,
          allegatoAttuale: existingItem?.Allegato,
          famigliaId: data.Famiglia || existingItem?.Famiglia,
          progettoId: data.Progetto || existingItem?.Progetto
        })
        if (updated) {
          const idx = this.data.findIndex(i => i.id === id)
          if (idx !== -1) this.data[idx] = { ...this.data[idx], ...updated }
        }
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || 'Errore nella modifica'
        throw error
      } finally {
        this.saving = false
      }
    },

    async submitGiustificativo(id) {
      this.saving = true
      this.error = null
      try {
        const item = this.data.find(i => i.id === id)
        const updated = await inviaGiustificativo({ id, progettoId: item?.Progetto })
        if (updated) {
          const copy = [...this.data]
          const idx = copy.findIndex(i => i.id === id)
          if (idx !== -1) copy[idx] = { ...copy[idx], ...updated }
          this.data = copy
        }
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || "Errore nell'invio"
        throw error
      } finally {
        this.saving = false
      }
    },

    startInlineEdit(item) {
      this.editingItem = { ...item }
    },

    cancelInlineEdit() {
      this.editingItem = null
    },

    async saveInlineEdit(id, field, value) {
      this.error = null
      try {
        const item = this.data.find(i => i.id === id)
        const updated = await aggiornaCampoGiustificativo({
          id,
          field,
          value,
          progettoId: item?.Progetto
        })
        if (updated) {
          const idx = this.data.findIndex(i => i.id === id)
          if (idx !== -1) this.data[idx] = { ...this.data[idx], ...updated }
        }
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || "Errore nell'aggiornamento"
        throw error
      }
    },

    async invalidateGiustificativo(id) {
      this.saving = true
      this.error = null
      try {
        const item = this.data.find(i => i.id === id)
        await invalidaGiustificativo({
          id,
          allegato: item?.Allegato,
          progettoId: item?.Progetto
        })
        const idx = this.data.findIndex(i => i.id === id)
        if (idx !== -1) {
          this.data[idx] = { ...this.data[idx], Invalidato: true }
        }
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || "Errore nell'invalidazione"
        throw error
      } finally {
        this.saving = false
      }
    }
  }
})
