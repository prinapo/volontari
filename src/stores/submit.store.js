import { defineStore } from 'pinia'
import { creaSubmission } from 'src/usecases/giustificativi'
import { apiErrorMessage } from 'src/utils/errors'

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
        return await creaSubmission(payload)
      } catch (error) {
        this.error = apiErrorMessage(error, "Errore nell'invio")
        throw error
      } finally {
        this.saving = false
      }
    }
  }
})
