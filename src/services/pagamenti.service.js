import { STATO_PAGAMENTO } from 'src/utils/constants'
import api from './api'

export const pagamentiService = {
  getPagamenti(params = {}) {
    return api.get('/items/Pagamenti', { params })
  },

  getByProgetto(progettoId) {
    return api.get('/items/Pagamenti', {
      params: {
        'filter[Progetto][_eq]': progettoId,
        'filter[Stato][_in]': [STATO_PAGAMENTO.PROPOSTO, STATO_PAGAMENTO.IN_PAGAMENTO, STATO_PAGAMENTO.PAGATO].join(
          ','
        ),
        fields: 'id,Stato,Importo,DataProposta,DataPagamento',
        sort: '-DataProposta',
        limit: -1
      }
    })
  },

  createPagamento(data) {
    return api.post('/items/Pagamenti', data)
  },

  updatePagamento(id, data) {
    return api.patch(`/items/Pagamenti/${id}`, data)
  },

  deletePagamento(id) {
    return api.delete(`/items/Pagamenti/${id}`)
  },

  getBatch(id) {
    return api.get(`/items/BatchPagamenti/${id}`)
  },

  createBatch(data) {
    return api.post('/items/BatchPagamenti', data)
  },

  getBatches(params = {}) {
    return api.get('/items/BatchPagamenti', { params })
  }
}
