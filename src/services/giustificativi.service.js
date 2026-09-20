import { STATO_GIUSTIFICATIVO } from 'src/utils/constants'
import api from './api'

export const giustificativiService = {
  getByProgetto(progettoId) {
    return api.get('/items/Giustificativi', {
      params: {
        'filter[Progetto][_eq]': progettoId,
        sort: '-Data',
        limit: -1,
        fields: ['*', 'Rendicontazione', 'Allegato.id', 'Allegato.filename_download'].join(',')
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
      Stato: STATO_GIUSTIFICATIVO.INVIATO
    })
  },

  invalidate(id) {
    return api.patch(`/items/Giustificativi/${id}`, {
      Invalidato: true,
      Pagamento: null
    })
  },

  verify(id) {
    return api.patch(`/items/Giustificativi/${id}`, {
      Stato: STATO_GIUSTIFICATIVO.VERIFICATO,
      DataVerifica: new Date().toISOString(),
      Pagamento: null
    })
  },

  reject(id, nota) {
    return api.patch(`/items/Giustificativi/${id}`, {
      Stato: STATO_GIUSTIFICATIVO.RIFIUTATO,
      NotaRifiuto: nota,
      Pagamento: null
    })
  },

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

  createRendicontazione(data) {
    return api.post('/items/Rendicontazioni', data)
  }
}
