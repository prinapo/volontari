import api from './api'

export const revisionsService = {
  /**
   * Ottiene la cronologia delle revisioni per un record specifico,
   * filtrate lato server per collezione e item.
   * @param {string} collection - Nome della collezione Directus
   * @param {string|number} itemId - ID del record
   * @param {number} [limit=20] - Numero massimo di revisioni
   * @returns {Promise<Array>} Array di revisioni con delta, activity.timestamp, activity.action, activity.user
   */
  async getRevisions(collection, itemId, limit = 20) {
    const res = await api.get('/revisions', {
      params: {
        'filter[collection][_eq]': collection,
        'filter[item][_eq]': String(itemId),
        'fields[]': [
          'id',
          'delta',
          'activity.timestamp',
          'activity.action',
          'activity.user.email',
          'activity.user.first_name',
          'activity.user.last_name'
        ],
        sort: '-activity.timestamp',
        limit
      }
    })
    return res.data.data || []
  },

  /**
   * Ottiene le revisioni in batch per più record della stessa collezione.
   * @param {string} collection - Nome della collezione Directus
   * @param {string[]} itemIds - Array di ID dei record
   * @param {number} [limit=50]
   * @returns {Promise<Array>} Array di revisioni
   */
  async getBulkRevisions(collection, itemIds, limit = 50) {
    if (!itemIds.length) return []
    const res = await api.get('/revisions', {
      params: {
        'filter[collection][_eq]': collection,
        'filter[item][_in]': itemIds.join(','),
        'fields[]': [
          'id',
          'item',
          'delta',
          'activity.timestamp',
          'activity.action',
          'activity.user.email',
          'activity.user.first_name',
          'activity.user.last_name'
        ],
        sort: '-activity.timestamp',
        limit
      }
    })
    return res.data.data || []
  },

  /**
   * Raggruppa le revisioni per item e per campo.
   * @param {Array} revisions - Array di revisioni da getBulkRevisions()
   * @param {string[]} fields - Nomi dei campi da estrarre
   * @returns {Object} { [itemId]: { [fieldName]: [revisions...] } }
   */
  groupByItemAndField(revisions, fields) {
    const map = {}
    for (const rev of revisions) {
      if (!rev.item) continue
      if (!map[rev.item]) map[rev.item] = {}
      for (const field of fields) {
        if (rev.delta && Object.prototype.hasOwnProperty.call(rev.delta, field)) {
          if (!map[rev.item][field]) map[rev.item][field] = []
          map[rev.item][field].push(rev)
        }
      }
    }
    return map
  },

  /**
   * Filtra le revisioni per uno specifico campo.
   * @param {Array} revisions - Array di revisioni da getRevisions()
   * @param {string} fieldName - Nome del campo da cercare nel delta
   * @returns {Array} Revisioni che hanno modificato il campo specificato
   */
  filterByField(revisions, fieldName) {
    return revisions.filter(r => r.delta && Object.prototype.hasOwnProperty.call(r.delta, fieldName))
  }
}
