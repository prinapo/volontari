import api from './api'

export const emailService = {
  getByContatto(contattoIds) {
    const ids = Array.isArray(contattoIds) ? contattoIds.join(',') : contattoIds
    return api.get('/items/email', {
      params: {
        'filter[Contatto_Relation][_in]': ids,
        'filter[Primary][_eq]': 'true',
        fields: 'id,email_address,Contatto_Relation,Primary',
        limit: -1
      }
    })
  },

  getAllByContatto(contattoId) {
    return api.get('/items/email', {
      params: {
        'filter[Contatto_Relation][_eq]': contattoId,
        fields: 'id,email_address,Contatto_Relation,Primary',
        limit: -1
      }
    })
  },

  getRecordByContatto(contattoId) {
    return api.get('/items/email', {
      params: {
        'filter[Contatto_Relation][_eq]': contattoId,
        'filter[Primary][_eq]': 'true'
      }
    })
  },

  create(data) {
    return api.post('/items/email', data)
  },

  update(id, data) {
    return api.patch(`/items/email/${id}`, data)
  },

  remove(id) {
    return api.delete(`/items/email/${id}`)
  }
}
