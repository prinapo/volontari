import { comunicazioniService } from 'src/services/comunicazioni.service'
import { STATI_GIUSTIFICATIVO_VALIDI, STATO_GIUSTIFICATIVO } from 'src/utils/constants'
import {
  assembleFamiglieIdFilter,
  buildContattiRoleFilter,
  intersectIdSets,
  relId,
  unionIdSets
} from 'src/utils/filtriComunicazioni'

function toIds(rows = [], field) {
  const ids = new Set()
  for (const row of rows) {
    const id = relId(row[field])
    if (id != null) ids.add(id)
  }
  return ids
}

async function familiesWithProgetti({ statoProgetto = [], annoBando = null } = {}) {
  const filter = {}
  if (statoProgetto.length > 0) filter.StatoProgetto = { _in: statoProgetto }
  if (annoBando) filter.AnnoBando = { _eq: annoBando }
  if (Object.keys(filter).length === 0) return null
  const res = await comunicazioniService.getProgetti({ filter, fields: 'Famiglia' })
  return toIds(res.data.data, 'Famiglia')
}

async function resolveGiustificativiSets(condizione) {
  const res = await comunicazioniService.getGiustificativi({ filter: {}, fields: 'Famiglia,Stato,Invalidato' })
  const rows = res.data.data || []
  const anyFamilies = new Set()
  const draftFamilies = new Set()
  const nonDraftFamilies = new Set()
  const validFamilies = new Set()

  for (const giust of rows) {
    if (giust.Invalidato) continue
    const famigliaId = relId(giust.Famiglia)
    if (famigliaId == null) continue
    const stato = String(giust.Stato || '').toLowerCase()
    anyFamilies.add(famigliaId)
    if (stato === STATO_GIUSTIFICATIVO.DRAFT || stato === '') draftFamilies.add(famigliaId)
    else nonDraftFamilies.add(famigliaId)
    if (STATI_GIUSTIFICATIVO_VALIDI.includes(stato)) validFamilies.add(famigliaId)
  }

  if (condizione === 'nessuno') return { exclude: anyFamilies }
  if (condizione === 'solo_draft') return { include: draftFamilies, exclude: nonDraftFamilies }
  if (condizione === 'almeno_inviato') return { include: validFamilies }
  return {}
}

async function familiesWithPagamenti(stati = []) {
  if (stati.length === 0) return {}
  const wanted = stati.filter(stato => stato !== 'nessuno')
  let include = null
  let exclude = null

  if (wanted.length > 0) {
    // eslint-disable-next-line no-restricted-syntax -- filtro di lettura su Pagamenti.Stato, non scrittura di stato
    const res = await comunicazioniService.getPagamenti({ filter: { Stato: { _in: wanted } } })
    include = toIds(res.data.data, 'Famiglia')
  }
  if (stati.includes('nessuno')) {
    const res = await comunicazioniService.getPagamenti({ filter: {} })
    exclude = toIds(res.data.data, 'Famiglia')
  }
  return { include, exclude }
}

async function familiesWithVolontario() {
  const res = await comunicazioniService.getFamiglieContatti({
    filter: {
      Ruolo_nella_Famiglia: { _eq: 'Volontario' },
      _or: [{ Disattivo: { _null: true } }, { Disattivo: { _eq: false } }]
    },
    fields: 'Famiglia'
  })
  return toIds(res.data.data, 'Famiglia')
}

async function familiesWithReferente(referenteId) {
  const res = await comunicazioniService.getFamiglieContatti({
    filter: { Ruolo_nella_Famiglia: { _eq: 'Referente' }, Contatto: { _eq: referenteId } },
    fields: 'Famiglia'
  })
  return toIds(res.data.data, 'Famiglia')
}

async function buildFamigliePayload({
  ruoli = [],
  statoProgetto = [],
  annoBando = null,
  giustificativi = null,
  pagamenti = [],
  senzaVolontario = false,
  referenteId = null
} = {}) {
  const includeSets = []
  const excludeSets = []

  const byProgetti = await familiesWithProgetti({ statoProgetto, annoBando })
  if (byProgetti) includeSets.push(byProgetti)

  if (giustificativi) {
    const { include, exclude } = await resolveGiustificativiSets(giustificativi)
    if (include) includeSets.push(include)
    if (exclude) excludeSets.push(exclude)
  }

  if (pagamenti.length > 0) {
    const { include, exclude } = await familiesWithPagamenti(pagamenti)
    if (include) includeSets.push(include)
    if (exclude) excludeSets.push(exclude)
  }

  if (referenteId) includeSets.push(await familiesWithReferente(referenteId))
  if (senzaVolontario) excludeSets.push(await familiesWithVolontario())

  return {
    audience: 'famiglie',
    filterFamiglia: assembleFamiglieIdFilter({
      includeIds: intersectIdSets(includeSets),
      excludeIds: unionIdSets(excludeSets)
    }),
    ruoli: ruoli.length > 0 ? ruoli : undefined
  }
}

/**
 * Traduce i filtri UI nel payload accettato dall'endpoint `/communications`.
 * Le condizioni di dominio vengono risolte in insiemi di id famiglia.
 */
export async function buildPayload(filters = {}) {
  const { audience, ruoli = [], contattoId = null } = filters
  if (audience === 'contatto') return { audience, contattoId }
  if (audience === 'famiglie') return buildFamigliePayload(filters)
  return { audience: 'contatti', filter: buildContattiRoleFilter(ruoli) || undefined }
}

/** Conteggio + anteprima destinatari. */
export async function contaDestinatari(filters) {
  const payload = await buildPayload(filters)
  const res = await comunicazioniService.countRecipients(payload)
  return res.data
}

/** Invio effettivo: ritorna { comunicazioneId, totale, inviati, falliti, errori }. */
export async function inviaComunicazione({ subject, body, link, tipo, ...filters }) {
  const payload = await buildPayload(filters)
  const res = await comunicazioniService.send({ ...payload, subject, body, link, tipo })
  return res.data
}
