import api from './api'

export const errorLogService = {
  log(entry) {
    return api.post('/items/ErrorLog', entry).catch(() => {})
  },

  getAll(params = {}) {
    const query = {
      fields: '*',
      sort: '-timestamp',
      limit: 100
    }
    if (params.page) query.page = params.page
    if (params.limit) query.limit = params.limit
    if (params.sort) query.sort = params.sort
    if (params.search) query['filter[message][_icontains]'] = params.search
    if (params.meta) query.meta = params.meta
    return api.get('/items/ErrorLog', {
      params: query
    })
  },

  markAsRead(id) {
    return api.patch(`/items/ErrorLog/${id}`, { read: true }).catch(() => {})
  },

  delete(id) {
    return api.delete(`/items/ErrorLog/${id}`)
  }
}
