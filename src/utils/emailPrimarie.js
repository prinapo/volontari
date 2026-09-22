/**
 * Rilevazione delle violazioni dell'invariante
 * "esattamente una email primaria per contatto".
 *
 * Funzione PURA: riceve email normalizzate `{ id, Primary, contattoId }`.
 * Regola di scelta: primaria = email con `id` minore (la più vecchia).
 */

export function calcolaViolazioniEmailPrimarie(emails = []) {
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
    const primarie = sorted.filter(email => email.Primary === true)
    if (primarie.length > 1) {
      duplicati.push({ contattoId, keepId: primarie[0].id, extraIds: primarie.slice(1).map(email => email.id) })
    } else if (primarie.length === 0 && sorted[0]?.id != null) {
      senzaPrimaria.push({ contattoId, keepId: sorted[0].id })
    }
  }

  return { duplicati, senzaPrimaria }
}
