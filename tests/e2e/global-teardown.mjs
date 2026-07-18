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
    return { data: [] }
  }
  return res.json()
}

async function apiDelete(baseUrl, token, path) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  })
  if (!res.ok) {
    console.warn(`[CLEANUP] DELETE ${path} → ${res.status}`)
  }
  return res.ok
}

async function cleanupTestData(baseUrl, token) {
  console.log('[TEARDOWN] Cleaning up test data...')

  // 1. Delete Test submissions
  const submissions = await apiGet(baseUrl, token, '/items/InviiGiustificativiNoLogin', {
    filter: JSON.stringify({ email: { _icontains: '@test.com' } }),
    fields: 'id',
    limit: -1
  })
  for (const s of (submissions.data || [])) {
    await apiDelete(baseUrl, token, `/items/InviiGiustificativiNoLogin/${s.id}`)
  }
  if ((submissions.data || []).length > 0) {
    console.log(`[TEARDOWN] Deleted ${submissions.data.length} test submissions`)
  }

  // 2. Delete giustificativi with TEST_ prefix
  const giustificativi = await apiGet(baseUrl, token, '/items/Giustificativi', {
    filter: JSON.stringify({ Descrizione: { _starts_with: 'TEST_' } }),
    fields: 'id',
    limit: -1
  })
  for (const g of (giustificativi.data || [])) {
    await apiDelete(baseUrl, token, `/items/Giustificativi/${g.id}`)
  }
  if ((giustificativi.data || []).length > 0) {
    console.log(`[TEARDOWN] Deleted ${giustificativi.data.length} test giustificativi`)
  }

  // 3. Delete progetti
  const progetti = await apiGet(baseUrl, token, '/items/Progetti', {
    filter: JSON.stringify({ Cognome_Beneficiario: { _starts_with: 'TEST_' } }),
    fields: 'id_progetto',
    limit: -1
  })
  for (const p of (progetti.data || [])) {
    await apiDelete(baseUrl, token, `/items/Progetti/${p.id_progetto}`)
  }
  if ((progetti.data || []).length > 0) {
    console.log(`[TEARDOWN] Deleted ${progetti.data.length} test progetti`)
  }

  // 4. Delete test famiglie
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
    console.log(`[TEARDOWN] Deleted ${famiglie.data.length} test famiglie`)
  }

  // 5. Delete contatti
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
    console.log(`[TEARDOWN] Deleted ${contatti.data.length} test contatti`)
  }

  // 6. Delete orphan email records with test addresses
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
    console.log(`[TEARDOWN] Deleted ${orphanEmails.data.length} orphan test email records`)
  }

  // 7. Delete orphan directus users with @test.com email
  const testUsers = await apiGet(baseUrl, token, '/users', {
    filter: JSON.stringify({ email: { _iends_with: '@test.com' } }),
    fields: 'id,email',
    limit: -1
  })
  for (const u of (testUsers.data || [])) {
    await apiDelete(baseUrl, token, `/users/${u.id}`)
  }
  if ((testUsers.data || []).length > 0) {
    console.log(`[TEARDOWN] Deleted ${testUsers.data.length} test users with @test.com email`)
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
    console.log(`[TEARDOWN] Deleted ${orphanFC.data.length} orphaned Famiglie_Contatti rows`)
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
      console.log(`[TEARDOWN] Deleted ${pagamenti.data.length} test pagamenti`)
    }
  }

  // 10. Delete test associazioni
  const associazioni = await apiGet(baseUrl, token, '/items/Associazioni', {
    filter: JSON.stringify({ Nome: { _starts_with: 'TEST_' } }),
    fields: 'id',
    limit: -1
  })
  for (const a of (associazioni.data || [])) {
    await apiDelete(baseUrl, token, `/items/Associazioni/${a.id}`)
  }
  if ((associazioni.data || []).length > 0) {
    console.log(`[TEARDOWN] Deleted ${associazioni.data.length} test associazioni`)
  }

  // 11. Delete test batch pagamenti
  const batch = await apiGet(baseUrl, token, '/items/BatchPagamenti', {
    filter: JSON.stringify({ Nome: { _starts_with: 'TEST_' } }),
    fields: 'id',
    limit: -1
  })
  for (const b of (batch.data || [])) {
    await apiDelete(baseUrl, token, `/items/BatchPagamenti/${b.id}`)
  }
  if ((batch.data || []).length > 0) {
    console.log(`[TEARDOWN] Deleted ${batch.data.length} test batch pagamenti`)
  }

  // 12. Delete test liste pagamenti
  const liste = await apiGet(baseUrl, token, '/items/ListePagamenti', {
    filter: JSON.stringify({ Nome: { _starts_with: 'TEST_' } }),
    fields: 'id',
    limit: -1
  })
  for (const l of (liste.data || [])) {
    await apiDelete(baseUrl, token, `/items/ListePagamenti/${l.id}`)
  }
  if ((liste.data || []).length > 0) {
    console.log(`[TEARDOWN] Deleted ${liste.data.length} test liste pagamenti`)
  }

  console.log('[TEARDOWN] Done')
}

export default async function () {
  const url = getApiUrl()

  const isProduction = PRODUCTION_PATTERNS.some(p => url.includes(p))
  const isDevelopment = DEVELOPMENT_PATTERNS.some(p => url.includes(p))

  if (isProduction) {
    return // safety: never run teardown on production
  }

  if (!isDevelopment) {
    return // safety: unknown env, skip
  }

  const token = await directusLogin(url, 'fake.admin@fake.com', 'FakeAdmin_2026!!')
  if (token) {
    await cleanupTestData(url, token)
  }
}
