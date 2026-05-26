import api from './api'

export const rendicontazioniService = {
  findByProjectAndTranche({ famigliaId, progettoId, tranche }) {
    return api.get('/items/Rendicontazioni', {
      params: {
        limit: 1,
        'filter[Famiglia][_eq]': famigliaId,
        'filter[Progetto][_eq]': progettoId,
        'filter[Tranche][_eq]': tranche,
        fields: 'id,Famiglia,Progetto,AnnoBando,Tranche,Stato'
      }
    })
  },

  create(data) {
    return api.post('/items/Rendicontazioni', data)
  }
}
