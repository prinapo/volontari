import api from './api'

export const associazioniService = {
  getAll(params = {}) {
    const query = {
      sort: 'Nome',
      limit: -1
    }
    if (params.page) query.page = params.page
    if (params.limit) query.limit = params.limit
    if (params.sort) query.sort = params.sort
    if (params.search) query.search = params.search
    if (params.meta) query.meta = params.meta
    return api.get('/items/Associazioni', {
      params: query
    })
  },

  create(data) {
    return api.post('/items/Associazioni', data)
  },

  update(id, data) {
    return api.patch(`/items/Associazioni/${id}`, data)
  }
}
