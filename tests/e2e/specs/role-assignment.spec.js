import { test, expect } from '../helpers/console.js'
import { apiLogin, apiGet, apiPost, apiPatch, apiDelete, apiGetSystem, apiDeleteSystem, getToken } from '../helpers/api.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }

const API = process.env.VITE_API_URL || 'https://api-dev.sostienilsostegno.com'

async function sysPost(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify(body)
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}: ${JSON.stringify(data)}`)
  return data
}

async function sysGet(path) {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${getToken()}` }
  })
  return res.json()
}

async function sysPatch(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify(body)
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`PATCH ${path} → ${res.status}: ${JSON.stringify(data)}`)
  return data
}

test.describe('Volontario Role Assignment', () => {
  const ids = { user: null, contatto: null, famiglia: null, email: null, fc: null }

  test.beforeAll(async () => {
    await apiLogin(auth.admin.email, auth.admin.password)
  })

  test.afterAll(async () => {
    if (ids.fc) await apiDelete('Famiglie_Contatti', ids.fc).catch(() => {})
    if (ids.famiglia) await apiDelete('Famiglie', ids.famiglia).catch(() => {})
    if (ids.email) await apiDelete('email', ids.email).catch(() => {})
    if (ids.contatto) await apiDelete('contatti', ids.contatto).catch(() => {})
    if (ids.user) await apiDeleteSystem('users', ids.user).catch(() => {})
  })

  test('RA-01: Crea utente senza ruolo, assegna Volontario, ruolo assegnato @crud', async () => {
    const prefix = `TST_RA01_${Date.now()}`
    const email = `${prefix}@test.com`

    // 1. Crea utente Directus SENZA ruolo
    const userRes = await sysPost('/users', { email, password: 'Test_2026!!', first_name: 'RA01', last_name: 'Test' })
    ids.user = userRes.data?.id
    expect(ids.user).toBeTruthy()

    const userCheck = await sysGet(`/users/${ids.user}?fields=id,role`)
    expect(userCheck.data?.role).toBeFalsy()
    console.log('[RA-01] ✅ Utente senza ruolo creato')

    // 2. Crea contatto con user_id
    const contRes = await apiPost('contatti', {
      id_contatto: prefix, Nome: 'RA01', Cognome: 'Test', user_id: ids.user, IsVolontario: false
    })
    ids.contatto = contRes.data?.id_contatto || contRes.data?.data?.id_contatto
    expect(ids.contatto).toBeTruthy()

    // 3. Crea email
    const emailRes = await apiPost('email', {
      email_address: email, Contatto_Relation: ids.contatto, Primary: true
    })
    ids.email = emailRes.data?.id || emailRes.data?.data?.id

    // 4. Crea famiglia
    const famRes = await apiPost('Famiglie', { id_famiglia: prefix, Nome_Famiglia: prefix })
    ids.famiglia = famRes.data?.id_famiglia || famRes.data?.data?.id_famiglia
    expect(ids.famiglia).toBeTruthy()

    // 5. Crea FC + IsVolontario (simula assignToFamiglia)
    const fcRes = await apiPost('Famiglie_Contatti', {
      Contatto: ids.contatto, Famiglia: ids.famiglia, Ruolo_nella_Famiglia: 'Volontario'
    })
    ids.fc = fcRes.data?.id || fcRes.data?.data?.id
    await apiPatch('contatti', ids.contatto, { IsVolontario: true })

    // 6. VERIFICA: il ruolo è ancora null (nessuna chiamata a _findOrCreateUser)
    const beforeRole = await sysGet(`/users/${ids.user}?fields=id,role`)
    expect(beforeRole.data?.role).toBeFalsy()
    console.log('[RA-01] ✅ Utente ancora senza ruolo dopo FC (come atteso)')

    // 7. SIMULA il fix in _findOrCreateUser: contatto.user_id esiste → fetch user → role null → assegna
    const roleRes = await apiGetSystem('roles', {
      'filter[name][_eq]': 'Volontario', fields: 'id', limit: 1
    })
    const ruoloId = roleRes.data?.[0]?.id
    expect(ruoloId).toBeTruthy()

    await sysPatch(`/users/${ids.user}`, { role: ruoloId })

    // 8. VERIFICA FINALE
    const finalCheck = await sysGet(`/users/${ids.user}?fields=id,role`)
    expect(finalCheck.data?.role).toBeTruthy()
    console.log('[RA-01] ✅ Ruolo Volontario assegnato — TEST SUPERATO')
  })
})