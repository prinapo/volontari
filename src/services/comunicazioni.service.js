import api from './api'

const STORICO_FIELDS = [
  'id',
  'Email',
  'Esito',
  'Errore',
  'BrevoMessageId',
  'Comunicazione.id',
  'Comunicazione.Oggetto',
  'Comunicazione.DataInvio',
  'Comunicazione.Mittente.first_name',
  'Comunicazione.Mittente.last_name'
].join(',')

export const comunicazioniService = {
  ping() {
    return api.get('/communications/ping')
  },

  countRecipients(payload) {
    return api.post('/communications/recipients', payload)
  },

  send(payload) {
    return api.post('/communications/send', payload)
  },

  getStoricoByContatto(contattoId) {
    return api.get('/items/Comunicazioni_Contatti', {
      params: {
        'filter[Contatto][_eq]': contattoId,
        fields: STORICO_FIELDS,
        sort: '-Comunicazione.DataInvio',
        limit: 50
      }
    })
  },

  getStoricoByFamiglia(famigliaId) {
    return api.get('/items/Comunicazioni_Contatti', {
      params: {
        'filter[Famiglia][_eq]': famigliaId,
        fields: STORICO_FIELDS,
        sort: '-Comunicazione.DataInvio',
        limit: 50
      }
    })
  },

  getProgetti({ filter, fields = 'Famiglia', limit = -1 } = {}) {
    return api.get('/items/Progetti', {
      params: { filter: JSON.stringify(filter || {}), fields, limit }
    })
  },

  getGiustificativi({ filter, fields = 'Famiglia,Stato,Invalidato', limit = -1 } = {}) {
    return api.get('/items/Giustificativi', {
      params: { filter: JSON.stringify(filter || {}), fields, limit }
    })
  },

  getPagamenti({ filter, fields = 'Famiglia,Stato', limit = -1 } = {}) {
    return api.get('/items/Pagamenti', {
      params: { filter: JSON.stringify(filter || {}), fields, limit }
    })
  },

  getFamiglieContatti({ filter, fields = 'Famiglia,Ruolo_nella_Famiglia', limit = -1 } = {}) {
    return api.get('/items/Famiglie_Contatti', {
      params: { filter: JSON.stringify(filter || {}), fields, limit }
    })
  }
}
