/**
 * API client for Directus — standalone Node fetch, no browser needed.
 * Usata SOLO per:
 *   1. Creare dati che non hanno UI (es. Progetti)
 *   2. Pulire dati dopo i test (entities senza UI delete)
 */

const API_URL = process.env.API_URL || 'http://localhost:8055'

let token = null

export function setToken(newToken) {
  token = newToken
}

export function getToken() {
  return token
}

export async function apiLogin(email, password) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
  if (!res.ok) {
    throw new Error(`API login failed: ${res.status}`)
  }
  const data = await res.json()
  token = data.data.access_token
  return token
}

export async function apiPost(collection, body) {
  const res = await fetch(`${API_URL}/items/${collection}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(`API POST ${collection} → ${res.status}: ${JSON.stringify(data)}`)
  }
  return data
}

export async function apiGet(collection, params = {}) {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) qs.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v))
  }
  const query = qs.toString()
  const url = `${API_URL}/items/${collection}${query ? `?${query}` : ''}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(`API GET ${collection} → ${res.status}: ${JSON.stringify(data)}`)
  }
  return data
}

export async function apiDelete(collection, id) {
  const res = await fetch(`${API_URL}/items/${collection}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) {
    throw new Error(`API DELETE ${collection}/${id} → ${res.status}`)
  }
}

/**
 * DELETE su collection di sistema Directus (es. /users/{id}).
 * Le collection di sistema NON hanno il prefisso /items/.
 */
export async function apiGetSystem(path, params = {}) {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) qs.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v))
  }
  const query = qs.toString()
  const url = `${API_URL}/${path}${query ? `?${query}` : ''}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  const data = await res.json()
  if (!res.ok) throw new Error(`API GET system ${path} → ${res.status}: ${JSON.stringify(data)}`)
  return data
}

export async function apiDeleteSystem(path, id) {
  const res = await fetch(`${API_URL}/${path}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) {
    throw new Error(`API DELETE system ${path}/${id} → ${res.status}`)
  }
}

export async function apiPatch(collection, id, body) {
  const res = await fetch(`${API_URL}/items/${collection}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API PATCH ${collection}/${id} → ${res.status}: ${text}`)
  }
  // Diretto a volte restituisce 204 No Content (nessun body)
  const text = await res.text()
  return text ? JSON.parse(text) : {}
}
