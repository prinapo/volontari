import { API_URL, STORAGE_KEYS } from './constants'

/**
 * Genera URL per un file Directus
 * In produzione usa il cookie di sessione; in locale usa il token in query string
 */
export function assetUrl(fileId, download = false) {
  if (!fileId) return ''
  const id = typeof fileId === 'object' ? fileId?.id : fileId
  if (!id) return ''
  const base = `${API_URL}/assets/${id}`
  if (import.meta.env.DEV) {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
    return download ? `${base}?access_token=${token}&download=1` : `${base}?access_token=${token}`
  }
  return download ? `${base}?download=1` : base
}
