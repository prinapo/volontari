import { apiLogin, apiGet, apiDelete, setToken } from './api.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }

process.env.API_URL = process.env.API_URL || 'http://localhost:8055'

const PATTERN = 'TEST'

async function findAndDelete(collection, filterField, idField) {
  const res = await apiGet(collection, {
    filter: JSON.stringify({ [filterField]: { _icontains: PATTERN } }),
    fields: idField,
    limit: -1
  })
  const items = res.data || []
  if (items.length === 0) return 0
  for (const item of items) {
    try {
      await apiDelete(collection, item[idField])
    } catch {
      console.warn(`Failed to delete ${collection} ${item[idField]}`)
    }
  }
  return items.length
}

async function main() {
  await apiLogin(auth.admin.email, auth.admin.password)

  const results = []
  results.push(['contatti', await findAndDelete('contatti', 'Cognome', 'id_contatto')])
  results.push(['Famiglie', await findAndDelete('Famiglie', 'Nome_Famiglia', 'id_famiglia')])
  results.push(['Progetti', await findAndDelete('Progetti', 'Cognome_Beneficiario', 'id_progetto')])
  results.push(['Giustificativi', await findAndDelete('Giustificativi', 'Descrizione', 'id')])
  results.push(['InviiGiustificativiNoLogin', await findAndDelete('InviiGiustificativiNoLogin', 'email', 'id')])

  console.log('=== Purge results ===')
  for (const [table, count] of results) {
    console.log(`  ${table}: ${count} deleted`)
  }
}

main().catch(console.error)
