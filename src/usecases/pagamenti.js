import { adminService } from 'src/services/admin.service'
import { famiglieService } from 'src/services/famiglie.service'
import { giustificativiService } from 'src/services/giustificativi.service'
import { pagamentiService } from 'src/services/pagamenti.service'
import { progettiService } from 'src/services/progetti.service'
import { verificaService } from 'src/services/verifica.service'
import { EVENTI_GIUSTIFICATIVO, giustificativoMachine } from 'src/state-machines/giustificativo'
import { EVENTI_PAGAMENTO, pagamentoMachine } from 'src/state-machines/pagamento'
import { EVENTI_PROGETTO, eventoRicalcoloProgetto, progettoMachine } from 'src/state-machines/progetto'
import { creaConStatoIniziale, transita } from 'src/usecases/stato/transita'
import {
  STATI_GIUSTIFICATIVO_CONTABILI,
  STATI_PROGETTO_OPERATIVI,
  STATO_GIUSTIFICATIVO,
  STATO_PAGAMENTO,
  STATO_PROGETTO
} from 'src/utils/constants'
import { calcolaErogabile, residuoDaCoprire } from 'src/utils/erogabile'
import { calcolaStatoProgetto, statoProgettoEffettivo } from 'src/utils/statoProgetto'

function parseNum(v) {
  return Number.parseFloat(v) || 0
}

function isContabile(stato) {
  return STATI_GIUSTIFICATIVO_CONTABILI.includes(stato)
}

function pagamentoIdDi(giustificativo) {
  const p = giustificativo?.Pagamento
  if (p == null) return null
  return typeof p === 'object' ? p.id : p
}

async function getPagamentoById(pagamentoId) {
  const res = await pagamentiService.getPagamenti({ 'filter[id][_eq]': pagamentoId, limit: 1 })
  return res.data.data?.[0]
}

/**
 * Collega alla proposta i giustificativi verificati non ancora coperti da un
 * altro pagamento (o già collegati alla proposta stessa).
 */
async function _collegaGiustificativi(giustificativi, pagamentoId) {
  const daCollegare = giustificativi.filter(
    g =>
      !g.Invalidato &&
      g.Stato === STATO_GIUSTIFICATIVO.VERIFICATO &&
      (pagamentoIdDi(g) == null || pagamentoIdDi(g) === pagamentoId)
  )
  await Promise.all(daCollegare.map(g => giustificativiService.update(g.id, { Pagamento: pagamentoId })))
}

/** Scollega i giustificativi legati a un pagamento (es. proposta annullata). */
async function _scollegaGiustificativi(giustificativi, pagamentoId) {
  const daScollegare = giustificativi.filter(g => pagamentoIdDi(g) === pagamentoId)
  await Promise.all(daScollegare.map(g => giustificativiService.update(g.id, { Pagamento: null })))
}

/** Evento di ricalcolo della macchina Giustificativo per il target contabile. */
function _eventoRicalcolo(nuovo) {
  if (nuovo === STATO_GIUSTIFICATIVO.PAGATO) return EVENTI_GIUSTIFICATIVO.RICALCOLA_PAGATO
  if (nuovo === STATO_GIUSTIFICATIVO.IN_PAGAMENTO) return EVENTI_GIUSTIFICATIVO.RICALCOLA_IN_PAGAMENTO
  return EVENTI_GIUSTIFICATIVO.RICALCOLA_VERIFICATO
}

/**
 * Riallinea (idempotente) gli stati dei giustificativi di un progetto in base ai
 * pagamenti collegati e alla regola del cap:
 * - pagamento `pagato` (o allocato raggiunto) → `pagato`
 * - pagamento `in_pagamento` → `in_pagamento`
 * - altrimenti → `verificato`
 * Nessun effetto sugli stati non contabili (draft/inviato/rifiutato).
 */
export async function sincronizzaStatiPagamentoProgetto(progettoId) {
  const progRes = await progettiService.getById(progettoId)
  const progetto = progRes.data.data
  if (!progetto) return
  const [giustRes, pagRes] = await Promise.all([
    verificaService.getGiustificativiByProgetto(progettoId),
    pagamentiService.getPagamenti({ 'filter[Progetto][_eq]': progettoId, limit: -1 })
  ])
  const giustificativi = giustRes.data.data || []
  const pagMap = new Map((pagRes.data.data || []).map(p => [p.id, p]))
  const allocato = parseNum(progetto.Allocato)
  const capRaggiunto = allocato > 0 && parseNum(progetto.TotalePagato) >= allocato

  const ops = []
  for (const g of giustificativi) {
    if (g.Invalidato || !isContabile(g.Stato)) continue
    const pag = pagMap.get(pagamentoIdDi(g))
    let nuovo
    if (capRaggiunto || pag?.Stato === STATO_PAGAMENTO.PAGATO) nuovo = STATO_GIUSTIFICATIVO.PAGATO
    else if (pag?.Stato === STATO_PAGAMENTO.IN_PAGAMENTO) nuovo = STATO_GIUSTIFICATIVO.IN_PAGAMENTO
    else nuovo = STATO_GIUSTIFICATIVO.VERIFICATO

    if (nuovo === g.Stato) continue
    const extra =
      nuovo === STATO_GIUSTIFICATIVO.PAGATO
        ? g.DataPagamento
          ? {}
          : { DataPagamento: new Date().toISOString() }
        : { DataPagamento: null }
    ops.push(
      transita({
        machine: giustificativoMachine,
        statoCorrente: g.Stato,
        evento: _eventoRicalcolo(nuovo),
        extra,
        scrivi: patch => giustificativiService.update(g.id, patch)
      })
    )
  }
  if (ops.length) await Promise.all(ops)
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
    .filter(g => isContabile(g.Stato) && !g.Invalidato)
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

  const statoProgettoAttuale = statoProgettoEffettivo(progetto.StatoProgetto)
  const statoProgettoCalcolato = calcolaStatoProgetto({
    statoProgetto: statoProgettoAttuale,
    allocato,
    rimborsato: pagato,
    giustificativi
  })

  if (statoProgettoCalcolato !== statoProgettoAttuale) {
    if (statoProgettoCalcolato === STATO_PROGETTO.CHIUSO) {
      await chiudiProgetto(id, { automatica: true })
    } else {
      // Transizione a uno stato operativo (es. rimborso_parziale): nessuna data
      // di chiusura, il progetto resta operativo.
      await transita({
        machine: progettoMachine,
        campo: 'StatoProgetto',
        statoCorrente: statoProgettoAttuale,
        evento: eventoRicalcoloProgetto(statoProgettoCalcolato),
        scrivi: patch => progettiService.updateStats(id, patch)
      })
    }
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
  if (statEffettivo === STATO_PROGETTO.CHIUSO) return

  const giustRes = await verificaService.getGiustificativiByProgetto(progettoId)
  const giustificativi = giustRes.data.data || []
  const totaleVerificato = giustificativi
    .filter(g => isContabile(g.Stato) && !g.Invalidato)
    .reduce((s, g) => s + parseNum(g.Importo), 0)

  const pagamentiRes = await pagamentiService.getPagamenti({
    'filter[Progetto][_eq]': progettoId,
    'filter[_or][0][Stato][_eq]': STATO_PAGAMENTO.IN_PAGAMENTO,
    'filter[_or][1][Stato][_eq]': STATO_PAGAMENTO.PAGATO,
    limit: -1
  })
  const totaleStorico = (pagamentiRes.data.data || []).reduce((s, p) => s + parseNum(p.Importo), 0)

  const allocato = parseNum(progetto.Allocato)
  const erogabile = calcolaErogabile({
    allocato,
    totaleVerificato,
    percentualeRimborso: progetto.MassimaPercentualeErogabile ?? 80
  })
  const nuovoProposto = residuoDaCoprire(erogabile, totaleStorico)

  const esistenteRes = await pagamentiService.getPagamenti({
    'filter[Progetto][_eq]': progettoId,
    'filter[Stato][_eq]': STATO_PAGAMENTO.PROPOSTO,
    limit: 1
  })
  const esistente = (esistenteRes.data.data || [])[0]

  if (nuovoProposto > 0) {
    let pagamentoId = esistente?.id
    if (esistente) {
      await pagamentiService.updatePagamento(esistente.id, { Importo: nuovoProposto })
    } else {
      const created = await creaConStatoIniziale({
        machine: pagamentoMachine,
        extra: {
          Progetto: progettoId,
          Famiglia: progetto.Famiglia,
          Importo: nuovoProposto,
          IBAN: iban || progetto.IBAN || '',
          Intestatario: intestatario || progetto.Intestatario_CC || '',
          DataProposta: new Date().toISOString()
        },
        scrivi: patch => pagamentiService.createPagamento(patch)
      })
      pagamentoId = created.data.data?.id
    }
    if (pagamentoId) await _collegaGiustificativi(giustificativi, pagamentoId)
  } else if (esistente) {
    await transita({
      machine: pagamentoMachine,
      statoCorrente: esistente.Stato,
      evento: EVENTI_PAGAMENTO.ANNULLA_PROPOSTA,
      extra: { NoteEsito: 'Proposta annullata: importo non più dovuto', Batch: null },
      scrivi: patch => pagamentiService.updatePagamento(esistente.id, patch)
    })
    await _scollegaGiustificativi(giustificativi, esistente.id)
  }

  await ricalcolaTotaliProgetto(progettoId)
}

/**
 * Ricalcola la proposta di UN progetto (crea/aggiorna/annulla il `proposto`) e
 * collega/scollega i giustificativi coperti. Esegue le scritture direttamente.
 */
async function _ricalcolaPropostaProgetto(row, giustificativi, pagamenti) {
  const totaleVerificato = giustificativi
    .filter(g => isContabile(g.Stato) && !g.Invalidato)
    .reduce((s, g) => s + parseNum(g.Importo), 0)
  const totaleStorico = pagamenti
    .filter(p => p.Stato === STATO_PAGAMENTO.IN_PAGAMENTO || p.Stato === STATO_PAGAMENTO.PAGATO)
    .reduce((s, p) => s + parseNum(p.Importo), 0)

  const erogabile = calcolaErogabile({
    allocato: row.allocato,
    totaleVerificato,
    percentualeRimborso: row.percentualeRimborso ?? 80
  })
  const nuovoProposto = residuoDaCoprire(erogabile, totaleStorico)
  const esistente = pagamenti.find(p => p.Stato === STATO_PAGAMENTO.PROPOSTO)

  if (nuovoProposto > 0) {
    let pagamentoId = esistente?.id
    if (esistente) {
      if (parseNum(esistente.Importo) !== nuovoProposto) {
        await pagamentiService.updatePagamento(esistente.id, { Importo: nuovoProposto })
      }
    } else {
      const created = await creaConStatoIniziale({
        machine: pagamentoMachine,
        extra: {
          Progetto: row.idProgetto,
          Famiglia: row.idFamiglia,
          Importo: nuovoProposto,
          IBAN: row.iban || '',
          Intestatario: row.intestatario || '',
          DataProposta: new Date().toISOString()
        },
        scrivi: patch => pagamentiService.createPagamento(patch)
      })
      pagamentoId = created.data.data?.id
    }
    if (pagamentoId) await _collegaGiustificativi(giustificativi, pagamentoId)
  } else if (esistente) {
    await transita({
      machine: pagamentoMachine,
      statoCorrente: esistente.Stato,
      evento: EVENTI_PAGAMENTO.ANNULLA_PROPOSTA,
      extra: { NoteEsito: 'Proposta annullata: importo non più dovuto', Batch: null },
      scrivi: patch => pagamentiService.updatePagamento(esistente.id, patch)
    })
    await _scollegaGiustificativi(giustificativi, esistente.id)
  }
}

/**
 * Ricalcola in blocco le proposte di pagamento per i progetti operativi forniti
 * (righe Verifica). Esegue le scritture necessarie in un'unica tornata.
 */
export async function ricalcolaPropostiDaProgetti(progetti) {
  if (!progetti?.length) return
  const aperti = progetti.filter(
    r =>
      r.statoProgetto != null &&
      STATI_PROGETTO_OPERATIVI.includes(r.statoProgetto === 'aperto' ? 'accettato' : r.statoProgetto)
  )
  if (!aperti.length) return
  const ids = aperti.map(r => r.idProgetto)

  const [giustRes, pagRes] = await Promise.all([
    verificaService.getGiustificativiByProgetti(ids),
    pagamentiService.getPagamenti({ 'filter[Progetto][_in]': ids.join(','), limit: -1 })
  ])

  const giustByProgetto = {}
  for (const g of giustRes.data.data || []) {
    const pid = typeof g.Progetto === 'object' ? g.Progetto?.id_progetto : g.Progetto
    if (!pid) continue
    ;(giustByProgetto[pid] ||= []).push(g)
  }
  const pagByProgetto = {}
  for (const p of pagRes.data.data || []) {
    const pid = typeof p.Progetto === 'object' ? p.Progetto?.id_progetto : p.Progetto
    if (!pid) continue
    ;(pagByProgetto[pid] ||= []).push(p)
  }

  // Le scritture per progetto sono best-effort: un progetto in errore non deve
  // invalidare le altre. Poi si aggiornano i derivati (totali + stato).
  await Promise.allSettled(
    aperti.map(row =>
      _ricalcolaPropostaProgetto(row, giustByProgetto[row.idProgetto] || [], pagByProgetto[row.idProgetto] || [])
    )
  )
  await Promise.allSettled(aperti.map(r => ricalcolaTotaliProgetto(r.idProgetto)))
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

/**
 * Passa i pagamenti selezionati a `in_pagamento` dentro un batch e riallinea gli
 * stati dei giustificativi collegati (→ `in_pagamento`).
 */
export async function segnaInPagamento({ pagamentoIds, batchId }) {
  if (!pagamentoIds?.length) return []
  const res = await pagamentiService.getPagamenti({
    'filter[id][_in]': pagamentoIds.join(','),
    fields: 'id,Progetto,Stato',
    limit: -1
  })
  const pagamenti = res.data.data || []
  await Promise.all(
    pagamenti.map(p =>
      transita({
        machine: pagamentoMachine,
        statoCorrente: p.Stato,
        evento: EVENTI_PAGAMENTO.IN_PAGAMENTO,
        extra: { Batch: batchId },
        scrivi: patch => pagamentiService.updatePagamento(p.id, patch)
      })
    )
  )
  const progetti = [
    ...new Set(
      pagamenti.map(p => (typeof p.Progetto === 'object' ? p.Progetto?.id_progetto : p.Progetto)).filter(Boolean)
    )
  ]
  for (const pid of progetti) {
    await ricalcolaTotaliProgetto(pid)
    await sincronizzaStatiPagamentoProgetto(pid)
  }
  return pagamenti
}

export async function segnaPagato(pagamentoId) {
  const pagamento = await getPagamentoById(pagamentoId)
  if (!pagamento) throw new Error('Pagamento non trovato')
  await transita({
    machine: pagamentoMachine,
    statoCorrente: pagamento.Stato,
    evento: EVENTI_PAGAMENTO.PAGA,
    extra: { DataPagamento: new Date().toISOString() },
    scrivi: patch => pagamentiService.updatePagamento(pagamentoId, patch)
  })
  await ricalcolaTotaliProgetto(pagamento.Progetto)
  await sincronizzaStatiPagamentoProgetto(pagamento.Progetto)
  await inviaNotificaPagamento(pagamento)
  return pagamento
}

export async function segnaFallito(pagamentoId, note) {
  const pagamento = await getPagamentoById(pagamentoId)
  if (!pagamento) throw new Error('Pagamento non trovato')
  await transita({
    machine: pagamentoMachine,
    statoCorrente: pagamento.Stato,
    evento: EVENTI_PAGAMENTO.FALLISCI,
    extra: { NoteEsito: note },
    scrivi: patch => pagamentiService.updatePagamento(pagamentoId, patch)
  })
  await ricalcolaTotaliProgetto(pagamento.Progetto)
  await sincronizzaStatiPagamentoProgetto(pagamento.Progetto)
  return pagamento
}

export async function segnaAnnullato(pagamentoId) {
  const pagamento = await getPagamentoById(pagamentoId)
  if (!pagamento) throw new Error('Pagamento non trovato')
  const batchId = pagamento.Batch
  const giustRes = await verificaService.getGiustificativiByProgetto(pagamento.Progetto)
  await _scollegaGiustificativi(giustRes.data.data || [], pagamentoId)
  await transita({
    machine: pagamentoMachine,
    statoCorrente: pagamento.Stato,
    evento: EVENTI_PAGAMENTO.ANNULLA,
    extra: { Batch: null, NoteEsito: 'Rimosso dal gruppo' },
    scrivi: patch => pagamentiService.updatePagamento(pagamentoId, patch)
  })
  await ricalcolaTotaliProgetto(pagamento.Progetto)
  await sincronizzaStatiPagamentoProgetto(pagamento.Progetto)
  await ricalcolaProposta(pagamento.Progetto, {
    iban: pagamento.IBAN,
    intestatario: pagamento.Intestatario
  })
  return { pagamento, batchId }
}

export async function ripristinaProposto(pagamentoId) {
  const pagamento = await getPagamentoById(pagamentoId)
  if (!pagamento) throw new Error('Pagamento non trovato')
  await transita({
    machine: pagamentoMachine,
    statoCorrente: pagamento.Stato,
    evento: EVENTI_PAGAMENTO.RIPRISTINA_PROPOSTO,
    extra: { Batch: null },
    scrivi: patch => pagamentiService.updatePagamento(pagamentoId, patch)
  })
  await ricalcolaTotaliProgetto(pagamento.Progetto)
  await sincronizzaStatiPagamentoProgetto(pagamento.Progetto)
  return pagamento
}

export async function ripristinaInPagamento(pagamentoId) {
  const pagamento = await getPagamentoById(pagamentoId)
  if (!pagamento) throw new Error('Pagamento non trovato')
  await transita({
    machine: pagamentoMachine,
    statoCorrente: pagamento.Stato,
    evento: EVENTI_PAGAMENTO.RIPRISTINA_IN_PAGAMENTO,
    extra: { NoteEsito: null },
    scrivi: patch => pagamentiService.updatePagamento(pagamentoId, patch)
  })
  if (pagamento.Progetto) await sincronizzaStatiPagamentoProgetto(pagamento.Progetto)
}

export async function correggiDati(pagamentoId, { iban, intestatario }) {
  const pagamento = await getPagamentoById(pagamentoId)
  if (!pagamento || pagamento.Stato !== STATO_PAGAMENTO.FALLITO) {
    throw new Error('Solo pagamenti falliti sono modificabili')
  }
  await pagamentiService.updatePagamento(pagamentoId, { IBAN: iban, Intestatario: intestatario })
  await famiglieService.update(pagamento.Famiglia, { IBAN: iban, Intestatario_CC: intestatario })
}

export async function chiudiProgetto(progettoId, { automatica = false, motivo = null } = {}) {
  const progRes = await progettiService.getById(progettoId)
  const statoCorrente = statoProgettoEffettivo(progRes.data.data?.StatoProgetto)
  await transita({
    machine: progettoMachine,
    campo: 'StatoProgetto',
    statoCorrente,
    evento: automatica ? EVENTI_PROGETTO.RICALCOLA_CHIUSO : EVENTI_PROGETTO.CHIUDI,
    extra: {
      DataChiusura: new Date().toISOString(),
      MotivoChiusura: automatica ? 'Importo allocato interamente pagato' : motivo
    },
    scrivi: patch => progettiService.updateStats(progettoId, patch)
  })
}

export async function riapriProgetto(progettoId) {
  const progRes = await progettiService.getById(progettoId)
  const statoCorrente = statoProgettoEffettivo(progRes.data.data?.StatoProgetto)
  await transita({
    machine: progettoMachine,
    campo: 'StatoProgetto',
    statoCorrente,
    evento: EVENTI_PROGETTO.RIAPRI,
    extra: { DataChiusura: null, MotivoChiusura: null },
    scrivi: patch => progettiService.updateStats(progettoId, patch)
  })
}
