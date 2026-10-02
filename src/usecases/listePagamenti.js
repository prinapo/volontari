import { listePagamentiService } from 'src/services/liste-pagamenti.service'
import { pagamentiService } from 'src/services/pagamenti.service'
import { STATO_PAGAMENTO } from 'src/utils/constants'
import { writeSheet } from 'src/utils/xlsxExport'

/**
 * Rigenerazione idempotente delle liste di pagamento (file Excel) a partire
 * dai Pagamenti `in_pagamento`/`pagato` collegati a un batch.
 *
 * Serve quando il file fisico di una lista manca (es. dopo un sync prod→dev che
 * importa i metadati `directus_files` ma non i binari): l'unico modo per rendere
 * di nuovo scaricabile la lista è ricostruire l'Excel dai dati correnti.
 */

const LISTA_COLUMNS = [
  { key: 'famiglia', header: 'Famiglia', width: 32, type: 'text' },
  { key: 'importo', header: 'Importo', width: 14, type: 'currency' },
  { key: 'iban', header: 'IBAN', width: 34, type: 'text' },
  { key: 'intestatario', header: 'Intestatario', width: 34, type: 'text' }
]

const CAMPI_PAGAMENTI_BATCH =
  'id,Stato,Importo,IBAN,Intestatario,Famiglia.id_famiglia,Famiglia.Nome_Famiglia,Famiglia.Intestatario_CC'

const CONTATORI_AZIONE = {
  aggiornata: 'aggiornate',
  creata: 'create',
  eliminata: 'eliminate',
  vuota: 'vuote'
}

export function nomeListaBatch(batchNome) {
  return `${batchNome} (batch)`
}

function parseNum(v) {
  return Number.parseFloat(v) || 0
}

async function getPagamentiBatch(batchId) {
  const res = await pagamentiService.getPagamenti({
    'filter[Batch][_eq]': batchId,
    'filter[_or][0][Stato][_eq]': STATO_PAGAMENTO.IN_PAGAMENTO,
    'filter[_or][1][Stato][_eq]': STATO_PAGAMENTO.PAGATO,
    fields: CAMPI_PAGAMENTI_BATCH,
    limit: -1
  })
  return res.data.data || []
}

/**
Costruisce il workbook Excel della lista. Espone le righe per i test/summary.
*/
export async function buildListaBatchWorkbook(pagamenti) {
  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  const rows = (pagamenti || []).map(p => ({
    famiglia: p.Famiglia?.Nome_Famiglia || '',
    importo: parseNum(p.Importo),
    iban: p.IBAN || '',
    intestatario: p.Intestatario || p.Famiglia?.Intestatario_CC || ''
  }))
  writeSheet(workbook, 'Pagamenti', LISTA_COLUMNS, rows)
  const buffer = await workbook.xlsx.writeBuffer()
  return { buffer, rows }
}

/**
 * Rigenera (crea/aggiorna/elimina) la lista di UN batch. Idempotente.
 * `liste` permette di riusare un elenco già caricato (bulk).
 */
export async function rigeneraListaBatch(batchId, { batchNome, liste } = {}) {
  const pagamenti = await getPagamentiBatch(batchId)

  let nome = batchNome
  if (!nome) {
    const batchRes = await pagamentiService.getBatch(batchId)
    nome = batchRes.data.data?.Nome
  }
  if (!nome) throw new Error('Batch senza nome: impossibile rigenerare la lista')

  const nomeLista = nomeListaBatch(nome)
  const allListe = liste || (await listePagamentiService.getAll())
  const existing = allListe.find(l => l.Nome === nomeLista)

  if (pagamenti.length === 0) {
    if (!existing) return { azione: 'vuota', nome: nomeLista }
    if (existing.File) await listePagamentiService.deleteFile(existing.File)
    await listePagamentiService.delete(existing.id)
    return { azione: 'eliminata', listaId: existing.id, nome: nomeLista }
  }

  const { buffer } = await buildListaBatchWorkbook(pagamenti)
  const totale = pagamenti.reduce((s, p) => s + parseNum(p.Importo), 0)
  const fileId = await listePagamentiService.uploadExcel(buffer, nome)

  if (existing) {
    await listePagamentiService.update(existing.id, {
      File: fileId,
      Totale: totale,
      ConteggioRighe: pagamenti.length
    })
    if (existing.File && existing.File !== fileId) await listePagamentiService.deleteFile(existing.File)
    return { azione: 'aggiornata', listaId: existing.id, nome: nomeLista, righe: pagamenti.length, totale }
  }

  const created = await listePagamentiService.create({
    Nome: nomeLista,
    File: fileId,
    Totale: totale,
    ConteggioRighe: pagamenti.length,
    DataCreazione: new Date().toISOString()
  })
  return { azione: 'creata', listaId: created?.id, nome: nomeLista, righe: pagamenti.length, totale }
}

/**
Anteprima (sola lettura) dello stato delle liste rispetto ai batch.
*/
export async function valutaListe() {
  const [batchesRes, liste, pagamentiRes] = await Promise.all([
    pagamentiService.getBatches({ fields: 'id,Nome', limit: -1 }),
    listePagamentiService.getAll(),
    pagamentiService.getPagamenti({
      'filter[Stato][_in]': `${STATO_PAGAMENTO.IN_PAGAMENTO},${STATO_PAGAMENTO.PAGATO}`,
      fields: 'id,Batch',
      limit: -1
    })
  ])
  const batches = batchesRes.data.data || []

  const contabiliByBatch = new Map()
  for (const p of pagamentiRes.data.data || []) {
    if (p.Batch == null) continue
    contabiliByBatch.set(p.Batch, (contabiliByBatch.get(p.Batch) || 0) + 1)
  }

  const counts = new Map()
  for (const b of batches) counts.set(b.Nome, (counts.get(b.Nome) || 0) + 1)

  const nomiListe = new Set(liste.map(l => l.Nome))
  const nomiBatch = new Set(batches.map(b => b.Nome))

  // Solo i batch che hanno pagamenti contabili ma nessuna lista sono "mancanti":
  // i batch vuoti (di prova) non generano liste e non devono sporcare la vista.
  const mancanti = batches
    .filter(b => (contabiliByBatch.get(b.id) || 0) > 0 && !nomiListe.has(nomeListaBatch(b.Nome)))
    .map(b => ({ id: b.id, Nome: b.Nome, pagamenti: contabiliByBatch.get(b.id) }))

  return {
    batches: batches.length,
    liste,
    mancanti,
    orfane: liste.filter(l => !nomiBatch.has(l.Nome.replace(/ \(batch\)$/, ''))).map(l => ({ id: l.id, Nome: l.Nome })),
    duplicati: [...counts].filter(([, n]) => n > 1).map(([nome]) => nome)
  }
}

/**
 * Rigenera (crea/aggiorna/elimina) le liste selezionate. Idempotente.
 * Isola gli errori per lista e riporta un riepilogo.
 */
export async function rigeneraListeSelezionate(liste = []) {
  const summary = { aggiornate: 0, create: 0, eliminate: 0, vuote: 0, errori: [], risultati: [] }
  if (!liste.length) return summary

  const batchesRes = await pagamentiService.getBatches({ fields: 'id,Nome', limit: -1 })
  const batches = batchesRes.data.data || []
  const byNomeLista = new Map(batches.map(b => [nomeListaBatch(b.Nome), b]))

  for (const lista of liste) {
    const batch = byNomeLista.get(lista.Nome)
    if (!batch) {
      summary.errori.push({ nome: lista.Nome, message: 'Batch non trovato per questa lista' })
      continue
    }
    try {
      const res = await rigeneraListaBatch(batch.id, { batchNome: batch.Nome, liste })
      summary.risultati.push(res)
      const contatore = CONTATORI_AZIONE[res.azione]
      if (contatore) summary[contatore]++
    } catch (error) {
      summary.errori.push({
        nome: lista.Nome,
        message: error.response?.data?.errors?.[0]?.message || error.message || 'Errore sconosciuto'
      })
    }
  }

  return summary
}
