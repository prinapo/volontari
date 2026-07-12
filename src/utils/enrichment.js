/**
 * Arricchisce una mappa contatto → email con i dati delle email
 * @param {string[]} contattoIds - ID dei contatti
 * @param {Function} getEmailsFn - Funzione per ottenere le email (es. emailService.getByContatto)
 * @returns {Promise<Object.<string, Array<{email_address: string, Primary: boolean}>>>}
 */
export async function enrichWithEmails(contattoIds, getEmailsFn) {
  if (!contattoIds || contattoIds.length === 0) return {}
  const emailRes = await getEmailsFn(contattoIds)
  const emails = emailRes.data.data || []
  const emailByContatto = {}
  for (const e of emails) {
    if (e.Contatto_Relation) {
      if (!emailByContatto[e.Contatto_Relation]) {
        emailByContatto[e.Contatto_Relation] = []
      }
      emailByContatto[e.Contatto_Relation].push({
        email_address: e.email_address,
        Primary: e.Primary === true
      })
    }
  }
  return emailByContatto
}
