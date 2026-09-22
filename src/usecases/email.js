import { emailService } from 'src/services/email.service'
import { calcolaViolazioniEmailPrimarie } from 'src/utils/emailPrimarie'

function relId(value) {
  if (value == null) return null
  if (typeof value === 'object') return value.id_contatto ?? value.id ?? null
  return value
}

/**
 * Imposta una email come primaria per il contatto e rende non primarie tutte le
 * altre. È l'azione unica usata da Gestione (ContattoDialog) e Impostazioni.
 */
export async function impostaEmailPrimaria({ contattoId, emailId }) {
  const res = await emailService.getAllByContatto(contattoId)
  const emails = res.data.data || []
  await Promise.all(emails.map(email => emailService.update(email.id, { Primary: email.id === emailId })))
  return { contattoId, emailId }
}

/**
 * Normalizza l'invariante "una sola email primaria per contatto" su tutti i
 * contatti: mantiene la primaria con id minore (la più vecchia), azzera le
 * altre ed elegge la più vecchia dove non ce n'è nessuna. Idempotente.
 */
export async function normalizzaEmailPrimarie() {
  const res = await emailService.getAll()
  const rows = res.data.data || []
  const emails = rows.map(email => ({
    id: email.id,
    Primary: email.Primary === true,
    contattoId: relId(email.Contatto_Relation)
  }))

  const { duplicati, senzaPrimaria } = calcolaViolazioniEmailPrimarie(emails)

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
