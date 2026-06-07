import api from './api'

export const deduplicaService = {
  getAllEmails() {
    return api.get('/items/email', {
      params: {
        limit: -1,
        fields: ['id', 'email_address', 'Contatto_Relation', 'Primary'].join(',')
      }
    })
  },

  getContatto(id) {
    return api.get(`/items/contatti/${id}`, {
      params: {
        fields: [
          'id_contatto',
          'Nome',
          'Cognome',
          'Numero_di_cellulare',
          'Numero_di_telefono',
          'IsVolontario',
          'IsGenitore',
          'IsReferente',
          'user_id'
        ].join(',')
      }
    })
  },

  updateContatto(id, data) {
    return api.patch(`/items/contatti/${id}`, data)
  },

  getFamiglieByContatto(contattoId) {
    return api.get('/items/Famiglie_Contatti', {
      params: {
        'filter[Contatto][_eq]': contattoId,
        fields: ['id', 'Famiglia', 'Ruolo_nella_Famiglia'].join(',')
      }
    })
  },

  updateFamigliaContatto(fcId, data) {
    return api.patch(`/items/Famiglie_Contatti/${fcId}`, data)
  },

  updateEmail(id, data) {
    return api.patch(`/items/email/${id}`, data)
  },

  deleteEmail(id) {
    return api.delete(`/items/email/${id}`)
  },

  deleteContatto(id) {
    return api.delete(`/items/contatti/${id}`)
  },

  getIdDuplicates(table, idField) {
    return api.get(`/items/${table}`, {
      params: {
        aggregate: { count: '*' },
        groupBy: [idField],
        limit: -1
      }
    })
  }
}
