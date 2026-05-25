import api from './api'

export const famiglieService = {
  getFamiglieByVolontario(contattoId) {
    return api.get('/items/Famiglie_Contatti', {
      params: {
        'filter[Ruolo_nella_Famiglia][_eq]': 'Volontario',
        'filter[Contatto][_eq]': contattoId
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
          'Progetti.Cognome_e__Nome_Beneficiario',
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

  update(famigliaId, data) {
    return api.patch(`/items/Famiglie/${famigliaId}`, data)
  },

  getGenitoriByFamiglia(famigliaId) {
    return api.get('/items/Famiglie_Contatti', {
      params: {
        'filter[Famiglia][_eq]': famigliaId,
        'filter[Ruolo_nella_Famiglia][_eq]': 'Genitore',
        'fields': [
          'id',
          'Contatto.id_contatto',
          'Contatto.Nome',
          'Contatto.Cognome',
          'Contatto.Numero_di_cellulare',
          'Contatto.Numero_di_telefono'
        ].join(',')
      }
    })
  },

  getEmailByContatto(contattoIds) {
    const ids = Array.isArray(contattoIds) ? contattoIds.join(',') : contattoIds
    return api.get('/items/email', {
      params: {
        'filter[Contatto_Relation][_in]': ids,
        'filter[Primary][_eq]': 'true',
        'fields': 'id,email_address,Contatto_Relation'
      }
    })
  }
}
