import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const PRODUCTION_PATTERNS = [
  'sostienilsostegno.com',
  'app.sostienilsostegno',
  'sostienilsostegno'
]

function getApiUrl() {
  return 'http://localhost:8055'
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
  if (!res.ok) return { data: [] }
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

  // 1. Delete submissions from test runs (InviiGiustificativiNoLogin with test emails)
  const submissions = await apiGet(baseUrl, token, '/items/InviiGiustificativiNoLogin', {
    filter: JSON.stringify({ email: { _contains: '@test.com' } }),
    fields: 'id',
    limit: -1
  })
  for (const s of (submissions.data || [])) {
    await apiDelete(baseUrl, token, `/items/InviiGiustificativiNoLogin/${s.id}`)
  }
  if ((submissions.data || []).length > 0) {
    console.log(`[CLEANUP] Deleted ${submissions.data.length} test submissions`)
  }

  // 2. Delete giustificativi with test descriptions (all test patterns)
  const giustDescPatterns = [
    { Descrizione: { _startswith: 'Test VF_' } },
    { Descrizione: { _startswith: 'Test SR_' } },
    { Descrizione: { _startswith: 'Test VE_' } },
    { Descrizione: { _startswith: 'VF_' } },
    { Descrizione: { _startswith: 'VE_ADD_' } },
    { Descrizione: { _startswith: 'EC-' } },
    { Descrizione: { _startswith: 'SR-02' } },
    { Descrizione: { _startswith: 'Test priority' } },
    { Descrizione: { _contains: 'Riconciliazione di test' } }
  ]
  const giustificativi = await apiGet(baseUrl, token, '/items/Giustificativi', {
    filter: JSON.stringify({ _or: giustDescPatterns }),
    fields: 'id',
    limit: -1
  })
  for (const g of (giustificativi.data || [])) {
    await apiDelete(baseUrl, token, `/items/Giustificativi/${g.id}`)
  }
  if ((giustificativi.data || []).length > 0) {
    console.log(`[CLEANUP] Deleted ${giustificativi.data.length} test giustificativi`)
  }

  // 3. Delete test famiglie
  const famiglie = await apiGet(baseUrl, token, '/items/Famiglie', {
    filter: JSON.stringify({ id_famiglia: { _startswith: 'TEST_FAM_AUTO_' } }),
    fields: 'id_famiglia',
    limit: -1
  })
  for (const f of (famiglie.data || [])) {
    // Delete Famiglie_Contatti first
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

  // 4. Delete contatti created by tests (all known patterns)
  const contattoPatterns = [
    { Cognome: { _eq: 'AutoTest' } },
    { Cognome: { _eq: 'TestEmail' } },
    { Cognome: { _eq: 'AutoTest' } },
    { Nome: { _startswith: 'Test CT ' } },
    { Nome: { _startswith: 'CT12 ' } },
    { Nome: { _startswith: 'Del Email ' } },
    { Nome: { _startswith: 'Test RC02' } },
    { Nome: { _startswith: 'Test RC03' } },
    { Nome: { _startswith: 'Test RC04' } },
    { Nome: { _startswith: 'Test RC05' } },
    { Nome: { _startswith: 'Test RF02' } },
    { Nome: { _startswith: 'Test RF' } },
    { Nome: { _startswith: 'Test SETUP02' } },
    { Nome: { _startswith: 'Test No Esiste' } },
    { Nome: { _startswith: 'Priority Test' } },
    { Nome: { _startswith: 'PAG' } },
    { Nome: { _startswith: 'GF-' } }
  ]
  const contatti = await apiGet(baseUrl, token, '/items/contatti', {
    filter: JSON.stringify({ _or: contattoPatterns }),
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
  const isLocalhost = url.includes('localhost') || url.includes('127.0.0.1')

  if (isProduction || !isLocalhost) {
    console.error(`\n❌ PERICOLO: VITE_API_URL punta a un ambiente NON locale!`)
    console.error(`   URL: ${url}`)
    console.error('   I test E2E DEVONO essere eseguiti solo su ambiente locale.')
    console.error('   Crea/aggiorna .env.local con:')
    console.error('   VITE_API_URL=http://localhost:8055')
    console.error('   VITE_ENV=local\n')
    process.exit(1)
  }

  console.log(`\n✅ GUARD: API URL = ${url} — OK (locale)\n`)

  // Cleanup test data from previous runs
  const token = await directusLogin(url, 'test.admin@test.com', 'TestAdmin_2026!')
  if (token) {
    await cleanupTestData(url, token)
  } else {
    console.log('[CLEANUP] Skipped — could not login as admin (database might be fresh)')
  }
}
