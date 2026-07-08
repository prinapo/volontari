import api from './api'

export const progettiService = {
  getById(progettoId) {
    return api.get(`/items/Progetti/${progettoId}`)
  },

  updateStats(progettoId, stats) {
    return api.patch(`/items/Progetti/${progettoId}`, stats)
  },

  createProgetto(data) {
    return api.post('/items/Progetti', data)
  },

  uploadFile(file, folder) {
    const formData = new FormData()
    if (folder) formData.append('folder', folder)
    formData.append('file', file)
    return api.post('/files', formData)
  },

  createAllegato(junctionTable, data) {
    return api.post(`/items/${junctionTable}`, data)
  }
}
