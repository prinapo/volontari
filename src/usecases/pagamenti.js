import { adminService } from 'src/services/admin.service'
import { famiglieService } from 'src/services/famiglie.service'
import { pagamentiService } from 'src/services/pagamenti.service'
import { progettiService } from 'src/services/progetti.service'
import { verificaService } from 'src/services/verifica.service'
import { STATI_PROGETTO_FINALI, STATO_PAGAMENTO, STATO_PROGETTO } from 'src/utils/constants'
import { calcolaStatoProgetto } from 'src/utils/statoProgetto'

function parseNum(v) {
  return Number.parseFloat(v) || 0
}

async function getPagamentoById(pagamentoId) {
  const res = await pagamentiService.getPagamenti({ 'filter[id][_eq]': pagamentoId, limit: 1 })
  return res.data.data?.[0]
}

/**
 * Ricalcola i totali progetto (TotaleVerificato/Proposto/InPagamento/Pagato/
 * ResiduoAllocato) e lo StatoProgetto dopo un cambiamento di pagamento.
 * Chiusura automatica quando il derivato differisce dall'attuale.
 */
export async function ricalcolaTotaliProgetto(progettoId) {
  const id = typeof progettoId === 'object' ? progettoId?.id_progetto || progettoId?.id : progettoId
  if (!id) return
  const progRes = await progettiService.getById(id)
  const progetto = progRes.data.data
  if (!progetto) return

  const giustRes = await verificaService.getGiustificativiByProgetto(id)
  const giustificativi = giustRes.data.data || []
  const totaleVerificato = giustificativi
    .filter(g => g.Stato === 'verificato')
    .reduce((s, g) => s + parseNum(g.Importo), 0)

  const pagamentiRes = await pagamentiService.getPagamenti({ 'filter[Progetto][_eq]': id, limit: -1 })
  const tutti = pagamentiRes.data.data || []
  const proposto = tutti.find(p => p.Stato === STATO_PAGAMENTO.PROPOSTO)
  const inPagamento = tutti
    .filter(p => p.Stato === STATO_PAGAMENTO.IN_PAGAMENTO)
    .reduce((s, p) => s + parseNum(p.Importo), 0)
  const pagato = tutti.filter(p => p.Stato === STATO_PAGAMENTO.PAGATO).reduce((s, p) => s + parseNum(p.Importo), 0)

  const allocato = parseNum(progetto.Allocato)
  const totaleProposto = proposto ? parseNum(proposto.Importo) : 0
  const residuo = allocato - (totaleProposto + inPagamento + pagato)

  await progettiService.updateStats(id, {
    TotaleVerificato: totaleVerificato,
    TotaleProposto: totaleProposto,
    TotaleInPagamento: inPagamento,
    TotalePagato: pagato,
    ResiduoAllocato: Math.max(0, residuo)
  })

  const statoProgettoAttuale =
    progetto.StatoProgetto === STATO_PROGETTO.APERTO ? STATO_PROGETTO.ACCETTATO : progetto.StatoProgetto
  const statoProgettoCalcolato = calcolaStatoProgetto({
    statoProgetto: statoProgettoAttuale,
    allocato,
    rimborsato: pagato,
    giustificativi
  })

  if (statoProgettoCalcolato !== statoProgettoAttuale) {
    await chiudiProgetto(id, { automatica: true, stato: statoProgettoCalcolato })
  }
}

/**
 * Ricalcola la proposta di pagamento di un progetto (crea/aggiorna/annulla il
 * pagamento PROPOSTO). Idempotente: si basa solo su dati freschi.
 */
export async function ricalcolaProposta(progettoId, { iban, intestatario } = {}) {
  const progRes = await progettiService.getById(progettoId)
  const progetto = progRes.data.data
  if (!progetto) return
  const statEffettivo =
    progetto.StatoProgetto === STATO_PROGETTO.APERTO ? STATO_PROGETTO.ACCETTATO : progetto.StatoProgetto
  if (STATI_PROGETTO_FINALI.includes(statEffettivo)) return

  const giustRes = await verificaService.getGiustificativiByProgetto(progettoId)
  const giustificativi = giustRes.data.data || []
  const totaleVerificato = giustificativi
    .filter(g => g.Stato === 'verificato')
    .reduce((s, g) => s + parseNum(g.Importo), 0)

  const pagamentiRes = await pagamentiService.getPagamenti({
    'filter[Progetto][_eq]': progettoId,
    'filter[_or][0][Stato][_eq]': STATO_PAGAMENTO.IN_PAGAMENTO,
    'filter[_or][1][Stato][_eq]': STATO_PAGAMENTO.PAGATO,
    limit: -1
  })
  const totaleStorico = (pagamentiRes.data.data || []).reduce((s, p) => s + parseNum(p.Importo), 0)

  const allocato = parseNum(progetto.Allocato)
  const pct = Math.min(100, Math.max(0, progetto.MassimaPercentualeErogabile ?? 80))
  const erogabile = Math.min(totaleVerificato * (pct / 100), allocato)
  const nuovoProposto = Math.round((erogabile - totaleStorico) * 100) / 100

  const esistenteRes = await pagamentiService.getPagamenti({
    'filter[Progetto][_eq]': progettoId,
    'filter[Stato][_eq]': STATO_PAGAMENTO.PROPOSTO,
    limit: 1
  })
  const esistente = (esistenteRes.data.data || [])[0]

  if (nuovoProposto > 0) {
    await (esistente
      ? pagamentiService.updatePagamento(esistente.id, { Importo: nuovoProposto })
      : pagamentiService.createPagamento({
          Progetto: progettoId,
          Famiglia: progetto.Famiglia,
          Importo: nuovoProposto,
          Stato: STATO_PAGAMENTO.PROPOSTO,
          IBAN: iban || progetto.IBAN || '',
          Intestatario: intestatario || progetto.Intestatario_CC || '',
          DataProposta: new Date().toISOString()
        }))
  } else if (esistente) {
    await pagamentiService.updatePagamento(esistente.id, {
      Stato: STATO_PAGAMENTO.ANNULLATO,
      NoteEsito: 'Proposta annullata: importo non più dovuto',
      Batch: null
    })
  }

  await ricalcolaTotaliProgetto(progettoId)
}

/**
 * Side-effect obbligatorio di segnaPagato: invia l'email di notifica al
 * destinatario (volontario, poi genitore) e marca NotificaInviata.
 */
export async function inviaNotificaPagamento(pagamento) {
  if (!pagamento || pagamento.NotificaInviata) return
  const progRes = await progettiService.getById(pagamento.Progetto)
  const progetto = progRes.data.data
  if (!progetto) return

  const volontariRes = await famiglieService.getVolontariByFamiglia(pagamento.Famiglia)
  const volontari = volontariRes.data.data || []
  const mainVolontario = volontari.find(v => v.Contatto?.user_id)
  let destinatario = mainVolontario?.Contatto?.email?.[0]?.email_address

  if (!destinatario) {
    const genitoriRes = await famiglieService.getGenitoriByFamiglia(pagamento.Famiglia)
    const genitori = genitoriRes.data.data || []
    const mainGenitore = genitori.find(g => g.Contatto?.email?.length > 0)
    destinatario =
      mainGenitore?.Contatto?.email?.find(e => e.Primary)?.email_address ||
      mainGenitore?.Contatto?.email?.[0]?.email_address
  }

  if (!destinatario) {
    console.warn(`[Pagamento] Nessun destinatario per famiglia ${pagamento.Famiglia}`)
    return
  }

  const famigliaRes = await famiglieService.getById(pagamento.Famiglia)
  const nomeFamiglia = famigliaRes.data.data?.Nome_Famiglia || 'Famiglia'

  await adminService.sendEmail({
    to: destinatario,
    subject: 'Pagamento effettuato',
    body: `Gentile volontario, il pagamento di €${parseNum(pagamento.Importo).toFixed(2)} per la famiglia "${nomeFamiglia}" è stato effettuato con successo.`
  })

  await pagamentiService.updatePagamento(pagamento.id, { NotificaInviata: true })
}

export async function segnaPagato(pagamentoId) {
  const pagamento = await getPagamentoById(pagamentoId)
  if (!pagamento || pagamento.Stato !== STATO_PAGAMENTO.IN_PAGAMENTO) {
    throw new Error('Solo pagamenti in_pagamento possono essere segnati come pagati')
  }
  await pagamentiService.updatePagamento(pagamentoId, {
    Stato: STATO_PAGAMENTO.PAGATO,
    DataPagamento: new Date().toISOString()
  })
  await ricalcolaTotaliProgetto(pagamento.Progetto)
  await inviaNotificaPagamento(pagamento)
  return pagamento
}

export async function segnaFallito(pagamentoId, note) {
  const pagamento = await getPagamentoById(pagamentoId)
  if (!pagamento || pagamento.Stato !== STATO_PAGAMENTO.IN_PAGAMENTO) {
    throw new Error('Solo pagamenti in_pagamento possono essere segnati come falliti')
  }
  await pagamentiService.updatePagamento(pagamentoId, {
    Stato: STATO_PAGAMENTO.FALLITO,
    NoteEsito: note
  })
  await ricalcolaTotaliProgetto(pagamento.Progetto)
  return pagamento
}

export async function segnaAnnullato(pagamentoId) {
  const pagamento = await getPagamentoById(pagamentoId)
  if (!pagamento || !['in_pagamento', 'fallito'].includes(pagamento.Stato)) {
    throw new Error('Solo pagamenti in_pagamento o falliti possono essere rimossi dal gruppo')
  }
  const batchId = pagamento.Batch
  await pagamentiService.updatePagamento(pagamentoId, {
    Stato: STATO_PAGAMENTO.ANNULLATO,
    Batch: null,
    NoteEsito: 'Rimosso dal gruppo'
  })
  await ricalcolaTotaliProgetto(pagamento.Progetto)
  await ricalcolaProposta(pagamento.Progetto, {
    iban: pagamento.IBAN,
    intestatario: pagamento.Intestatario
  })
  return { pagamento, batchId }
}

export async function ripristinaProposto(pagamentoId) {
  const pagamento = await getPagamentoById(pagamentoId)
  if (!pagamento) throw new Error('Pagamento non trovato')
  await pagamentiService.updatePagamento(pagamentoId, {
    Stato: STATO_PAGAMENTO.PROPOSTO,
    Batch: null
  })
  await ricalcolaTotaliProgetto(pagamento.Progetto)
  return pagamento
}

export async function ripristinaInPagamento(pagamentoId) {
  await pagamentiService.updatePagamento(pagamentoId, { Stato: STATO_PAGAMENTO.IN_PAGAMENTO, NoteEsito: null })
}

export async function correggiDati(pagamentoId, { iban, intestatario }) {
  const pagamento = await getPagamentoById(pagamentoId)
  if (!pagamento || pagamento.Stato !== STATO_PAGAMENTO.FALLITO) {
    throw new Error('Solo pagamenti falliti sono modificabili')
  }
  await pagamentiService.updatePagamento(pagamentoId, { IBAN: iban, Intestatario: intestatario })
  await famiglieService.update(pagamento.Famiglia, { IBAN: iban, Intestatario_CC: intestatario })
}

export async function chiudiProgetto(
  progettoId,
  { automatica = false, motivo = null, stato = STATO_PROGETTO.CHIUSO } = {}
) {
  await progettiService.updateStats(progettoId, {
    StatoProgetto: stato,
    DataChiusura: new Date().toISOString(),
    MotivoChiusura: automatica
      ? stato === STATO_PROGETTO.RIMBORSO_PARZIALE
        ? motivo || 'Chiusura parziale'
        : 'Importo allocato interamente pagato'
      : motivo
  })
}

export async function riapriProgetto(progettoId) {
  await progettiService.updateStats(progettoId, {
    StatoProgetto: STATO_PROGETTO.ACCETTATO,
    DataChiusura: null,
    MotivoChiusura: null
  })
}
