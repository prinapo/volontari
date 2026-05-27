const API_URL = 'https://app.sostienilsostegno.com'

export async function getToken(page) {
  return page.evaluate(() => localStorage.getItem('access_token'))
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

export async function getFirstProject(page) {
  const token = await getToken(page)
  if (!token) return null
  const url = new URL(`${API_URL}/items/Progetti`)
  url.searchParams.set('limit', '1')
  const res = await fetch(url, { headers: authHeaders(token) })
  if (!res.ok) { console.log('GET_PROJECTS_FAILED', res.status); return null }
  const body = await res.json()
  return body.data?.[0] || null
}

export async function seedGiustificativo(page, overrides = {}) {
  const token = await getToken(page)
  if (!token) { console.log('SEED: no token'); return null }
  const project = overrides.project || await getFirstProject(page)
  if (!project) { console.log('SEED: no project'); return null }
  const desc = overrides.desc || `__TEST_${Date.now()}`
  const res = await fetch(`${API_URL}/items/Giustificativi`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({
      Progetto: project.id_progetto,
      Descrizione: desc,
      Importo: overrides.importo ?? 50,
      Data: overrides.data || new Date().toISOString().slice(0, 10),
      Stato: overrides.stato || 'draft',
      ...overrides.extra
    })
  })
  if (!res.ok) { console.log('SEED: create failed', res.status); return null }
  const created = await res.json()
  console.log('SEED: created giustificativo', created.data?.id, desc)
  return { id: created.data?.id, desc }
}

export async function deleteGiustificativo(page, id) {
  if (!id) return
  const token = await getToken(page)
  if (!token) return
  await fetch(`${API_URL}/items/Giustificativi/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  })
}

export async function patchGiustificativo(page, id, data) {
  if (!id) return null
  const token = await getToken(page)
  if (!token) return null
  const res = await fetch(`${API_URL}/items/Giustificativi/${id}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(data)
  })
  return res.ok ? res.json() : null
}
