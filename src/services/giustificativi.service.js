import api from './api'

export const giustificativiService = {
  getByProgetto(progettoId) {
    return api.get('/items/Giustificativi', {
      params: {
        'filter[Progetto][_eq]': progettoId,
        sort: '-Data',
        limit: -1,
        fields: [
          '*',
          'Rendicontazione'
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
  },

  verify(id) {
    return api.patch(`/items/Giustificativi/${id}`, {
      Stato: 'Verificato'
    })
  },

  reject(id, nota) {
    return api.patch(`/items/Giustificativi/${id}`, {
      Stato: 'Rifiutato',
      NotaRifiuto: nota
    })
  }
}
