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

  createAllegato(junctionTable, data) {
    return api.post(`/items/${junctionTable}`, data)
  },

  getList(params = {}) {
    const qs = { ...params }
    if (!qs.fields) {
      qs.fields = [
        'id_progetto',
        'Cognome_Beneficiario',
        'Nome_Beneficiario',
        'AnnoBando',
        'Allocato',
        'MassimaPercentualeErogabile',
        'StatoProgetto',
        'Famiglia.id_famiglia',
        'Famiglia.Nome_Famiglia'
      ].join(',')
    }
    if (!qs.limit) qs.limit = -1
    return api.get('/items/Progetti', { params: qs })
  },

  update(progettoId, data) {
    return api.patch(`/items/Progetti/${progettoId}`, data)
  }
}
