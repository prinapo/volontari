import { defineStore } from 'pinia'
import { creaSubmission } from 'src/usecases/giustificativi'

/**
 * Adapter UI per la submission pubblica (modulo libero, utente non loggato).
 * La materializzazione in giustificativo avviene alla riconciliazione (manager):
 * vedi `creaSubmission` in src/usecases/giustificativi.js.
 */
export const useSubmitStore = defineStore('submit', {
  state: () => ({
    saving: false,
    error: null
  }),

  actions: {
    async inviaSubmission(payload) {
      this.saving = true
      this.error = null
      try {
        return await creaSubmission(payload, { origine: 'modulo_libero' })
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || error.message || "Errore nell'invio"
        throw error
      } finally {
        this.saving = false
      }
    }
  }
})
