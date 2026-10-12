/**
 * Funzioni PURE per la costruzione dei filtri del modulo Comunicazioni.
 * Nessuna chiamata di rete: qui solo il montaggio del filtro Directus a partire
 * dagli id dei destinatari (family-id sets) e dai ruoli selezionati.
 */
import { RUOLI_FAMIGLIA } from './constants'

/**
Ruoli disponibili nel selettore contatti (mappa su booleani del contatto).
*/
export const RUOLI_CANALE_CONTATTI = [
  { value: 'Volontario', field: 'IsVolontario' },
  { value: 'Genitore', field: 'IsGenitore' },
  { value: 'Referente', field: 'IsReferente' }
]

/**
Ruoli disponibili nel selettore famiglie (`Ruolo_nella_Famiglia`), derivati
dalla fonte unica `constants.RUOLI_FAMIGLIA`.
*/
export const RUOLI_FAMIGLIA_VALUES = Object.values(RUOLI_FAMIGLIA)

/**
Stati pagamento selezionabili (+ "nessuno").
*/
export const STATI_PAGAMENTO_SELEZIONABILI = ['nessuno', 'proposto', 'in_pagamento', 'pagato', 'fallito', 'annullato']

/**
Condizioni giustificativi selezionabili.
*/
export const GIUSTIFICATIVI_SELEZIONABILI = ['nessuno', 'solo_draft', 'almeno_inviato']

/**
 * Filtro Directus sui contatti per i ruoli selezionati (`_or` sui booleani).
 * Ritorna null se nessun ruolo è selezionato.
 */
export function buildContattiRoleFilter(ruoli = []) {
  const conditions = RUOLI_CANALE_CONTATTI.filter(ruolo => ruoli.includes(ruolo.value)).map(ruolo => ({
    [ruolo.field]: { _eq: true }
  }))
  if (conditions.length === 0) return null
  return conditions.length === 1 ? conditions[0] : { _or: conditions }
}

/**
Intersezione di più set/array di id. Ritorna null se non ci sono set.
*/
export function intersectIdSets(sets = []) {
  const valid = sets.filter(set => set instanceof Set || Array.isArray(set)).map(set => new Set(set))
  if (valid.length === 0) return null
  const [first, ...rest] = valid
  const result = new Set()
  for (const id of first) {
    if (rest.every(set => set.has(id))) result.add(id)
  }
  return result
}

/**
Unione di più set/array di id.
*/
export function unionIdSets(sets = []) {
  const result = new Set()
  for (const set of sets) {
    for (const id of set) result.add(id)
  }
  return result
}

/**
 * Filtro Directus su `Famiglie` a partire dagli id da includere/escludere.
 * `null` = nessuna restrizione; set vuoto = nessun risultato.
 */
export function assembleFamiglieIdFilter({ includeIds = null, excludeIds = null } = {}) {
  const conditions = []
  if (includeIds instanceof Set) conditions.push({ id_famiglia: { _in: [...includeIds] } })
  if (excludeIds instanceof Set && excludeIds.size > 0) {
    conditions.push({ id_famiglia: { _nin: [...excludeIds] } })
  }
  if (conditions.length === 0) return {}
  if (conditions.length === 1) return conditions[0]
  return { _and: conditions }
}
