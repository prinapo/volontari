import api from './api'

export const gestioneService = {
  getFamiglie({ page = 1, limit = 25, sort, search, meta } = {}) {
    const params = {
      fields: [
        'id_famiglia',
        'Nome_Famiglia',
        'IBAN',
        'Intestatario_CC'
      ].join(','),
      limit,
      page
    }
    if (sort) params.sort = sort
    if (search) params['filter[Nome_Famiglia][_icontains]'] = search
    if (meta) params.meta = meta
    return api.get('/items/Famiglie', { params })
  },

  createFamiglia(data) {
    return api.post('/items/Famiglie', data)
  },

  updateFamiglia(id, data) {
    return api.patch(`/items/Famiglie/${id}`, data)
  },

  searchFamiglie(q) {
    return api.get('/items/Famiglie', {
      params: {
        'filter[Nome_Famiglia][_icontains]': q,
        fields: 'id_famiglia,Nome_Famiglia',
        limit: 20
      }
    })
  },

  getFamiglieByContatto(contattoId) {
    return api.get('/items/Famiglie_Contatti', {
      params: {
        'filter[Contatto][_eq]': contattoId,
        'filter[_or][0][Disattivo][_null]': true,
        'filter[_or][1][Disattivo][_eq]': false,
        fields: [
          'id',
          'Ruolo_nella_Famiglia',
          'Contatto',
          'Famiglia.id_famiglia',
          'Famiglia.Nome_Famiglia'
        ].join(',')
      }
    })
  },

  queryFamiglieContatti(contattoIds) {
    const ids = Array.isArray(contattoIds) ? contattoIds.join(',') : contattoIds
    return api.get('/items/Famiglie_Contatti', {
      params: {
        'filter[Contatto][_in]': ids,
        'filter[_or][0][Disattivo][_null]': true,
        'filter[_or][1][Disattivo][_eq]': false,
        fields: [
          'id',
          'Ruolo_nella_Famiglia',
          'Contatto',
          'Famiglia.id_famiglia',
          'Famiglia.Nome_Famiglia'
        ].join(','),
        limit: -1
      }
    })
  },

  getContattiByFamiglia(famigliaId) {
    return api.get('/items/Famiglie_Contatti', {
      params: {
        filter: JSON.stringify({
          _and: [
            { Famiglia: { _eq: famigliaId } },
            { _or: [
              { Disattivo: { _null: true } },
              { Disattivo: { _eq: false } }
            ]}
          ]
        }),
        fields: [
          'id',
          'Ruolo_nella_Famiglia',
          'Contatto.id_contatto',
          'Contatto.Nome',
          'Contatto.Cognome',
          'Contatto.Numero_di_cellulare',
          'Contatto.Numero_di_telefono'
        ].join(',')
      }
    })
  },

  async assignToFamiglia(data) {
    const { Contatto, Famiglia, Ruolo_nella_Famiglia } = data
    const active = await api.get('/items/Famiglie_Contatti', {
      params: {
        'filter[Contatto][_eq]': Contatto,
        'filter[Famiglia][_eq]': Famiglia,
        'filter[Ruolo_nella_Famiglia][_eq]': Ruolo_nella_Famiglia,
        'filter[_or][0][Disattivo][_null]': true,
        'filter[_or][1][Disattivo][_eq]': false,
        'limit': 1
      }
    })
    const activeItems = active.data.data || []
    if (activeItems.length > 0) return
    const inactive = await api.get('/items/Famiglie_Contatti', {
      params: {
        'filter[Contatto][_eq]': Contatto,
        'filter[Famiglia][_eq]': Famiglia,
        'filter[Ruolo_nella_Famiglia][_eq]': Ruolo_nella_Famiglia,
        'filter[Disattivo][_eq]': true,
        'limit': 1
      }
    })
    const items = inactive.data.data || []
    if (items.length > 0) {
      return api.patch(`/items/Famiglie_Contatti/${items[0].id}`, { Disattivo: false })
    }
    return api.post('/items/Famiglie_Contatti', data)
  },

  removeFromFamiglia(fcId) {
    return api.patch(`/items/Famiglie_Contatti/${fcId}`, { Disattivo: true })
  }
}
