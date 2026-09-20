/**
 * Tool di sincronizzazione degli stati di pagamento dei giustificativi.
 *
 * Rilegge tutti i progetti, i loro giustificativi contabili e i pagamenti
 * (`pagato`/`in_pagamento`) e riallinea il campo `Stato` (e `Pagamento`):
 * - allocato raggiunto → tutti i giustificativi contabili `pagato`;
 * - altrimenti allocazione in ordine di creazione (id crescente) fino a
 *   esaurire il coperto (`pagato` + `in_pagamento`): i più vecchi risultano
 *   `pagato`/`in_pagamento`, i nuovi restano `verificato`.
 *
 * Idempotente. Usato dal tab Admin e riusabile dopo un sync prod→dev.
 */
import { giustificativiService } from 'src/services/giustificativi.service'
import { pagamentiService } from 'src/services/pagamenti.service'
import { progettiService } from 'src/services/progetti.service'
import { verificaService } from 'src/services/verifica.service'
import { STATI_GIUSTIFICATIVO_CONTABILI, STATO_GIUSTIFICATIVO, STATO_PAGAMENTO } from 'src/utils/constants'
import { ricalcolaTotaliProgetto } from './pagamenti'

function parseNum(v) {
  return Number.parseFloat(v) || 0
}

function pagamentoIdDi(giustificativo) {
  const p = giustificativo?.Pagamento
  if (p == null) return null
  return typeof p === 'object' ? p.id : p
}

function groupByProgetto(items) {
  const map = {}
  for (const item of items) {
    const pid = typeof item.Progetto === 'object' ? item.Progetto?.id_progetto : item.Progetto
    if (!pid) continue
    ;(map[pid] ||= []).push(item)
  }
  return map
}

function tranchesDi(pagamenti) {
  let acc = 0
  return pagamenti.map(p => {
    acc += parseNum(p.Importo)
    return { p, to: acc }
  })
}

/**
 * Calcola la scrittura per un singolo giustificativo, o null se non cambia nulla.
 */
function voceGiustificativo(g, accErog, ctx) {
  const { capRaggiunto, coperto, tranches, ultimoPagato } = ctx
  let nuovo
  let pagId = null

  if (capRaggiunto) {
    nuovo = STATO_GIUSTIFICATIVO.PAGATO
    pagId = ultimoPagato?.id ?? null
  } else if (accErog <= coperto + 0.01) {
    const t = tranches.find(tr => accErog <= tr.to + 0.01)
    nuovo = t.p.Stato === STATO_PAGAMENTO.PAGATO ? STATO_GIUSTIFICATIVO.PAGATO : STATO_GIUSTIFICATIVO.IN_PAGAMENTO
    pagId = t.p.id
  } else {
    nuovo = STATO_GIUSTIFICATIVO.VERIFICATO
  }

  const cambiaStato = nuovo !== g.Stato
  const cambiaLink = pagamentoIdDi(g) !== pagId
  if (!cambiaStato && !cambiaLink) return null

  const data = { Stato: nuovo }
  if (nuovo === STATO_GIUSTIFICATIVO.PAGATO) {
    if (!g.DataPagamento) data.DataPagamento = new Date().toISOString()
  } else {
    data.DataPagamento = null
  }
  if (cambiaLink) data.Pagamento = pagId
  return { id: g.id, data }
}

function pianoProgetto(progetto, giustificativi, pagamenti) {
  const gs = giustificativi
    .filter(g => !g.Invalidato && STATI_GIUSTIFICATIVO_CONTABILI.includes(g.Stato))
    .sort((a, b) => a.id - b.id)
  if (!gs.length) return []

  const ps = [...pagamenti].sort((a, b) => new Date(a.DataProposta) - new Date(b.DataProposta))
  const allocato = parseNum(progetto.Allocato)
  const pagato = parseNum(progetto.TotalePagato)
  const tranches = tranchesDi(ps)
  const coperto = tranches.length ? tranches.at(-1).to : 0
  const ctx = {
    capRaggiunto: allocato > 0 && pagato >= allocato - 0.01,
    coperto,
    tranches,
    ultimoPagato: ps.findLast(p => p.Stato === STATO_PAGAMENTO.PAGATO),
    pct: progetto.MassimaPercentualeErogabile ?? 80
  }

  const voci = []
  let accErog = 0
  for (const g of gs) {
    accErog += (parseNum(g.Importo) * ctx.pct) / 100
    const voce = voceGiustificativo(g, accErog, ctx)
    if (voce) voci.push({ ...voce, progetto: progetto.id_progetto })
  }
  return voci
}

/**
 * @param {Object} [options]
 * @param {boolean} [options.dryRun=false] - se true non scrive, ritorna il piano
 * @returns {Promise<{totale:number, aggiornati:number, voci:Array}>}
 */
export async function sincronizzaStatiPagamento({ dryRun = false } = {}) {
  const progRes = await progettiService.getList({
    fields: 'id_progetto,Allocato,MassimaPercentualeErogabile,TotalePagato'
  })
  const progetti = progRes.data.data || []
  if (!progetti.length) return { totale: 0, aggiornati: 0, voci: [] }
  const ids = progetti.map(p => p.id_progetto)

  const [giustRes, pagRes] = await Promise.all([
    verificaService.getGiustificativiByProgetti(ids),
    pagamentiService.getPagamenti({
      'filter[Stato][_in]': [STATO_PAGAMENTO.PAGATO, STATO_PAGAMENTO.IN_PAGAMENTO].join(','),
      fields: 'id,Importo,Stato,DataProposta,Progetto',
      limit: -1
    })
  ])

  const giustByProgetto = groupByProgetto(giustRes.data.data || [])
  const pagByProgetto = groupByProgetto(pagRes.data.data || [])

  const piano = progetti.flatMap(progetto =>
    pianoProgetto(progetto, giustByProgetto[progetto.id_progetto] || [], pagByProgetto[progetto.id_progetto] || [])
  )

  if (!dryRun) {
    if (piano.length) {
      await Promise.all(piano.map(v => giustificativiService.update(v.id, v.data)))
    }
    // Riallinea i totali progetto (TotaleVerificato/Proposto/InPagamento/Pagato)
    // per tutti i progetti con pagamenti, anche se gli stati erano già corretti.
    const progettiCoinvolti = [...new Set([...piano.map(v => v.progetto), ...Object.keys(pagByProgetto)])]
    await Promise.allSettled(progettiCoinvolti.map(pid => ricalcolaTotaliProgetto(pid)))
  }

  return { totale: piano.length, aggiornati: dryRun ? 0 : piano.length, voci: piano }
}
