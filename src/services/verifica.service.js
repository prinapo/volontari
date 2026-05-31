import api from './api'

export const verificaService = {
  getProgetti({ page = 1, limit = 25, sort, search, anno, meta } = {}) {
    const params = {
      limit,
      page,
      sort: sort || 'Famiglia,AnnoBando,Cognome_e__Nome_Beneficiario',
      fields: [
        'id_progetto',
        'AnnoBando',
        'Allocato',
        'Ambito',
        'Cognome_e__Nome_Beneficiario',
        'Titolo_Progetto',
        'Famiglia'
      ].join(',')
    }
    if (meta) params.meta = meta
    if (search) params['filter[Famiglia][Nome_Famiglia][_icontains]'] = search
    if (anno) params['filter[AnnoBando][_eq]'] = anno
    return api.get('/items/Progetti', { params })
  },

  getGiustificativiByProgetti(progettoIds) {
    return api.get('/items/Giustificativi', {
      params: {
        'filter[Progetto][_in]': progettoIds.join(','),
        sort: 'Data',
        fields: [
          'id',
          'Descrizione',
          'Importo',
          'Data',
          'Stato',
          'Allegato',
          'Tranche',
          'Progetto',
          'Invalidato',
          'Rendicontazione.Tranche'
        ].join(',')
      }
    })
  },

  getGiustificativiByProgettiLight(progettoIds) {
    return api.get('/items/Giustificativi', {
      params: {
        'filter[Progetto][_in]': progettoIds.join(','),
        sort: 'Data',
        fields: 'id,Descrizione,Importo,Data,Stato,Allegato,Tranche,Progetto,Invalidato,Rendicontazione'
      }
    })
  },

  getAnniBando() {
    return api.get('/items/Progetti', {
      params: {
        fields: 'AnnoBando',
        limit: -1,
        sort: '-AnnoBando',
        'filter[AnnoBando][_nnull]': 'true'
      }
    })
  },

  getRendicontazioniBatch(ids) {
    const idList = Array.isArray(ids) ? ids.join(',') : ids
    return api.get('/items/Rendicontazioni', {
      params: {
        'filter[id][_in]': idList,
        fields: 'id,Tranche'
      }
    })
  },

  updateFamiglia(id, data) {
    return api.patch(`/items/Famiglie/${id}`, data)
  },

  getSubmissionsInAttesa() {
    return api.get('/items/InviiGiustificativiNoLogin', {
      params: {
        'filter[stato][_eq]': 'in_attesa',
        sort: '-data_invio',
        limit: -1
      }
    })
  },

  updateSubmission(id, data) {
    return api.patch(`/items/InviiGiustificativiNoLogin/${id}`, data)
  },

  findFamigliaByIBAN(iban, intestatario) {
    return api.get('/items/Famiglie', {
      params: {
        'filter[IBAN][_eq]': iban,
        'filter[Intestatario_CC][_eq]': intestatario
      }
    })
  },

  searchFamiglie(search) {
    return api.get('/items/Famiglie', {
      params: {
        'filter[Nome_Famiglia][_icontains]': search,
        limit: 20,
        fields: 'id_famiglia,Nome_Famiglia,IBAN,Intestatario_CC'
      }
    })
  },

  findProgettoByFamiglia(famigliaId, cognome) {
    return api.get('/items/Progetti', {
      params: {
        'filter[Famiglia][_eq]': famigliaId,
        'filter[Cognome_e__Nome_Beneficiario][_icontains]': cognome.trim()
      }
    })
  }
}
