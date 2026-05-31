import api from './api'

export const gestioneService = {
  queryContatti({ limit = 25, offset = 0, sort, search, isVolontario, isGenitore, stato }) {
    const filter = {}

    if (search) {
      filter._or = [
        { Nome: { _contains: search } },
        { Cognome: { _contains: search } },
        { email: { _some: { email_address: { _contains: search } } } }
      ]
    }

    if (isVolontario === true) {
      filter.IsVolontario = { _eq: true }
    } else if (isGenitore === true) {
      filter.IsGenitore = { _eq: true }
      filter.IsVolontario = { _eq: false }
    } else if (isVolontario === false && isGenitore === false) {
      filter.IsVolontario = { _eq: false }
      filter.IsGenitore = { _eq: false }
    }

    if (stato === 'Attivi') {
      filter['user_id.status'] = { _neq: 'suspended' }
    } else if (stato === 'Disattivati') {
      filter['user_id.status'] = { _eq: 'suspended' }
    }

    return api.get('/items/contatti', {
      params: {
        filter: JSON.stringify(filter),
        fields: [
          'id_contatto',
          'Nome',
          'Cognome',
          'Numero_di_cellulare',
          'Numero_di_telefono',
          'IsVolontario',
          'IsGenitore',
          'user_id'
        ].join(','),
        sort: sort || 'Cognome',
        limit,
        offset,
        meta: 'filter_count'
      }
    })
  },

  getUsersByIds(ids) {
    const list = Array.isArray(ids) ? ids.join(',') : ids
    return api.get('/users', {
      params: {
        'filter[id][_in]': list,
        fields: 'id,email,status,last_access',
        limit: -1
      }
    })
  },

  createContatto(data) {
    return api.post('/items/contatti', data)
  },

  updateContatto(id, data) {
    return api.patch(`/items/contatti/${id}`, data)
  },

  getEmailByContatto(contattoIds) {
    const ids = Array.isArray(contattoIds) ? contattoIds.join(',') : contattoIds
    return api.get('/items/email', {
      params: {
        'filter[Contatto_Relation][_in]': ids,
        'filter[Primary][_eq]': 'true',
        fields: 'id,email_address,Contatto_Relation'
      }
    })
  },

  getEmailRecordByContatto(contattoId) {
    return api.get('/items/email', {
      params: {
        'filter[Contatto_Relation][_eq]': contattoId,
        'filter[Primary][_eq]': 'true'
      }
    })
  },

  getContattoById(id) {
    return api.get(`/items/contatti/${id}`, {
      params: {
        fields: 'id_contatto,Nome,Cognome,user_id,email.email_address,email.Primary'
      }
    })
  },

  searchUsersByEmail(email) {
    return api.get('/users', {
      params: {
        'filter[email][_eq]': email,
        fields: 'id,email',
        limit: 1
      }
    })
  },

  createEmail(data) {
    return api.post('/items/email', data)
  },

  updateEmail(id, data) {
    return api.patch(`/items/email/${id}`, data)
  },

  getFamiglie() {
    return api.get('/items/Famiglie', {
      params: {
        fields: [
          'id_famiglia',
          'Nome_Famiglia',
          'IBAN',
          'Intestatario_CC'
        ].join(',')
      }
    })
  },

  createFamiglia(data) {
    return api.post('/items/Famiglie', data)
  },

  updateFamiglia(id, data) {
    return api.patch(`/items/Famiglie/${id}`, data)
  },

  getFamiglieByContatto(contattoId) {
    return api.get('/items/Famiglie_Contatti', {
      params: {
        'filter[Contatto][_eq]': contattoId,
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
  },

  searchContatti(q, excludeWithUserId) {
    if (!q || !q.trim()) {
      return api.get('/items/contatti', {
        params: {
          fields: 'id_contatto,Nome,Cognome,email.email_address,email.Primary',
          limit: 20
        }
      })
    }
    const filter = {
      _or: [
        { Nome: { _icontains: q } },
        { Cognome: { _icontains: q } },
        { email: { _some: { email_address: { _icontains: q } } } }
      ]
    }
    if (excludeWithUserId) {
      filter.user_id = { _null: true }
    }
    return api.get('/items/contatti', {
      params: {
        'filter': JSON.stringify(filter),
        fields: 'id_contatto,Nome,Cognome,email.email_address,email.Primary',
        limit: 20
      }
    })
  },

  searchFamiglie(q) {
    return api.get('/items/Famiglie', {
      params: {
        'filter[Nome_Famiglia][_contains]': q,
        fields: 'id_famiglia,Nome_Famiglia',
        limit: 20
      }
    })
  },

  createDirectusUser(data) {
    return api.post('/users', data)
  },

  updateDirectusUser(id, data) {
    return api.patch(`/users/${id}`, data)
  },

  sendInvite(email, resetUrl) {
    const data = { email }
    if (resetUrl) data.reset_url = resetUrl
    return api.post('/auth/password/request', data)
  }
}
