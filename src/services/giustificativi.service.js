import api from './api'

export const giustificativiService = {
  getByProgetto(progettoId) {
    return api.get('/items/Giustificativi', {
      params: {
        'filter[Progetto][_eq]': progettoId,
        fields: [
          '*',
          'Rendicontazione.id',
          'Rendicontazione.Tranche',
          'Rendicontazione.Stato'
        ].join(',')
      }
    })
  },

  create(data) {
    return api.post('/items/Giustificativi', data)
  },

  update(id, data) {
    return api.patch(`/items/Giustificativi/${id}`, data)
  },

  submit(id) {
    return api.patch(`/items/Giustificativi/${id}`, {
      Stato: 'Inviato'
    })
  },

  invalidate(id) {
    return api.patch(`/items/Giustificativi/${id}`, {
      Invalidato: true
    })
  }
}
