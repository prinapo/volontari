import { API_URL, STORAGE_KEYS } from './constants'

/**
 * Genera URL per un file Directus con token di accesso
 * @param {string} fileId - ID del file Directus
 * @param {boolean} [download=false] - Se true, forza il download
 * @returns {string} URL completo del file
 */
export function assetUrl(fileId, download = false) {
  if (!fileId) return ''
  const id = typeof fileId === 'object' ? fileId?.id : fileId
  if (!id) return ''
  const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
  const base = `${API_URL}/assets/${id}?access_token=${token}`
  return download ? `${base}&download=1` : base
}
