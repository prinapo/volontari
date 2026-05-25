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

  update(id, data) {
    return api.patch(`/items/contatti/${id}`, data)
  }
}
