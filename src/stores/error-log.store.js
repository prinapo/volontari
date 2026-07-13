import { defineStore } from 'pinia'
import { errorLogService } from 'src/services/error-log.service'

export const useErrorLogStore = defineStore('errorLog', {
  state: () => ({
    items: [],
    loading: false,
    error: null
  }),

  getters: {
    unreadCount: state => state.items.filter(i => !i.read).length
  },

  actions: {
    async fetchAll() {
      this.loading = true
      this.error = null
      try {
        const res = await errorLogService.getAll()
        this.items = res.data.data || []
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || 'Errore caricamento log'
      } finally {
        this.loading = false
      }
    },

    async markAsRead(id) {
      this.error = null
      try {
        await errorLogService.markAsRead(id)
        const item = this.items.find(i => i.id === id)
        if (item) item.read = true
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || error.message || 'Error message'
      }
    },

    async delete(id) {
      this.error = null
      try {
        await errorLogService.delete(id)
        this.items = this.items.filter(i => i.id !== id)
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || error.message || 'Error message'
      }
    }
  }
})
