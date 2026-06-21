import api from './api'

export const pagamentiService = {
  getPagamenti(params = {}) {
    return api.get('/items/Pagamenti', { params })
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
