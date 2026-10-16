import { famiglieService } from 'src/services/famiglie.service'
import { giustificativiService } from 'src/services/giustificativi.service'
import { pagamentiService } from 'src/services/pagamenti.service'
import { progettiService } from 'src/services/progetti.service'
import { verificaService } from 'src/services/verifica.service'
import { EVENTI_GIUSTIFICATIVO, giustificativoMachine } from 'src/state-machines/giustificativo'
import { EVENTI_PAGAMENTO, pagamentoMachine } from 'src/state-machines/pagamento'
import { EVENTI_PROGETTO, eventoRicalcoloProgetto, progettoMachine } from 'src/state-machines/progetto'
import { inviaComunicazione } from 'src/usecases/comunicazioni'
import { creaConStatoIniziale, transita, TransizioneNonValidaError } from 'src/usecases/stato/transita'
import {
  isContabile,
  STATI_PROGETTO_OPERATIVI,
  STATO_GIUSTIFICATIVO,
  STATO_PAGAMENTO,
  STATO_PROGETTO,
  TIPI_CHIUSURA_DEFINITIVI,
  TIPO_CHIUSURA
} from 'src/utils/constants'
import { pickEmail } from 'src/utils/emailPrimarie'
import { calcolaErogabile, residuoDaCoprire } from 'src/utils/erogabile'
import { parseNum } from 'src/utils/number'
import { relId } from 'src/utils/relations'
import { calcolaDerivatiProgetto, calcolaStatoProgetto, statoProgettoEffettivo } from 'src/utils/statoProgetto'

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
      (relId(g.Pagamento) == null || relId(g.Pagamento) === pagamentoId)
  )
  await Promise.all(daCollegare.map(g => giustificativiService.update(g.id, { Pagamento: pagamentoId })))
}

/**
Scollega i giustificativi legati a un pagamento (es. proposta annullata).
*/
async function _scollegaGiustificativi(giustificativi, pagamentoId) {
  const daScollegare = giustificativi.filter(g => relId(g.Pagamento) === pagamentoId)
  await Promise.all(daScollegare.map(g => giustificativiService.update(g.id, { Pagamento: null })))
}

/**
Evento di ricalcolo della macchina Giustificativo per il target contabile.
*/
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
    const pagamentoId = relId(g.Pagamento)
    const pag = pagMap.get(pagamentoId)
    // FK orfana: `Pagamento` punta a un pagamento inesistente → va azzerata.
    const orfano = pagamentoId != null && !pag
    let nuovo
    if (capRaggiunto || pag?.Stato === STATO_PAGAMENTO.PAGATO) nuovo = STATO_GIUSTIFICATIVO.PAGATO
    else if (pag?.Stato === STATO_PAGAMENTO.IN_PAGAMENTO) nuovo = STATO_GIUSTIFICATIVO.IN_PAGAMENTO
    else nuovo = STATO_GIUSTIFICATIVO.VERIFICATO

    if (nuovo === g.Stato) {
      // Stato invariato: al più si azzera la FK orfana (senza passare da transita).
      if (orfano) ops.push(giustificativiService.update(g.id, { Pagamento: null }))
      continue
    }
    const extra = {}
    if (nuovo === STATO_GIUSTIFICATIVO.PAGATO) {
      if (!g.DataPagamento) extra.DataPagamento = new Date().toISOString()
    } else {
      extra.DataPagamento = null
    }
    if (orfano) extra.Pagamento = null
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
 * ResiduoAllocato) e lo StatoProgetto dopo un cambiamento di pagamento, da dati
 * freschi. Usa la computazione unica `calcolaDerivatiProgetto` (stessa via di
 * `syncProgettoAggregati`) con lo scope di scrittura completo (manager).
 * Chiusura automatica quando il derivato differisce dall'attuale.
 */
export async function ricalcolaTotaliProgetto(progettoId) {
  const id = relId(progettoId)
  if (!id) return
  const progRes = await progettiService.getById(id)
  const progetto = progRes.data.data
  if (!progetto) return

  const [giustRes, pagRes] = await Promise.all([
    verificaService.getGiustificativiByProgetto(id),
    pagamentiService.getPagamenti({ 'filter[Progetto][_eq]': id, limit: -1 })
  ])
  const giustificativi = giustRes.data.data || []
  const pagamenti = pagRes.data.data || []
  const derivati = calcolaDerivatiProgetto({ progetto, giustificativi, pagamenti })

  await progettiService.updateStats(id, {
    TotaleVerificato: derivati.TotaleVerificato,
    TotaleProposto: derivati.TotaleProposto,
    TotaleInPagamento: derivati.TotaleInPagamento,
    TotalePagato: derivati.TotalePagato,
    ResiduoAllocato: derivati.ResiduoAllocato
  })

  const statoProgettoAttuale = statoProgettoEffettivo(progetto.StatoProgetto)
  const statoProgettoCalcolato = derivati.statoProgetto

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
 * Dati bancari correnti di una famiglia (snapshot per le proposte).
 */
async function getDatiBancariFamiglia(famigliaId) {
  if (!famigliaId) return { iban: '', intestatario: '' }
  try {
    const res = await famiglieService.getFamiglieBatch([famigliaId])
    const famiglia = res.data.data?.[0]
    return { iban: famiglia?.IBAN || '', intestatario: famiglia?.Intestatario_CC || '' }
  } catch {
    return { iban: '', intestatario: '' }
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

  const bancari = await getDatiBancariFamiglia(progetto.Famiglia)
  const nuovoIban = iban || bancari.iban || progetto.IBAN || ''
  const nuovoIntestatario = intestatario || bancari.intestatario || ''

  if (nuovoProposto > 0) {
    let pagamentoId = esistente?.id
    if (esistente) {
      await pagamentiService.updatePagamento(esistente.id, {
        Importo: nuovoProposto,
        IBAN: nuovoIban,
        Intestatario: nuovoIntestatario
      })
    } else {
      const created = await creaConStatoIniziale({
        machine: pagamentoMachine,
        extra: {
          Progetto: progettoId,
          Famiglia: progetto.Famiglia,
          Importo: nuovoProposto,
          IBAN: nuovoIban,
          Intestatario: nuovoIntestatario,
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
async function _ricalcolaPropostaProgetto(progetto, giustificativi, pagamenti) {
  const totaleVerificato = giustificativi
    .filter(g => isContabile(g.Stato) && !g.Invalidato)
    .reduce((s, g) => s + parseNum(g.Importo), 0)
  const totaleStorico = pagamenti
    .filter(p => p.Stato === STATO_PAGAMENTO.IN_PAGAMENTO || p.Stato === STATO_PAGAMENTO.PAGATO)
    .reduce((s, p) => s + parseNum(p.Importo), 0)

  const iban = progetto.IBAN || ''
  const intestatario = progetto.Intestatario_CC || ''
  const erogabile = calcolaErogabile({
    allocato: progetto.Allocato,
    totaleVerificato,
    percentualeRimborso: progetto.MassimaPercentualeErogabile ?? 80
  })
  const nuovoProposto = residuoDaCoprire(erogabile, totaleStorico)
  const esistente = pagamenti.find(p => p.Stato === STATO_PAGAMENTO.PROPOSTO)

  if (nuovoProposto > 0) {
    let pagamentoId = esistente?.id
    if (esistente) {
      const patch = {}
      if (parseNum(esistente.Importo) !== nuovoProposto) patch.Importo = nuovoProposto
      if ((esistente.IBAN || '') !== iban) patch.IBAN = iban
      if ((esistente.Intestatario || '') !== intestatario) patch.Intestatario = intestatario
      if (Object.keys(patch).length) await pagamentiService.updatePagamento(esistente.id, patch)
    } else {
      const created = await creaConStatoIniziale({
        machine: pagamentoMachine,
        extra: {
          Progetto: progetto.id_progetto,
          Famiglia: relId(progetto.Famiglia),
          Importo: nuovoProposto,
          IBAN: iban,
          Intestatario: intestatario,
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
  if (!progetti?.length) return { ok: 0, failed: [] }
  const aperti = progetti.filter(
    r =>
      r.statoProgetto != null &&
      STATI_PROGETTO_OPERATIVI.includes(r.statoProgetto === 'aperto' ? 'accettato' : r.statoProgetto)
  )
  if (!aperti.length) return { ok: 0, failed: [] }
  const ids = aperti.map(r => r.idProgetto)

  const [progRes, giustRes, pagRes] = await Promise.all([
    progettiService.getByIds(ids),
    verificaService.getGiustificativiByProgetti(ids),
    pagamentiService.getPagamenti({ 'filter[Progetto][_in]': ids.join(','), limit: -1 })
  ])
  // Dati freschi dal DB (non dalle righe UI): evita divergenze col flusso singolo.
  const progettiById = new Map((progRes.data.data || []).map(p => [p.id_progetto, p]))

  const giustByProgetto = {}
  for (const g of giustRes.data.data || []) {
    const pid = relId(g.Progetto)
    if (!pid) continue
    ;(giustByProgetto[pid] ||= []).push(g)
  }
  const pagByProgetto = {}
  for (const p of pagRes.data.data || []) {
    const pid = relId(p.Progetto)
    if (!pid) continue
    ;(pagByProgetto[pid] ||= []).push(p)
  }

  // Le scritture per progetto sono best-effort: un progetto in errore non deve
  // invalidare le altre. Poi si aggiornano i derivati (totali + stato).
  const risultati = await Promise.allSettled(
    aperti.map(r => {
      const progetto = progettiById.get(r.idProgetto)
      if (!progetto) return Promise.reject(new Error(`Progetto ${r.idProgetto} non trovato`))
      return _ricalcolaPropostaProgetto(
        progetto,
        giustByProgetto[r.idProgetto] || [],
        pagByProgetto[r.idProgetto] || []
      )
    })
  )
  await Promise.allSettled(aperti.map(r => ricalcolaTotaliProgetto(r.idProgetto)))

  const failed = risultati.map((res, i) => (res.status === 'rejected' ? aperti[i].idProgetto : null)).filter(Boolean)
  if (failed.length) {
    console.warn(`[usecases] ricalcolaPropostiDaProgetti: ${failed.length} progetti in errore`, failed)
  }
  return { ok: aperti.length - failed.length, failed }
}

/**
 * Side-effect obbligatorio di segnaPagato: invia l'email di notifica al
 * destinatario (volontario, poi genitore) e marca NotificaInviata.
 */
export async function inviaNotificaPagamento(pagamento) {
  if (!pagamento || pagamento.NotificaInviata) return
  // Ri-lettura fresca: riduce la finestra di doppio invio in caso di
  // `segnaPagato` concorrenti (non atomico, ma evita il caso comune).
  const fresco = await getPagamentoById(pagamento.id)
  if (fresco?.NotificaInviata) return
  const progRes = await progettiService.getById(pagamento.Progetto)
  const progetto = progRes.data.data
  if (!progetto) return

  const volontariRes = await famiglieService.getVolontariByFamiglia(pagamento.Famiglia)
  const volontari = volontariRes.data.data || []
  const mainVolontario = volontari.find(v => v.Contatto?.user_id)
  let destinatario = mainVolontario ? pickEmail(mainVolontario.Contatto?.email) : null

  if (!destinatario) {
    const genitoriRes = await famiglieService.getGenitoriByFamiglia(pagamento.Famiglia)
    const genitori = genitoriRes.data.data || []
    const mainGenitore = genitori.find(g => g.Contatto?.email?.length > 0)
    destinatario = mainGenitore ? pickEmail(mainGenitore.Contatto?.email) : null
  }

  if (!destinatario) {
    console.warn(`[Pagamento] Nessun destinatario per famiglia ${pagamento.Famiglia}`)
    return
  }

  const famigliaRes = await famiglieService.getById(pagamento.Famiglia)
  const nomeFamiglia = famigliaRes.data.data?.Nome_Famiglia || 'Famiglia'

  // Best-effort: un errore email non deve far fallire segnaPagato (lo stato è
  // già transitato). L'invio passa dal mailer interno (estensione communications).
  try {
    const esito = await inviaComunicazione({
      audience: 'email',
      email: destinatario,
      subject: 'Pagamento effettuato',
      body: `Gentile volontario, il pagamento di €${parseNum(pagamento.Importo).toFixed(2)} per la famiglia "${nomeFamiglia}" è stato effettuato con successo.`,
      tipo: 'pagamento'
    })
    if (esito?.inviati > 0) {
      await pagamentiService.updatePagamento(pagamento.id, { NotificaInviata: true })
    } else {
      console.warn(`[Pagamento] Notifica non inviata a ${destinatario}`)
    }
  } catch (error) {
    console.warn(`[Pagamento] Invio notifica fallito: ${error.message}`)
  }
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
  const progetti = [...new Set(pagamenti.map(p => relId(p.Progetto)).filter(Boolean))]
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

  // Prima si valida e si scrive la transizione; solo dopo si scollegano i
  // giustificativi. Così una transizione invalida non lascia FK orfane.
  await transita({
    machine: pagamentoMachine,
    statoCorrente: pagamento.Stato,
    evento: EVENTI_PAGAMENTO.ANNULLA,
    extra: { Batch: null, NoteEsito: 'Rimosso dal gruppo' },
    scrivi: patch => pagamentiService.updatePagamento(pagamentoId, patch)
  })

  const giustRes = await verificaService.getGiustificativiByProgetto(pagamento.Progetto)
  await _scollegaGiustificativi(giustRes.data.data || [], pagamentoId)

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

export async function correggiDati(pagamentoId, { iban, intestatario }) {
  const pagamento = await getPagamentoById(pagamentoId)
  if (!pagamento || pagamento.Stato !== STATO_PAGAMENTO.FALLITO) {
    throw new Error('Solo pagamenti falliti sono modificabili')
  }
  await pagamentiService.updatePagamento(pagamentoId, { IBAN: iban, Intestatario: intestatario })
  await famiglieService.update(pagamento.Famiglia, { IBAN: iban, Intestatario_CC: intestatario })
}

/**
 * Alla chiusura del progetto la proposta pendente non è più dovuta: va
 * annullata e i giustificativi collegati scollegati (evita una proposta aperta
 * e pagabile su un progetto chiuso).
 */
async function _annullaPropostaPendente(progettoId) {
  const res = await pagamentiService.getPagamenti({
    'filter[Progetto][_eq]': progettoId,
    'filter[Stato][_eq]': STATO_PAGAMENTO.PROPOSTO,
    limit: 1
  })
  const proposto = (res.data.data || [])[0]
  if (!proposto) return
  const giustRes = await verificaService.getGiustificativiByProgetto(progettoId)
  await transita({
    machine: pagamentoMachine,
    statoCorrente: proposto.Stato,
    evento: EVENTI_PAGAMENTO.ANNULLA_PROPOSTA,
    extra: { NoteEsito: 'Proposta annullata: progetto chiuso', Batch: null },
    scrivi: patch => pagamentiService.updatePagamento(proposto.id, patch)
  })
  await _scollegaGiustificativi(giustRes.data.data || [], proposto.id)
}

export async function chiudiProgetto(progettoId, { automatica = false, motivo = null, tipo = null } = {}) {
  const progRes = await progettiService.getById(progettoId)
  const statoCorrente = statoProgettoEffettivo(progRes.data.data?.StatoProgetto)
  await transita({
    machine: progettoMachine,
    campo: 'StatoProgetto',
    statoCorrente,
    evento: automatica ? EVENTI_PROGETTO.RICALCOLA_CHIUSO : EVENTI_PROGETTO.CHIUDI,
    extra: {
      DataChiusura: new Date().toISOString(),
      MotivoChiusura: automatica ? 'Importo allocato interamente pagato' : motivo,
      TipoChiusura: automatica ? TIPO_CHIUSURA.CAP_RAGGIUNTO : tipo || TIPO_CHIUSURA.ALTRO
    },
    scrivi: patch => progettiService.updateStats(progettoId, patch)
  })
  await _annullaPropostaPendente(progettoId)
}

export async function riapriProgetto(progettoId, { conferma = false } = {}) {
  const progRes = await progettiService.getById(progettoId)
  const progetto = progRes.data.data
  if (!progetto) throw new Error('Progetto non trovato')
  const statoCorrente = statoProgettoEffettivo(progetto.StatoProgetto)
  if (statoCorrente !== STATO_PROGETTO.CHIUSO) {
    throw new TransizioneNonValidaError(statoCorrente, 'RIAPRI', 'progetto non chiuso')
  }

  const [giustRes, pagRes] = await Promise.all([
    verificaService.getGiustificativiByProgetto(progettoId),
    pagamentiService.getPagamenti({ 'filter[Progetto][_eq]': progettoId, limit: -1 })
  ])
  const giustificativi = giustRes.data.data || []
  const pagamenti = pagRes.data.data || []
  const derivati = calcolaDerivatiProgetto({ progetto, giustificativi, pagamenti })
  const allocato = parseNum(progetto.Allocato)

  // Guardie dure: un progetto "chiuso per errore" è riaperturabile solo se ha
  // un allocato valido e un residuo ancora da erogare.
  if (allocato <= 0) {
    throw new Error('Allocato non valido: correggi il progetto prima di riaprire')
  }
  if (derivati.TotalePagato >= allocato) {
    throw new Error('Residuo zero: il progetto è interamente pagato e non è riapribile')
  }

  // Motivi "definitivi" (rinuncia/irraggiungibile/fine anno): riapertura solo
  // con conferma esplicita.
  const tipoChiusura = progetto.TipoChiusura || null
  if (TIPI_CHIUSURA_DEFINITIVI.includes(tipoChiusura) && !conferma) {
    throw new Error(`Chiusura definitiva (${tipoChiusura}): serve conferma esplicita per riaprire`)
  }

  // Target derivato da giustificativi e pagamenti (mai un fisso `accettato`).
  const targetRiapertura = calcolaStatoProgetto({
    statoProgetto: STATO_PROGETTO.ACCETTATO,
    allocato,
    rimborsato: derivati.TotalePagato,
    giustificativi
  })

  await transita({
    machine: progettoMachine,
    campo: 'StatoProgetto',
    statoCorrente,
    evento: EVENTI_PROGETTO.RIAPRI,
    ctx: { targetRiapertura },
    extra: { DataChiusura: null, MotivoChiusura: null, TipoChiusura: null },
    scrivi: patch => progettiService.updateStats(progettoId, patch)
  })
}
