import api from './api'

export const dashboardService = {
  getProgetti() {
    return api.get('/items/Progetti', {
      params: {
        limit: -1,
        fields: [
          'id_progetto',
          'AnnoBando',
          'Allocato',
          'TotaleImporto',
          'TotaleVerificato',
          'TotaleProposto',
          'TotaleInPagamento',
          'TotalePagato',
          'ResiduoAllocato',
          'StatoProgetto',
          'StatoRendicontazione',
          'Ambito',
          'Famiglia',
          'MassimaPercentualeErogabile',
          'TotaleGiustificativi',
          'Indice_Gravita_Disabilita',
          'ISEE'
        ]
      }
    })
  },

  getPagamenti() {
    return api.get('/items/Pagamenti', {
      params: {
        limit: -1,
        fields: ['Stato', 'Importo', 'DataProposta', 'Progetto']
      }
    })
  }
}
