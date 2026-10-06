/**
 * Esporta in un unico JSON la configurazione rilevante di Directus
 * (ruoli, policy, access, permessi, collezioni) per confrontare dev e prod.
 *
 * Uso:
 *   DIRECTUS_URL=https://... DIRECTUS_EMAIL=... DIRECTUS_PASSWORD=... \
 *   OUT=/tmp/config.json node scripts/directus-config-dump.mjs
 */

import { writeFileSync } from 'fs'

const URL = (process.env.DIRECTUS_URL || 'http://localhost:8055').replace(/\/$/, '')
const EMAIL = process.env.DIRECTUS_EMAIL
const PASSWORD = process.env.DIRECTUS_PASSWORD
const OUT = process.env.OUT || '/tmp/directus-config.json'

if (!EMAIL || !PASSWORD) {
  console.error('❌ Servono DIRECTUS_EMAIL e DIRECTUS_PASSWORD')
  process.exit(1)
}

let TOKEN = ''

async function get(path) {
  const res = await fetch(`${URL}${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}` }
  })
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`)
  const data = await res.json()
  return data.data
}

async function main() {
  const login = await fetch(`${URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD })
  })
  if (!login.ok) {
    console.error('❌ Login fallito', login.status)
    process.exit(1)
  }
  TOKEN = (await login.json()).data.access_token

  const [roles, policies, access, permissions, collections, fields, relations] = await Promise.all([
    get('/roles?limit=-1&fields=id,name'),
    get('/policies?limit=-1&fields=id,name,admin_access,app_access'),
    get('/access?limit=-1&fields=id,role,policy'),
    get('/permissions?limit=-1&fields=id,collection,action,policy,fields,permissions,validation,presets'),
    get('/collections?limit=-1&fields=collection,meta'),
    get('/fields?limit=-1&fields=collection,field,type,special,required,interface'),
    get('/relations?limit=-1&fields=collection,field,related_collection,meta')
  ])

  const out = {
    url: URL,
    generated_at: new Date().toISOString(),
    roles,
    policies,
    access,
    permissions,
    collections: collections.map(c => ({
      collection: c.collection,
      hidden: c.meta?.hidden ?? false,
      note: c.meta?.note ?? null
    })),
    fields: fields.map(f => ({
      collection: f.collection,
      field: f.field,
      type: f.type,
      special: f.special ?? null,
      required: f.required ?? false,
      interface: f.interface ?? null
    })),
    relations: relations.map(r => ({
      collection: r.collection,
      field: r.field,
      related_collection: r.related_collection,
      one_deselect_action: r.meta?.one_deselect_action ?? null
    }))
  }

  writeFileSync(OUT, JSON.stringify(out, null, 2))
  console.log(
    `✅ Scritto ${OUT} (${roles.length} ruoli, ${policies.length} policy, ${permissions.length} permessi, ${fields.length} campi, ${relations.length} relazioni)`
  )
}

main().catch(err => {
  console.error('❌ Errore:', err.message)
  process.exit(1)
})
