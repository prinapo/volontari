import { API_URL, STORAGE_KEYS } from './constants'

export function assetUrl(fileId, download = false) {
  const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
  const base = `${API_URL}/assets/${fileId}?access_token=${token}`
  return download ? `${base}&download=1` : base
}
