import api from './api'

export const contattiService = {
  getByUserId(userId) {
    return api.get('/items/contatti', {
      params: {
        'filter[user_id][_eq]': userId,
        fields: 'id_contatto,Nome,Cognome'
      }
    })
  },

  getByEmail(email) {
    return api.get('/items/contatti', {
      params: {
        'filter[email][email_address][_eq]': email.toLowerCase(),
        fields:
          'id_contatto,Nome,Cognome,Numero_di_cellulare,Numero_di_telefono,IsGenitore,IsVolontario,IsReferente,email.email_address,email.Primary,email.id'
      }
    })
  },

  getByEmails(emails) {
    const list = Array.isArray(emails) ? emails : [emails]
    return api.get('/items/contatti', {
      params: {
        'filter[email][email_address][_in]': list.map(e => e.toLowerCase()).join(','),
        fields:
          'id_contatto,Nome,Cognome,Numero_di_cellulare,Numero_di_telefono,IsGenitore,IsVolontario,IsReferente,email.email_address,email.Primary,email.id',
        limit: -1
      }
    })
  },

  query({ limit = 25, offset = 0, sort, search, isVolontario, isGenitore, isReferente, stato }) {
    const filter = {}

    if (search) {
      filter._or = [
        { Nome: { _icontains: search } },
        { Cognome: { _icontains: search } },
        { email: { _some: { email_address: { _icontains: search } } } }
      ]
    }

    if (isVolontario === true) {
      filter.IsVolontario = { _eq: true }
    } else if (isGenitore === true) {
      filter.IsGenitore = { _eq: true }
      filter.IsVolontario = { _eq: false }
    } else if (isReferente === true) {
      filter.IsReferente = { _eq: true }
    } else if (isVolontario === false && isGenitore === false && isReferente === false) {
      filter.IsVolontario = { _eq: false }
      filter.IsGenitore = { _eq: false }
      filter.IsReferente = { _eq: false }
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
          'IsReferente',
          'user_id'
        ].join(','),
        sort: sort || 'Cognome',
        limit,
        offset,
        meta: 'filter_count'
      }
    })
  },

  getById(id) {
    return api.get(`/items/contatti/${id}`, {
      params: {
        fields: 'id_contatto,Nome,Cognome,user_id,email.email_address,email.Primary'
      }
    })
  },

  search(q, excludeWithUserId) {
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
        filter: JSON.stringify(filter),
        fields: 'id_contatto,Nome,Cognome,email.email_address,email.Primary',
        limit: 20
      }
    })
  },

  create(data) {
    return api.post('/items/contatti', data)
  },

  update(id, data) {
    return api.patch(`/items/contatti/${id}`, data)
  },

  getVolontariSenzaUtente() {
    return api.get('/items/contatti', {
      params: {
        'filter[IsVolontario][_eq]': true,
        'filter[user_id][_null]': true,
        fields: 'id_contatto,Nome,Cognome,email.email_address,email.Primary',
        limit: -1
      }
    })
  }
}
