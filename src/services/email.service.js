import api from './api'

function isEmailUniqueError(error) {
  const code = error?.response?.data?.errors?.[0]?.extensions?.code
  const message = error?.response?.data?.errors?.[0]?.message || ''
  return code === 'UNIQUE_VIOLATION' || message.includes('unique constraint')
}

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

  async createSafe(data) {
    try {
      return await this.create(data)
    } catch (error) {
      if (isEmailUniqueError(error)) {
        throw new Error('Questa email è già utilizzata da un altro contatto.')
      }
      throw error
    }
  },

  update(id, data) {
    return api.patch(`/items/email/${id}`, data)
  },

  async updateSafe(id, data) {
    try {
      return await this.update(id, data)
    } catch (error) {
      if (isEmailUniqueError(error)) {
        throw new Error('Questa email è già utilizzata da un altro contatto.')
      }
      throw error
    }
  },

  remove(id) {
    return api.delete(`/items/email/${id}`)
  }
}
