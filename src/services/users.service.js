import api from './api'

export const usersService = {
  getByIds(ids) {
    const list = Array.isArray(ids) ? ids.join(',') : ids
    return api.get('/users', {
      params: {
        'filter[id][_in]': list,
        fields: 'id,email,status,last_access',
        limit: -1
      }
    })
  },

  searchByEmail(email) {
    return api.get('/users', {
      params: {
        'filter[email][_eq]': email.toLowerCase(),
        fields: 'id,email',
        limit: 1
      }
    })
  },

  create(data) {
    return api.post('/users', data)
  },

  update(id, data) {
    return api.patch(`/users/${id}`, data)
  },

  sendInvite(email, resetUrl) {
    const data = { email }
    if (resetUrl) data.reset_url = resetUrl
    return api.post('/auth/password/request', data)
  },

  getRoleByName(name) {
    return api.get('/roles', {
      params: {
        'filter[name][_eq]': name,
        fields: 'id,name',
        limit: 1
      }
    })
  },

  searchByRoleNull() {
    return api.get('/users', {
      params: {
        'filter[role][_null]': 'true',
        fields: 'id,email',
        limit: -1
      }
    })
  }
}
