import { contattiService } from 'src/services/contatti.service'
import { emailService } from 'src/services/email.service'
import { famiglieService } from 'src/services/famiglie.service'
import { gestioneService } from 'src/services/gestione.service'
import { referentiService } from 'src/services/referenti.service'
import { usersService } from 'src/services/users.service'

/**
 * Imposta una email come primaria per il contatto e rende non primarie tutte le
 * altre. Se il contatto ha un account Directus, allinea anche l'email di login
 * (`directus_users.email`): l'invariante è "primaria = email di login".
 */
export async function impostaEmailPrimaria({ contattoId, emailId }) {
  const [emailRes, contattoRes] = await Promise.all([
    emailService.getAllByContatto(contattoId),
    contattiService.getById(contattoId)
  ])
  const emails = emailRes.data.data || []
  const target = emails.find(email => email.id === emailId)
  if (!target) throw new Error('Email non trovata')

  await Promise.all(emails.map(email => emailService.update(email.id, { Primary: email.id === emailId })))

  const userId = contattoRes.data.data?.user_id
  if (userId) await usersService.update(userId, { email: target.email_address })

  return { contattoId, emailId }
}

/**
 * Elimina una email NON primaria. La primaria (email di login) non è mai
 * cancellabile direttamente: per sostituirla va prima promossa un'altra email.
 */
export async function eliminaEmail({ contattoId, emailId }) {
  const res = await emailService.getAllByContatto(contattoId)
  const emails = res.data.data || []
  const target = emails.find(email => email.id === emailId)
  if (!target) throw new Error('Email non trovata')
  if (target.Primary) {
    throw new Error("Non puoi eliminare l'email primaria: promuovine un'altra e riprova")
  }
  await emailService.remove(emailId)
}

/**
 * Elimina un contatto (solo senza account Directus). Rimuove a cascata le sue
 * email, i link famiglia e i link referente.
 */
export async function eliminaContatto({ contattoId }) {
  const contattoRes = await contattiService.getById(contattoId)
  const contatto = contattoRes.data.data
  if (!contatto) throw new Error('Contatto non trovato')
  if (contatto.user_id) {
    throw new Error('Contatto con account Directus: cancellazione non supportata')
  }

  const emailRes = await emailService.getAllByContatto(contattoId)
  for (const email of emailRes.data.data || []) await emailService.remove(email.id)

  const linksRes = await famiglieService.getFamiglieByContatto(contattoId)
  for (const link of linksRes.data.data || []) await gestioneService.deleteFamigliaContatto(link.id)

  const asVolontario = await referentiService.getByVolontario(contattoId)
  for (const rel of asVolontario.data.data || []) await referentiService.remove(rel.id)

  const asReferente = await referentiService.getByReferente(contattoId)
  for (const rel of asReferente.data.data || []) await referentiService.remove(rel.id)

  await contattiService.remove(contattoId)
}

/**
 * Applica le correzioni calcolate dal rilevamento puro: mantiene `keepId` come
 * primaria, azzera le `extraIds`. Idempotente.
 */
export async function applicaCorrezioniEmailPrimarie({ duplicati = [], senzaPrimaria = [] } = {}) {
  const updates = []
  for (const violazione of duplicati) {
    for (const id of violazione.extraIds) updates.push(emailService.update(id, { Primary: false }))
  }
  for (const violazione of senzaPrimaria) {
    updates.push(emailService.update(violazione.keepId, { Primary: true }))
  }
  await Promise.all(updates)
  return {
    contattiCorretti: duplicati.length + senzaPrimaria.length,
    aggiornamenti: updates.length
  }
}

/**
 * Allinea la primaria del contatto all'email di login: se esiste una email con
 * quell'indirizzo la rende primaria, altrimenti la crea. Usato dal check
 * "login vs primaria" (deriva da modifiche fatte in Directus Studio).
 */
export async function allineaPrimariaALogin({ contattoId, loginEmail }) {
  const res = await emailService.getAllByContatto(contattoId)
  const emails = res.data.data || []
  const login = String(loginEmail).toLowerCase()
  const target = emails.find(email => (email.email_address || '').toLowerCase() === login)

  if (!target) {
    await emailService.create({ email_address: login, Contatto_Relation: contattoId, Primary: true })
    await Promise.all(emails.map(email => emailService.update(email.id, { Primary: false })))
    return
  }
  await Promise.all(emails.map(email => emailService.update(email.id, { Primary: email.id === target.id })))
}
