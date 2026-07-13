import { RUOLI_FAMIGLIA } from 'src/utils/constants'
import api from './api'

export const famiglieService = {
  getFamiglieByVolontario(contattoId) {
    return api.get('/items/Famiglie_Contatti', {
      params: {
        'filter[Ruolo_nella_Famiglia][_eq]': RUOLI_FAMIGLIA.VOLONTARIO,
        'filter[Contatto][_eq]': contattoId,
        fields: ['id', 'Famiglia.id_famiglia', 'Famiglia.Nome_Famiglia'].join(',')
      }
    })
  },

  getById(famigliaId) {
    return api.get(`/items/Famiglie/${famigliaId}`, {
      params: {
        fields: [
          'id_famiglia',
          'Nome_Famiglia',
          'IBAN',
          'Intestatario_CC',
          'Progetti.id_progetto',
          'Progetti.Cognome_Beneficiario',
          'Progetti.Nome_Beneficiario',
          'Progetti.Eta',
          'Progetti.AnnoBando',
          'Progetti.Ambito',
          'Progetti.Allocato',
          'Progetti.Data_Inizio_Progetto',
          'Progetti.Data_Fine_Progetto'
        ].join(',')
      }
    })
  },

  getFamiglieBatch(ids) {
    const idList = Array.isArray(ids) ? ids.join(',') : ids
    return api.get('/items/Famiglie', {
      params: {
        'filter[id_famiglia][_in]': idList,
        fields: 'id_famiglia,Nome_Famiglia,IBAN,Intestatario_CC',
        limit: -1
      }
    })
  },

  update(famigliaId, data) {
    return api.patch(`/items/Famiglie/${famigliaId}`, data)
  },

  getGenitoriByFamiglia(famigliaId) {
    return api.get('/items/Famiglie_Contatti', {
      params: {
        'filter[Famiglia][_eq]': famigliaId,
        'filter[Ruolo_nella_Famiglia][_eq]': 'Genitore',
        fields: [
          'id',
          'Contatto.id_contatto',
          'Contatto.Nome',
          'Contatto.Cognome',
          'Contatto.user_id',
          'Contatto.Numero_di_cellulare',
          'Contatto.Numero_di_telefono',
          'Contatto.email.email_address',
          'Contatto.email.Primary'
        ].join(',')
      }
    })
  },

  getFamiglieByContatto(contattoId) {
    return api.get('/items/Famiglie_Contatti', {
      params: {
        filter: JSON.stringify({
          Contatto: { _eq: contattoId },
          _or: [{ Disattivo: { _null: true } }, { Disattivo: { _eq: false } }]
        }),
        fields: [
          'id',
          'Famiglia',
          'Famiglia.id_famiglia',
          'Famiglia.Nome_Famiglia',
          'Famiglia.IBAN',
          'Famiglia.Intestatario_CC',
          'Ruolo_nella_Famiglia'
        ].join(',')
      }
    })
  },

  getVolontariByFamiglia(famigliaId) {
    return api.get('/items/Famiglie_Contatti', {
      params: {
        'filter[Famiglia][_eq]': famigliaId,
        'filter[Ruolo_nella_Famiglia][_eq]': RUOLI_FAMIGLIA.VOLONTARIO,
        fields: [
          'id',
          'Contatto.id_contatto',
          'Contatto.Nome',
          'Contatto.Cognome',
          'Contatto.user_id',
          'Contatto.Numero_di_cellulare',
          'Contatto.Numero_di_telefono',
          'Contatto.email.email_address',
          'Contatto.email.Primary'
        ].join(',')
      }
    })
  }
}
