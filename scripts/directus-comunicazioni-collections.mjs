/**
 * Crea le collezioni `Comunicazioni` e `Comunicazioni_Contatti` su un'istanza
 * Directus (idempotente: salta ciò che esiste già).
 *
 * Uso:
 *   DIRECTUS_URL=https://app.sostienilsostegno.com \
 *   DIRECTUS_EMAIL=<admin> DIRECTUS_PASSWORD=<password> \
 *   node scripts/directus-comunicazioni-collections.mjs
 *
 * Le definizioni rispecchiano quelle di dev (docs/comunicazioni.md).
 */

const URL = (process.env.DIRECTUS_URL || 'http://localhost:8055').replace(/\/$/, '')
const EMAIL = process.env.DIRECTUS_EMAIL
const PASSWORD = process.env.DIRECTUS_PASSWORD

if (!EMAIL || !PASSWORD) {
  console.error('❌ Servono DIRECTUS_EMAIL e DIRECTUS_PASSWORD')
  process.exit(1)
}

let TOKEN = ''

async function api(method, path, body) {
  const res = await fetch(`${URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  })
  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  return { ok: res.ok, status: res.status, data }
}

async function login() {
  const { ok, data } = await api('POST', '/auth/login', { email: EMAIL, password: PASSWORD })
  if (!ok) {
    console.error('❌ Login fallito:', JSON.stringify(data))
    process.exit(1)
  }
  TOKEN = data.data.access_token
  console.log(`✅ Login ok su ${URL}`)
}

const COMUNICAZIONI_FIELDS = [
  {
    field: 'id',
    type: 'integer',
    meta: { interface: 'numeric', readonly: true, hidden: true, sort: 1 },
    schema: { is_primary_key: true, has_auto_increment: true }
  },
  {
    field: 'Oggetto',
    type: 'string',
    meta: { interface: 'input', required: true, sort: 2 },
    schema: { max_length: 255 }
  },
  { field: 'Corpo', type: 'text', meta: { interface: 'input-multiline', sort: 3 }, schema: {} },
  { field: 'DataInvio', type: 'timestamp', meta: { interface: 'datetime', sort: 4 }, schema: {} },
  { field: 'Mittente', type: 'uuid', meta: { interface: 'select-dropdown-m2o', sort: 5 }, schema: {} },
  { field: 'Tipo', type: 'string', meta: { interface: 'input', sort: 6 }, schema: { max_length: 50 } },
  {
    field: 'Filtri',
    type: 'json',
    meta: { interface: 'input-code', special: ['cast-json'], sort: 7 },
    schema: {}
  },
  { field: 'NInviati', type: 'integer', meta: { interface: 'input', sort: 8 }, schema: {} },
  { field: 'NFalliti', type: 'integer', meta: { interface: 'input', sort: 9 }, schema: {} },
  { field: 'Stato', type: 'string', meta: { interface: 'select-dropdown', sort: 10 }, schema: { max_length: 20 } },
  {
    field: 'LinkAllegato',
    type: 'string',
    meta: { interface: 'input', sort: 11 },
    schema: { max_length: 500 }
  }
]

const COMUNICAZIONI_CONTATTI_FIELDS = [
  {
    field: 'id',
    type: 'integer',
    meta: { interface: 'numeric', readonly: true, hidden: true, sort: 1 },
    schema: { is_primary_key: true, has_auto_increment: true }
  },
  {
    field: 'Comunicazione',
    type: 'integer',
    meta: { interface: 'select-dropdown-m2o', required: true, sort: 2 },
    schema: {}
  },
  { field: 'Contatto', type: 'string', meta: { interface: 'select-dropdown-m2o', sort: 3 }, schema: {} },
  { field: 'Famiglia', type: 'string', meta: { interface: 'select-dropdown-m2o', sort: 4 }, schema: {} },
  { field: 'Email', type: 'string', meta: { interface: 'input', sort: 5 }, schema: { max_length: 255 } },
  { field: 'Esito', type: 'string', meta: { interface: 'select-dropdown', sort: 6 }, schema: { max_length: 20 } },
  { field: 'Errore', type: 'text', meta: { interface: 'input-multiline', sort: 7 }, schema: {} },
  {
    field: 'BrevoMessageId',
    type: 'string',
    meta: { interface: 'input', sort: 8 },
    schema: { max_length: 255 }
  }
]

const RELATIONS = [
  {
    collection: 'Comunicazioni',
    field: 'Mittente',
    related_collection: 'directus_users',
    meta: { one_deselect_action: 'nullify' },
    schema: { on_delete: 'SET NULL' }
  },
  {
    collection: 'Comunicazioni_Contatti',
    field: 'Comunicazione',
    related_collection: 'Comunicazioni',
    meta: { one_deselect_action: 'nullify' },
    schema: { on_delete: 'SET NULL' }
  },
  {
    collection: 'Comunicazioni_Contatti',
    field: 'Contatto',
    related_collection: 'contatti',
    meta: { one_deselect_action: 'nullify' },
    schema: { on_delete: 'SET NULL' }
  },
  {
    collection: 'Comunicazioni_Contatti',
    field: 'Famiglia',
    related_collection: 'Famiglie',
    meta: { one_deselect_action: 'nullify' },
    schema: { on_delete: 'SET NULL' }
  }
]

async function collectionExists(name) {
  const { ok, status } = await api('GET', `/collections/${name}`)
  return ok && status === 200
}

async function createCollection(name, note, fields) {
  if (await collectionExists(name)) {
    console.log(`⏩ ${name}: già esistente`)
    return
  }
  const { ok, data } = await api('POST', '/collections', {
    collection: name,
    meta: { note, icon: 'mail', hidden: false },
    schema: {},
    fields
  })
  if (!ok) {
    console.error(`❌ Creazione ${name} fallita:`, JSON.stringify(data))
    process.exit(1)
  }
  console.log(`✅ ${name}: creata`)
}

async function createRelation(rel) {
  const { ok, data } = await api('GET', `/relations/${rel.collection}/${rel.field}`)
  if (ok) {
    console.log(`⏩ relazione ${rel.collection}.${rel.field} → ${rel.related_collection}: già presente`)
    return
  }
  const res = await api('POST', '/relations', rel)
  if (!res.ok) {
    console.error(
      `❌ Relazione ${rel.collection}.${rel.field} → ${rel.related_collection} fallita:`,
      JSON.stringify(res.data)
    )
    process.exit(1)
  }
  console.log(`✅ relazione ${rel.collection}.${rel.field} → ${rel.related_collection}: creata`)
}

async function main() {
  await login()
  await createCollection('Comunicazioni', 'Log comunicazioni', COMUNICAZIONI_FIELDS)
  await createCollection('Comunicazioni_Contatti', 'Destinatari log comunicazioni', COMUNICAZIONI_CONTATTI_FIELDS)
  for (const rel of RELATIONS) {
    await createRelation(rel)
  }
  console.log('\n✅ Completato.')
}

main().catch(err => {
  console.error('❌ Errore:', err.message)
  process.exit(1)
})
