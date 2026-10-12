/**
 * Estrae il messaggio d'errore da una risposta Directus con il pattern
 * canonico del progetto: primo elemento di `errors[]`, messaggio singolo
 * `data.error` (endpoint estensione), `error.message`, altrimenti il fallback
 * fornito.
 *
 * Include `error.message` per far emergere i messaggi degli errori di dominio
 * lanciati dagli use case (es. "Solo pagamenti in_pagamento...").
 *
 * @param {unknown} error - errore catturato (tipicamente da axios)
 * @param {string} [fallback='Errore generico'] - messaggio di riserva
 * @returns {string}
 */
export function apiErrorMessage(error, fallback = 'Errore generico') {
  return error?.response?.data?.errors?.[0]?.message || error?.response?.data?.error || error?.message || fallback
}
