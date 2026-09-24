#!/usr/bin/env node
/**
 * Backfill una-tantum di Pagamenti.Intestatario/IBAN vuoti, prendendo i valori
 * correnti da Famiglie (Intestatario_CC / IBAN).
 *
 * Uso (dry-run di default):
 *   node scripts/backfill-intestatario.mjs
 *   node scripts/backfill-intestatario.mjs --apply
 *
 * Env (con default dev fake admin):
 *   API_URL, ADMIN_EMAIL, ADMIN_PASSWORD
 *
 * Guard: rifiuta qualunque URL che punti a produzione.
 */

const API_URL = process.env.API_URL || 'https://api-dev.sostienilsostegno.com'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'fake.admin@fake.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'FakeAdmin_2026!!'
const APPLY = process.argv.includes('--apply')

const PRODUCTION_PATTERNS = ['app.sostienilsostegno.com', 'volontari.sostienilsostegno.com']

if (PRODUCTION_PATTERNS.some(p => API_URL.includes(p))) {
  console.error(`❌ Rifiuto: API_URL punta a produzione (${API_URL}).`)
  process.exit(1)
}

async function login() {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
  })
  if (!res.ok) throw new Error(`Login fallito: ${res.status}`)
  const data = await res.json()
  return data.data.access_token
}

async function apiGet(token, path) {
  const res = await fetch(`${API_URL}${path}`, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`)
  return res.json()
}

async function apiPatch(token, collection, id, body) {
  const res = await fetch(`${API_URL}/items/${collection}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body)
  })
  if (!res.ok) throw new Error(`PATCH ${collection}/${id} → ${res.status}`)
  return res.json()
}

function chunks(array, size) {
  const out = []
  for (let i = 0; i < array.length; i += size) out.push(array.slice(i, i + size))
  return out
}

async function main() {
  const token = await login()
  console.log(`→ ${API_URL} (${ADMIN_EMAIL})${APPLY ? ' [APPLY]' : ' [DRY-RUN]'}`)

  const pagRes = await apiGet(token, '/items/Pagamenti?limit=-1&fields=id,Stato,IBAN,Intestatario,Famiglia')
  const pagamenti = pagRes.data || []
  const daSistemare = pagamenti.filter(p => !p.Intestatario || !p.IBAN)
  console.log(`Pagamenti totali: ${pagamenti.length} — da sistemare: ${daSistemare.length}`)

  const famIds = [...new Set(daSistemare.map(p => p.Famiglia).filter(Boolean).map(String))]
  const famMap = new Map()
  for (const ids of chunks(famIds, 100)) {
    const famRes = await apiGet(
      token,
      `/items/Famiglie?limit=-1&fields=id_famiglia,IBAN,Intestatario_CC&filter[id_famiglia][_in]=${ids.join(',')}`
    )
    for (const f of famRes.data || []) famMap.set(String(f.id_famiglia), f)
  }

  let aggiornati = 0
  let saltati = 0
  for (const p of daSistemare) {
    const fam = famMap.get(String(p.Famiglia))
    const patch = {}
    if (!p.Intestatario && fam?.Intestatario_CC) patch.Intestatario = fam.Intestatario_CC
    if (!p.IBAN && fam?.IBAN) patch.IBAN = fam.IBAN
    if (Object.keys(patch).length === 0) {
      saltati++
      continue
    }
    console.log(`  #${p.id} (${p.Stato}) → ${JSON.stringify(patch)}`)
    if (APPLY) await apiPatch(token, 'Pagamenti', p.id, patch)
    aggiornati++
  }

  console.log(`\n${APPLY ? 'Aggiornati' : 'Aggiornabili'}: ${aggiornati} — saltati (famiglia senza dati): ${saltati}`)
  if (!APPLY) console.log('Rilancia con --apply per scrivere.')
}

main().catch(error => {
  console.error('❌', error.message)
  process.exit(1)
})
