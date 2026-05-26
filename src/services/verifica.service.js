import api from './api'

export const verificaService = {
  getProgetti() {
    return api.get('/items/Progetti', {
      params: {
        limit: -1,
        sort: 'Famiglia,AnnoBando,Cognome_e__Nome_Beneficiario',
        fields: [
          'id_progetto',
          'AnnoBando',
          'Allocato',
          'Ambito',
          'Cognome_e__Nome_Beneficiario',
          'Eta',
          'Titolo_Progetto',
          'Famiglia.id_famiglia',
          'Famiglia.Nome_Famiglia',
          'Famiglia.IBAN',
          'Famiglia.Intestatario_CC'
        ].join(',')
      }
    })
  },

  getGiustificativi() {
    return api.get('/items/Giustificativi', {
      params: {
        limit: -1,
        sort: 'Data',
        fields: [
          '*',
          'Progetto',
          'Tranche',
          'Rendicontazione.id',
          'Rendicontazione.Tranche',
          'Rendicontazione.Stato'
        ].join(',')
      }
    })
  },

  updateFamiglia(id, data) {
    return api.patch(`/items/Famiglie/${id}`, data)
  }
}
