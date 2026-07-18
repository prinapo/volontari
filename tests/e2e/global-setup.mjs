import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const PRODUCTION_PATTERNS = [
  'app.sostienilsostegno.com',
  'volontari.sostienilsostegno.com'
]

const DEVELOPMENT_PATTERNS = [
  'localhost',
  '127.0.0.1',
  'api-dev.sostienilsostegno.com'
]

function getApiUrl() {
  return 'https://api-dev.sostienilsostegno.com'
}

async function directusLogin(baseUrl, email, password) {
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.data?.access_token
}

async function apiGet(baseUrl, token, path, params = {}) {
  const url = new URL(`${baseUrl}${path}`)
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined) url.searchParams.set(k, v) })
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  if (!res.ok) {
    console.warn(`[CLEANUP] GET ${path} → ${res.status} (skipping)`)
    return { data: [] }
  }
  return res.json()
}

async function apiDelete(baseUrl, token, path) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  })
  return res.ok
}

async function cleanupTestData(baseUrl, token) {
  console.log('[CLEANUP] Removing test data from previous runs...')

  // 1. Delete Test submissions (InviiGiustificativiNoLogin with test emails)
  const submissions = await apiGet(baseUrl, token, '/items/InviiGiustificativiNoLogin', {
    filter: JSON.stringify({ email: { _icontains: '@test.com' } }),
    fields: 'id',
    limit: -1
  })
  for (const s of (submissions.data || [])) {
    await apiDelete(baseUrl, token, `/items/InviiGiustificativiNoLogin/${s.id}`)
  }
  if ((submissions.data || []).length > 0) {
    console.log(`[CLEANUP] Deleted ${submissions.data.length} test submissions`)
  }

  // 2. Delete giustificativi with TEST_ prefix (unica convenzione)
  const giustificativi = await apiGet(baseUrl, token, '/items/Giustificativi', {
    filter: JSON.stringify({ Descrizione: { _starts_with: 'TEST_' } }),
    fields: 'id',
    limit: -1
  })
  for (const g of (giustificativi.data || [])) {
    await apiDelete(baseUrl, token, `/items/Giustificativi/${g.id}`)
  }
  if ((giustificativi.data || []).length > 0) {
    console.log(`[CLEANUP] Deleted ${giustificativi.data.length} test giustificativi`)
  }

  // 3. Delete progetti created by tests (Cognome_Beneficiario starts with TEST_)
  const progetti = await apiGet(baseUrl, token, '/items/Progetti', {
    filter: JSON.stringify({ Cognome_Beneficiario: { _starts_with: 'TEST_' } }),
    fields: 'id_progetto',
    limit: -1
  })
  for (const p of (progetti.data || [])) {
    await apiDelete(baseUrl, token, `/items/Progetti/${p.id_progetto}`)
  }
  if ((progetti.data || []).length > 0) {
    console.log(`[CLEANUP] Deleted ${progetti.data.length} test progetti`)
  }

  // 4. Delete test famiglie (Nome_Famiglia starts with TEST_ or id_famiglia starts with TEST_)
  const famiglie = await apiGet(baseUrl, token, '/items/Famiglie', {
    filter: JSON.stringify({
      _or: [
        { Nome_Famiglia: { _starts_with: 'TEST_' } },
        { id_famiglia: { _starts_with: 'TEST_' } }
      ]
    }),
    fields: 'id_famiglia',
    limit: -1
  })
  for (const f of (famiglie.data || [])) {
    const fc = await apiGet(baseUrl, token, '/items/Famiglie_Contatti', {
      filter: JSON.stringify({ Famiglia: { _eq: f.id_famiglia } }),
      fields: 'id',
      limit: -1
    })
    for (const r of (fc.data || [])) {
      await apiDelete(baseUrl, token, `/items/Famiglie_Contatti/${r.id}`)
    }
    await apiDelete(baseUrl, token, `/items/Famiglie/${f.id_famiglia}`)
  }
  if ((famiglie.data || []).length > 0) {
    console.log(`[CLEANUP] Deleted ${famiglie.data.length} test famiglie`)
  }

  // 5. Delete contatti (Nome OR Cognome starts with TEST_)
  const contatti = await apiGet(baseUrl, token, '/items/contatti', {
    filter: JSON.stringify({
      _or: [
        { Nome: { _starts_with: 'TEST_' } },
        { Cognome: { _starts_with: 'TEST_' } }
      ]
    }),
    fields: 'id_contatto',
    limit: -1
  })
  for (const c of (contatti.data || [])) {
    const emails = await apiGet(baseUrl, token, '/items/email', {
      filter: JSON.stringify({ Contatto_Relation: { _eq: c.id_contatto } }),
      fields: 'id',
      limit: -1
    })
    for (const e of (emails.data || [])) {
      await apiDelete(baseUrl, token, `/items/email/${e.id}`)
    }
    const fc = await apiGet(baseUrl, token, '/items/Famiglie_Contatti', {
      filter: JSON.stringify({ Contatto: { _eq: c.id_contatto } }),
      fields: 'id',
      limit: -1
    })
    for (const f of (fc.data || [])) {
      await apiDelete(baseUrl, token, `/items/Famiglie_Contatti/${f.id}`)
    }
    await apiDelete(baseUrl, token, `/items/contatti/${c.id_contatto}`)
  }
  if ((contatti.data || []).length > 0) {
    console.log(`[CLEANUP] Deleted ${contatti.data.length} test contatti (with emails and famiglia links)`)
  }

  // 6. Delete orphan email records with test addresses (FK is SET NULL, not CASCADE)
  const orphanEmails = await apiGet(baseUrl, token, '/items/email', {
    filter: JSON.stringify({
      _or: [
        { email_address: { _iends_with: '@test.com' } },
        { email_address: { _iends_with: '@test.example.com' } },
        { email_address: { _istarts_with: 'TEST_' } }
      ]
    }),
    fields: 'id,email_address',
    limit: -1
  })
  for (const e of (orphanEmails.data || [])) {
    await apiDelete(baseUrl, token, `/items/email/${e.id}`)
  }
  if ((orphanEmails.data || []).length > 0) {
    console.log(`[CLEANUP] Deleted ${orphanEmails.data.length} orphan test email records`)
  }

  // 7. Delete orphan Directus users with @test.com email
  const testUsers = await apiGet(baseUrl, token, '/users', {
    filter: JSON.stringify({ email: { _iends_with: '@test.com' } }),
    fields: 'id,email',
    limit: -1
  })
  for (const u of (testUsers.data || [])) {
    await apiDelete(baseUrl, token, `/users/${u.id}`)
  }
  if ((testUsers.data || []).length > 0) {
    console.log(`[CLEANUP] Deleted ${testUsers.data.length} test users with @test.com email`)
  }

  // 8. Cleanup orphaned Famiglie_Contatti rows (FK SET NULL can leave dangling rows)
  const orphanFC = await apiGet(baseUrl, token, '/items/Famiglie_Contatti', {
    filter: JSON.stringify({
      _or: [
        { Famiglia: { _null: true } },
        { Contatto: { _null: true } }
      ]
    }),
    fields: 'id',
    limit: -1
  })
  for (const r of (orphanFC.data || [])) {
    await apiDelete(baseUrl, token, `/items/Famiglie_Contatti/${r.id}`)
  }
  if ((orphanFC.data || []).length > 0) {
    console.log(`[CLEANUP] Deleted ${orphanFC.data.length} orphaned Famiglie_Contatti rows`)
  }

  // 9. Delete test pagamenti (via batch with TEST_ name)
  const batchPerPagamenti = await apiGet(baseUrl, token, '/items/BatchPagamenti', {
    filter: JSON.stringify({ Nome: { _starts_with: 'TEST_' } }),
    fields: 'id',
    limit: -1
  })
  const batchIds = (batchPerPagamenti.data || []).map(b => b.id)
  if (batchIds.length > 0) {
    const pagamenti = await apiGet(baseUrl, token, '/items/Pagamenti', {
      filter: JSON.stringify({ Batch: { _in: batchIds.join(',') } }),
      fields: 'id',
      limit: -1
    })
    for (const p of (pagamenti.data || [])) {
      await apiDelete(baseUrl, token, `/items/Pagamenti/${p.id}`)
    }
    if ((pagamenti.data || []).length > 0) {
      console.log(`[CLEANUP] Deleted ${pagamenti.data.length} test pagamenti`)
    }
  }

  // 10. Delete test Associazioni (TEST_ prefix)
  const associazioni = await apiGet(baseUrl, token, '/items/Associazioni', {
    filter: JSON.stringify({ Nome: { _starts_with: 'TEST_' } }),
    fields: 'id',
    limit: -1
  })
  for (const a of (associazioni.data || [])) {
    await apiDelete(baseUrl, token, `/items/Associazioni/${a.id}`)
  }
  if ((associazioni.data || []).length > 0) {
    console.log(`[CLEANUP] Deleted ${associazioni.data.length} test associazioni`)
  }

  // 11. Delete test BatchPagamenti (TEST_ prefix)
  const batch = await apiGet(baseUrl, token, '/items/BatchPagamenti', {
    filter: JSON.stringify({ Nome: { _starts_with: 'TEST_' } }),
    fields: 'id',
    limit: -1
  })
  for (const b of (batch.data || [])) {
    await apiDelete(baseUrl, token, `/items/BatchPagamenti/${b.id}`)
  }
  if ((batch.data || []).length > 0) {
    console.log(`[CLEANUP] Deleted ${batch.data.length} test batch pagamenti`)
  }

  // 12. Delete test ListePagamenti (TEST_ prefix)
  const liste = await apiGet(baseUrl, token, '/items/ListePagamenti', {
    filter: JSON.stringify({ Nome: { _starts_with: 'TEST_' } }),
    fields: 'id',
    limit: -1
  })
  for (const l of (liste.data || [])) {
    await apiDelete(baseUrl, token, `/items/ListePagamenti/${l.id}`)
  }
  if ((liste.data || []).length > 0) {
    console.log(`[CLEANUP] Deleted ${liste.data.length} test liste pagamenti`)
  }

  console.log('[CLEANUP] Done')
}

export default async function () {
  const url = getApiUrl()

  if (!url) {
    console.error('\n❌ ERRORE: VITE_API_URL non trovato in .env o .env.local')
    console.error('   Crea un file .env.local con:')
    console.error('   VITE_API_URL=http://localhost:8055')
    console.error('   VITE_ENV=local\n')
    process.exit(1)
  }

  const isProduction = PRODUCTION_PATTERNS.some(p => url.includes(p))
  const isDevelopment = DEVELOPMENT_PATTERNS.some(p => url.includes(p))

  if (isProduction) {
    console.error(`\n❌ PERICOLO: VITE_API_URL punta a PRODUCTION!`)
    console.error(`   URL: ${url}`)
    console.error('   I test E2E non devono MAI essere eseguiti su produzione.\n')
    process.exit(1)
  }

  if (!isDevelopment) {
    console.error(`\n❌ ERRORE: VITE_API_URL non riconosciuto.`)
    console.error(`   URL: ${url}`)
    console.error('   Crea/aggiorna .env.local con:')
    console.error('   VITE_API_URL=https://api-dev.sostienilsostegno.com')
    console.error('   VITE_ENV=local\n')
    process.exit(1)
  }

  console.log(`\n✅ GUARD: API URL = ${url} — OK (${isDevelopment ? 'development' : 'locale'})\n`)

  // Cleanup test data from previous runs
  const token = await directusLogin(url, 'fake.admin@fake.com', 'FakeAdmin_2026!!')
  if (token) {
    await cleanupTestData(url, token)
  } else {
    console.log('[CLEANUP] Skipped — could not login as admin (database might be fresh)')
  }
}
