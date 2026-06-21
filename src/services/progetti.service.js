import api from './api'

export const progettiService = {
  getById(progettoId) {
    return api.get(`/items/Progetti/${progettoId}`)
  },

  updateStats(progettoId, stats) {
    return api.patch(`/items/Progetti/${progettoId}`, stats)
  }
}
