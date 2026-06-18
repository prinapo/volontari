/**
 * API setup helpers — for TEST SETUP ONLY.
 * Queste funzioni creano dati di test via API Directus autenticata.
 * NON vanno usate per asserzioni — solo per preparare lo stato prima di un test.
 *
 * La regola "no API" si applica alle asserzioni e all'interazione col test,
 * non al setup dei dati necessari al test stesso.
 */

const API_URL = 'http://localhost:8055'

async function api(page, method, path, body) {
  return page.evaluate(async ({ method, path, body, API_URL }) => {
    const token = localStorage.getItem('access_token')
    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: body ? JSON.stringify(body) : undefined
    })
    const data = await res.json()
    if (!res.ok) throw new Error(`API ${method} ${path} → ${res.status}: ${JSON.stringify(data)}`)
    return data
  }, { method, path, body, API_URL })
}

/**
 * Crea un contatto via API e restituisce il suo id_contatto.
 */
export async function createContatto(page, { Nome, Cognome, email, IsReferente } = {}) {
  const id_contatto = Math.floor(Math.random() * 900000) + 1000000
  await api(page, 'POST', '/items/contatti', {
    id_contatto,
    Nome: Nome || 'Test',
    Cognome: Cognome || 'Setup',
    Numero_di_cellulare: null,
    Numero_di_telefono: null,
    IsReferente: IsReferente || false
  })
  if (email) {
    const emailRes = await api(page, 'POST', '/items/email', {
      email_address: email,
      Contatto_Relation: id_contatto,
      Primary: true
    })
    return { id_contatto, emailId: emailRes.data?.id }
  }
  return { id_contatto }
}

/**
 * Assegna un contatto a una famiglia con un ruolo specifico.
 */
export async function assignToFamiglia(page, contattoId, famigliaId, ruolo) {
  await api(page, 'POST', '/items/Famiglie_Contatti', {
    id: Math.floor(Math.random() * 900000) + 2000000,
    Contatto: contattoId,
    Famiglia: famigliaId,
    Ruolo_nella_Famiglia: ruolo || 'Volontario',
    Disattivo: false
  })
  if (ruolo === 'Genitore') {
    await api(page, 'PATCH', `/items/contatti/${contattoId}`, { IsGenitore: true })
  }
}

/**
 * Crea una famiglia via API.
 */
export async function createFamiglia(page, { Nome_Famiglia, IBAN, Intestatario_CC } = {}) {
  const id_famiglia = `TEST_FAM_AUTO_${Date.now()}`
  await api(page, 'POST', '/items/Famiglie', {
    id_famiglia,
    Nome_Famiglia: Nome_Famiglia || `Test Famiglia ${Date.now()}`,
    IBAN: IBAN || null,
    Intestatario_CC: Intestatario_CC || null
  })
  return id_famiglia
}
