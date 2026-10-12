/**
 * Rilevazione delle violazioni degli invarianti sulle email dei contatti.
 *
 * Funzioni PURE: ricevono email normalizzate `{ id, email_address, Primary, contattoId }`.
 *
 * - `calcolaViolazioniEmailPrimarie`: esattamente una primaria per contatto.
 *   La primaria da tenere è quella che coincide con l'email di login (se nota),
 *   altrimenti quella con id minore (la più vecchia).
 * - `calcolaDisallineatiLoginPrimaria`: contatti in cui l'email di login dell'utente
 *   Directus non coincide con l'email primaria del contatto.
 */

function pickKeep(candidates, loginEmail) {
  if (loginEmail) {
    const match = candidates.find(email => (email.email_address || '').toLowerCase() === loginEmail)
    if (match) return match
  }
  return candidates[0]
}

/**
 * Email preferita di un contatto: la Primary (a parità, quella con id minore);
 * fallback all'email con id minore. Ritorna null se non c'è un indirizzo.
 * @param {Array} emails
 * @returns {string|null}
 */
export function pickEmail(emails) {
  if (!Array.isArray(emails) || emails.length === 0) return null
  const withAddress = emails.filter(email => email?.email_address).sort((a, b) => (a?.id ?? 0) - (b?.id ?? 0))
  if (withAddress.length === 0) return null
  return (withAddress.find(email => email.Primary) || withAddress[0]).email_address
}

export function calcolaViolazioniEmailPrimarie(emails = [], loginByContatto = new Map()) {
  const byContatto = new Map()
  for (const email of emails) {
    if (email?.contattoId == null) continue
    const key = String(email.contattoId)
    if (!byContatto.has(key)) byContatto.set(key, [])
    byContatto.get(key).push(email)
  }

  const duplicati = []
  const senzaPrimaria = []

  for (const [contattoId, list] of byContatto) {
    const sorted = [...list].sort((a, b) => (a.id ?? 0) - (b.id ?? 0))
    const loginEmail = loginByContatto.get(contattoId)?.toLowerCase() || null
    const primarie = sorted.filter(email => email.Primary === true)

    if (primarie.length > 1) {
      const keep = pickKeep(primarie, loginEmail)
      duplicati.push({
        contattoId,
        keepId: keep.id,
        extraIds: primarie.filter(email => email.id !== keep.id).map(email => email.id)
      })
    } else if (primarie.length === 0 && sorted[0]?.id != null) {
      const keep = pickKeep(sorted, loginEmail)
      senzaPrimaria.push({ contattoId, keepId: keep.id })
    }
  }

  return { duplicati, senzaPrimaria }
}

export function calcolaDisallineatiLoginPrimaria(rows = []) {
  const disallineati = []
  for (const row of rows) {
    const login = (row.loginEmail || '').toLowerCase()
    const primary = (row.primaryEmail || '').toLowerCase()
    if (login && primary && login !== primary) disallineati.push(row)
  }
  return disallineati
}
