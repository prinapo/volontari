import api from './api'

export const rendicontazioniService = {
  findByProject({ famigliaId, progettoId }) {
    return api.get('/items/Rendicontazioni', {
      params: {
        limit: 1,
        'filter[Famiglia][_eq]': famigliaId,
        'filter[Progetto][_eq]': progettoId,
        fields: 'id,Famiglia,Progetto,AnnoBando,Stato'
      }
    })
  },

  create(data) {
    return api.post('/items/Rendicontazioni', data)
  }
}
