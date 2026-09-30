import api from './api'

const NOTE_FIELDS = [
  'id',
  'Progetto',
  'Testo',
  'AutoreNome',
  'user_created.first_name',
  'user_created.last_name',
  'date_created'
].join(',')

export const noteProgettiService = {
  getByProgetto(progettoId) {
    return api.get('/items/NoteProgetti', {
      params: {
        'filter[Progetto][_eq]': progettoId,
        sort: '-date_created',
        limit: -1,
        fields: NOTE_FIELDS
      }
    })
  },

  getByProgetti(progettoIds) {
    const idList = Array.isArray(progettoIds) ? progettoIds.join(',') : progettoIds
    return api.get('/items/NoteProgetti', {
      params: {
        'filter[Progetto][_in]': idList,
        sort: 'date_created',
        limit: -1,
        fields: NOTE_FIELDS
      }
    })
  },

  create(data) {
    return api.post('/items/NoteProgetti', data)
  }
}
