/**
 * Mostra una notifica di errore tramite Quasar
 * @param {import('quasar').QNotify} $q - Istanza di Quasar
 * @param {string|Error} err - Errore o messaggio
 * @param {string} [fallback='Errore'] - Messaggio di fallback
 */
export function notifyError($q, err, fallback = 'Errore') {
  let message = fallback
  if (typeof err === 'string') {
    message = err
  } else if (err?.response?.data?.errors?.[0]?.message) {
    message = err.response.data.errors[0].message
  } else if (err?.message) {
    message = err.message
  }
  $q.notify({
    type: 'negative',
    message,
    timeout: 0,
    actions: [{ icon: 'close', color: 'white', round: true, dense: true }]
  })
}

/**
 * Mostra una notifica di successo tramite Quasar
 * @param {import('quasar').QNotify} $q - Istanza di Quasar
 * @param {string} message - Messaggio di successo
 */
export function notifySuccess($q, message) {
  $q.notify({ type: 'positive', message })
}
