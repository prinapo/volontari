import { API_URL } from './constants'

/**
 * Genera URL per un file Directus
 * In produzione usa il cookie di sessione; in locale usa il token in query string
 */
export function assetUrl(fileId, download = false) {
  if (!fileId) return ''
  const id = typeof fileId === 'object' ? fileId?.id : fileId
  if (!id) return ''
  const base = `${API_URL}/assets/${id}`
  return download ? `${base}?download=1` : base
}
