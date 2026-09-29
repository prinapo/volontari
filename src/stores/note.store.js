import { defineStore } from 'pinia'
import { noteProgettiService } from 'src/services/note-progetti.service'
import { creaNota } from 'src/usecases/noteProgetti'
import { useAuthStore } from 'stores/auth.store'

export const useNoteStore = defineStore('note', {
  state: () => ({
    dataByProgetto: {},
    loading: false,
    saving: false,
    error: null
  }),

  getters: {
    notesByProgetto: state => progettoId => state.dataByProgetto[progettoId] || []
  },

  actions: {
    async fetchByProgetto(progettoId) {
      this.loading = true
      this.error = null
      try {
        const res = await noteProgettiService.getByProgetto(progettoId)
        this.dataByProgetto = {
          ...this.dataByProgetto,
          [progettoId]: res.data.data || []
        }
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || 'Errore nel caricamento delle note'
      } finally {
        this.loading = false
      }
    },

    async createNota(progettoId, testo, origine = 'volontario') {
      this.saving = true
      this.error = null
      try {
        const authStore = useAuthStore()
        const created = await creaNota(
          { Progetto: progettoId, Testo: testo, AutoreNome: authStore.userName || null },
          { origine }
        )
        this.dataByProgetto = {
          ...this.dataByProgetto,
          [progettoId]: [created, ...(this.dataByProgetto[progettoId] || [])]
        }
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || 'Errore nella creazione della nota'
        throw error
      } finally {
        this.saving = false
      }
    }
  }
})
