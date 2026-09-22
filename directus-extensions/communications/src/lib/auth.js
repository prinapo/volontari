/**
 * Autorizzazione all'invio: gli amministratori sono sempre abilitati, gli altri
 * ruoli solo se elencati in COMMS_ALLOWED_ROLES (UUID separati da virgola).
 * Il controllo è lato server: il frontend non può aggirarlo.
 */
export function allowedToSend(req, env = {}) {
  const accountability = req?.accountability
  if (accountability?.admin) return true

  const role = accountability?.role
  if (!role) return false

  const allowed = String(env.COMMS_ALLOWED_ROLES || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)

  return allowed.includes(role)
}
