import { API_URL, STORAGE_KEYS } from './constants'

/**
 * Genera URL per un file Directus
 * Include access_token per garantire l'accesso anche in caso di popup/nuova scheda
 */
export function assetUrl(fileId, download = false) {
  if (!fileId) return ''
  const id = typeof fileId === 'object' ? fileId?.id : fileId
  if (!id) return ''
  const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
  const base = `${API_URL}/assets/${id}`
  const params = []
  if (token) params.push(`access_token=${token}`)
  params.push(`_t=${Date.now()}`)
  if (download) params.push('download=1')
  return `${base}?${params.join('&')}`
}
