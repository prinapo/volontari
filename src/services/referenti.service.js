import api from './api'

export const referentiService = {
  getByVolontario(volontarioId) {
    return api.get('/items/Volontari_Referenti', {
      params: {
        'filter[Volontario][_eq]': volontarioId,
        fields:
          'id,Volontario,Referente,Referente.id_contatto,Referente.Nome,Referente.Cognome,Referente.Numero_di_cellulare,Referente.Numero_di_telefono',
        limit: -1
      }
    })
  },

  getByVolontari(volontarioIds) {
    const ids = Array.isArray(volontarioIds) ? volontarioIds.join(',') : volontarioIds
    return api.get('/items/Volontari_Referenti', {
      params: {
        'filter[Volontario][_in]': ids,
        fields: 'id,Volontario,Referente,Referente.id_contatto,Referente.Nome,Referente.Cognome',
        limit: -1
      }
    })
  },

  create(volontarioId, referenteId) {
    return api.post('/items/Volontari_Referenti', {
      Volontario: volontarioId,
      Referente: referenteId
    })
  },

  remove(id) {
    return api.delete(`/items/Volontari_Referenti/${id}`)
  }
}
