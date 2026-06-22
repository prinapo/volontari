import api from './api'

export const errorLogService = {
  log(entry) {
    return api.post('/items/ErrorLog', entry).catch(() => {})
  },

  getAll(params = {}) {
    return api.get('/items/ErrorLog', {
      params: {
        'fields': '*',
        'sort': '-timestamp',
        'limit': 100,
        ...params
      }
    })
  },

  markAsRead(id) {
    return api.patch(`/items/ErrorLog/${id}`, { read: true }).catch(() => {})
  },

  delete(id) {
    return api.delete(`/items/ErrorLog/${id}`)
  }
}
