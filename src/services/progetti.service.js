import api from './api'

export const progettiService = {
  getById(progettoId) {
    return api.get(`/items/Progetti/${progettoId}`)
  }
}
