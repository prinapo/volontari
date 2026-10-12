import { defineStore } from 'pinia'
import { errorLogService } from 'src/services/error-log.service'
import { apiErrorMessage } from 'src/utils/errors'

export const useErrorLogStore = defineStore('errorLog', {
  state: () => ({
    data: [],
    loading: false,
    error: null
  }),

  getters: {
    unreadCount: state => state.data.filter(i => !i.read).length
  },

  actions: {
    async fetchAll() {
      this.loading = true
      this.error = null
      try {
        const res = await errorLogService.getAll()
        this.data = res.data.data || []
      } catch (error) {
        this.error = apiErrorMessage(error, 'Errore caricamento log')
      } finally {
        this.loading = false
      }
    },

    async markAsRead(id) {
      this.error = null
      try {
        await errorLogService.markAsRead(id)
        const item = this.data.find(i => i.id === id)
        if (item) item.read = true
      } catch (error) {
        this.error = apiErrorMessage(error, 'Errore generico')
      }
    },

    async delete(id) {
      this.error = null
      try {
        await errorLogService.delete(id)
        this.data = this.data.filter(i => i.id !== id)
      } catch (error) {
        this.error = apiErrorMessage(error, 'Errore generico')
      }
    }
  }
})
