import api from './api'

export const associazioniService = {
  getAll() {
    return api.get('/items/Associazioni', {
      params: { limit: -1, sort: 'Nome' }
    })
  },

  create(data) {
    return api.post('/items/Associazioni', data)
  },

  update(id, data) {
    return api.patch(`/items/Associazioni/${id}`, data)
  }
}
