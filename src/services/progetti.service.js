import api from './api'

export const progettiService = {
  getById(progettoId) {
    return api.get(`/items/Progetti/${progettoId}`)
  },

  getByIds(ids = []) {
    return api.get('/items/Progetti', {
      params: { 'filter[id_progetto][_in]': ids.join(','), limit: -1 }
    })
  },

  updateStats(progettoId, stats) {
    return api.patch(`/items/Progetti/${progettoId}`, stats)
  },

  createProgetto(data) {
    return api.post('/items/Progetti', data)
  },

  createAllegato(junctionTable, data) {
    return api.post(`/items/${junctionTable}`, data)
  },

  update(progettoId, data) {
    return api.patch(`/items/Progetti/${progettoId}`, data)
  }
}
