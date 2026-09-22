import { makeItems } from './items.js'

/**
 * Risoluzione dei destinatari a partire da un audience e da un filtro Directus.
 *
 * - `contatti`  → righe `contatti` che soddisfano `filter` (es. IsVolontario).
 * - `famiglie`  → contatti delle famiglie che soddisfano `filterFamiglia`,
 *                 filtrati per `ruoli` (Ruolo_nella_Famiglia).
 * - `contatto`  → un singolo contatto per id.
 *
 * Il filtro è costruito dal frontend (`filtriComunicazioni.js`): qui viene solo
 * eseguito. Il risultato è deduplicato per email (si preferisce l'ingresso con
 * contesto famiglia).
 */

const EMAIL_FIELDS = ['email.id', 'email.email_address', 'email.Primary']

const CONTATTO_FIELDS = ['id_contatto', 'Nome', 'Cognome', ...EMAIL_FIELDS]

const RUOLI_DEFAULT = ['Volontario', 'Genitore', 'Tutore', 'Referente']

/**
 * Sceglie l'email primaria di un contatto. L'invariante di dominio è "una sola
 * Primary per contatto"; per robustezza, se i dati sono ambigui (più Primary),
 * si usa quella con id minore (la più vecchia). Fallback: email con id minore.
 */
function primaryEmail(emails) {
  if (!Array.isArray(emails) || emails.length === 0) return null
  const withAddress = emails.filter(item => item?.email_address).sort((a, b) => (a?.id ?? 0) - (b?.id ?? 0))
  if (withAddress.length === 0) return null
  const primary = withAddress.find(item => item.Primary === true) || withAddress[0]
  return String(primary.email_address).toLowerCase()
}

function dedupByEmail(recipients) {
  const byEmail = new Map()
  for (const recipient of recipients) {
    if (!recipient.email) continue
    const existing = byEmail.get(recipient.email)
    if (!existing || (!existing.famigliaId && recipient.famigliaId)) {
      byEmail.set(recipient.email, recipient)
    }
  }
  return [...byEmail.values()]
}

async function resolveContatti(ctx, filter) {
  const items = await makeItems(ctx, 'contatti')
  const rows = await items.readByQuery({ filter: filter || {}, fields: CONTATTO_FIELDS, limit: -1 })
  return rows.map(row => ({
    contattoId: row.id_contatto,
    nome: row.Nome,
    cognome: row.Cognome,
    email: primaryEmail(row.email),
    famigliaId: null,
    famiglia: null
  }))
}

async function resolveFamiglie(ctx, filterFamiglia, ruoli) {
  const famiglieItems = await makeItems(ctx, 'Famiglie')
  const famiglie = await famiglieItems.readByQuery({
    filter: filterFamiglia || {},
    fields: ['id_famiglia', 'Nome_Famiglia'],
    limit: -1
  })
  if (famiglie.length === 0) return []

  const nomeById = new Map(famiglie.map(f => [f.id_famiglia, f.Nome_Famiglia]))
  const ids = famiglie.map(f => f.id_famiglia)
  const ruoliFiltro = Array.isArray(ruoli) && ruoli.length > 0 ? ruoli : RUOLI_DEFAULT

  const junction = await makeItems(ctx, 'Famiglie_Contatti')
  const links = await junction.readByQuery({
    filter: {
      Famiglia: { _in: ids },
      Ruolo_nella_Famiglia: { _in: ruoliFiltro },
      _or: [{ Disattivo: { _null: true } }, { Disattivo: { _eq: false } }]
    },
    fields: [
      'Contatto.id_contatto',
      'Contatto.Nome',
      'Contatto.Cognome',
      'Contatto.email.id',
      'Contatto.email.email_address',
      'Contatto.email.Primary',
      'Famiglia.id_famiglia'
    ],
    limit: -1
  })

  return links.map(link => ({
    contattoId: link.Contatto?.id_contatto,
    nome: link.Contatto?.Nome,
    cognome: link.Contatto?.Cognome,
    email: primaryEmail(link.Contatto?.email),
    famigliaId: link.Famiglia?.id_famiglia ?? null,
    famiglia: nomeById.get(link.Famiglia?.id_famiglia) ?? null
  }))
}

async function resolveSingolo(ctx, contattoId) {
  const items = await makeItems(ctx, 'contatti')
  const row = await items.readOne(contattoId, { fields: CONTATTO_FIELDS })
  if (!row) return []
  return [
    {
      contattoId: row.id_contatto,
      nome: row.Nome,
      cognome: row.Cognome,
      email: primaryEmail(row.email),
      famigliaId: null,
      famiglia: null
    }
  ]
}

export async function resolveRecipients({ ctx, audience, filter, filterFamiglia, ruoli, contattoId }) {
  let recipients
  if (audience === 'contatto') {
    recipients = await resolveSingolo(ctx, contattoId)
  } else if (audience === 'famiglie') {
    recipients = await resolveFamiglie(ctx, filterFamiglia, ruoli)
  } else {
    recipients = await resolveContatti(ctx, filter)
  }
  return dedupByEmail(recipients)
}
