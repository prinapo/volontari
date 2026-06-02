import api from './api'

export const adminService = {
  getRoles() {
    return api.get('/roles', {
      params: {
        fields: ['id', 'name', 'description', 'icon'].join(','),
        limit: -1
      }
    })
  },

  getUsers() {
    return api.get('/users', {
      params: {
        fields: ['id', 'email', 'first_name', 'last_name', 'role.id', 'role.name'].join(','),
        limit: -1
      }
    })
  },

  updateUser(id, data) {
    return api.patch(`/users/${id}`, data)
  },

  createUser(data) {
    return api.post('/users', data)
  },

  searchContattoByEmail(email) {
    return api.get('/items/email', {
      params: {
        'filter[email_address][_eq]': email,
        fields: ['id', 'email_address', 'Contatto_Relation.id_contatto', 'Contatto_Relation.Nome', 'Contatto_Relation.Cognome'].join(',')
      }
    })
  },

  createContatto(data) {
    return api.post('/items/contatti', data)
  },

  createEmail(data) {
    return api.post('/items/email', data)
  },

  sendEmail(data) {
    return api.post('/mail', data)
  }
}
