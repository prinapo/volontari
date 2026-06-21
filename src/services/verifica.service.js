import api from './api'

export const verificaService = {
  getProgetti({ page = 1, limit = 25, sort, search, anno, rendicontazioneFilter, meta } = {}) {
    const params = {
      limit,
      page,
      sort: sort || 'Famiglia,AnnoBando,Cognome_Beneficiario,Nome_Beneficiario',
      fields: [
        'id_progetto', 'AnnoBando', 'Allocato', 'Ambito',
        'Cognome_Beneficiario', 'Nome_Beneficiario', 'Titolo_Progetto', 'Famiglia',
        'StatoRendicontazione', 'TotaleGiustificativi', 'TotaleImporto',
        'Data_Inizio_Progetto', 'Data_Fine_Progetto', 'Eta',
        'Descrizione_Progetto', 'Descrizione_Condizione', 'Dettaglio_Costi',
        'Relazione_con_il_soggetto_richiedente',
        'Allegati_Progetto.directus_files_id.id',
        'Allegati_Progetto.directus_files_id.filename_download',
        'Allegati_ISEE.directus_files_id.id',
        'Allegati_ISEE.directus_files_id.filename_download',
        'Allegati_Giustificativi.directus_files_id.id',
        'Allegati_Giustificativi.directus_files_id.filename_download'
      ].join(',')
    }
    if (meta) params.meta = meta
    if (search) params['filter[Famiglia][Nome_Famiglia][_icontains]'] = search
    if (anno) params['filter[AnnoBando][_eq]'] = anno
    if (rendicontazioneFilter) params['filter[StatoRendicontazione][_eq]'] = rendicontazioneFilter
    return api.get('/items/Progetti', { params })
  },

  getGiustificativiByProgetti(progettoIds) {
    return api.get('/items/Giustificativi', {
      params: {
        'filter[Progetto][_in]': progettoIds.join(','),
        sort: 'Data',
        limit: -1,
        fields: [
          'id',
          'Descrizione',
          'Importo',
          'Data',
          'Stato',
          'Allegato',
          'Progetto',
          'Invalidato'
        ].join(',')
      }
    })
  },

  getGiustificativiByProgetto(progettoId) {
    return this.getGiustificativiByProgetti([progettoId])
  },

  getGiustificativiByProgettiLight(progettoIds) {
    return api.get('/items/Giustificativi', {
      params: {
        'filter[Progetto][_in]': progettoIds.join(','),
        sort: 'Data',
        limit: -1,
        fields: 'id,Descrizione,Importo,Data,Stato,Allegato,Progetto,Invalidato,Rendicontazione'
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
        fields: 'id',
        limit: -1
      }
    })
  },

  getSubmissions({ page = 1, limit = 25, includeScartati = false, meta } = {}) {
    const filter = includeScartati
      ? { _or: [
          { stato: { _eq: 'in_attesa' } },
          { stato: { _eq: 'scartato' } }
        ]}
      : { stato: { _eq: 'in_attesa' } }
    const params = {
      filter: JSON.stringify(filter),
      sort: '-data_invio',
      limit,
      page
    }
    if (meta) params.meta = meta
    return api.get('/items/InviiGiustificativiNoLogin', { params })
  },

  getSubmissionsInAttesa() {
    return this.getSubmissions({ limit: -1 })
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
    const params = { limit: 20, fields: 'id_famiglia,Nome_Famiglia,IBAN,Intestatario_CC' }
    if (search && search.trim()) {
      params['filter[Nome_Famiglia][_icontains]'] = search.trim()
    }
    return api.get('/items/Famiglie', params)
  },

  findProgettoByFamiglia(famigliaId) {
    return api.get('/items/Progetti', {
      params: {
        'filter[Famiglia][_eq]': famigliaId,
        limit: -1
      }
    })
  },

  updateProgetto(progettoId, data) {
    return api.patch(`/items/Progetti/${progettoId}`, data)
  }
}
