import ExcelJS from 'exceljs'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  buildListaBatchWorkbook,
  nomeListaBatch,
  rigeneraListaBatch,
  rigeneraListeSelezionate,
  valutaListe
} from 'src/usecases/listePagamenti'

const mockGetPagamenti = vi.fn()
const mockGetBatch = vi.fn()
const mockGetBatches = vi.fn()
const mockGetAll = vi.fn()
const mockCreate = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockDeleteFile = vi.fn()
const mockUploadExcel = vi.fn()

vi.mock('src/services/pagamenti.service', () => ({
  pagamentiService: {
    getPagamenti: (...a) => mockGetPagamenti(...a),
    getBatch: (...a) => mockGetBatch(...a),
    getBatches: (...a) => mockGetBatches(...a)
  }
}))

vi.mock('src/services/liste-pagamenti.service', () => ({
  listePagamentiService: {
    getAll: (...a) => mockGetAll(...a),
    create: (...a) => mockCreate(...a),
    update: (...a) => mockUpdate(...a),
    delete: (...a) => mockDelete(...a),
    deleteFile: (...a) => mockDeleteFile(...a),
    uploadExcel: (...a) => mockUploadExcel(...a)
  }
}))

function pagamentoBatch(over = {}) {
  return {
    id: 'p-1',
    Stato: 'in_pagamento',
    Importo: '100',
    IBAN: 'IT00X',
    Intestatario: '',
    Famiglia: { id_famiglia: 'f1', Nome_Famiglia: 'Fam 1', Intestatario_CC: 'Mario Rossi' },
    ...over
  }
}

describe('listePagamenti usecase', () => {
  beforeEach(() => vi.clearAllMocks())

  it('nomeListaBatch applica il suffisso (batch)', () => {
    expect(nomeListaBatch('Tranche Luglio')).toBe('Tranche Luglio (batch)')
  })

  it('buildListaBatchWorkbook genera un xlsx con intestazione e tutte le colonne/righe', async () => {
    const pagamenti = [
      pagamentoBatch(),
      pagamentoBatch({
        id: 'p-2',
        Importo: '250.5',
        IBAN: 'IT01Y',
        Intestatario: 'Luigi Verdi',
        Famiglia: { id_famiglia: 'f2', Nome_Famiglia: 'Fam 2', Intestatario_CC: 'Ignorato' }
      })
    ]
    const { buffer } = await buildListaBatchWorkbook(pagamenti)

    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.getWorksheet('Pagamenti')
    expect(sheet).toBeTruthy()

    expect([1, 2, 3, 4].map(i => sheet.getRow(1).getCell(i).value)).toEqual([
      'Famiglia',
      'Importo',
      'IBAN',
      'Intestatario'
    ])
    expect(sheet.rowCount).toBe(3)

    const row1 = sheet.getRow(2)
    expect(row1.getCell(1).value).toBe('Fam 1')
    expect(row1.getCell(2).value).toBe(100)
    expect(row1.getCell(3).value).toBe('IT00X')
    expect(row1.getCell(4).value).toBe('Mario Rossi')
    expect(String(row1.getCell(2).numFmt)).toContain('€')

    const row2 = sheet.getRow(3)
    expect(row2.getCell(1).value).toBe('Fam 2')
    expect(row2.getCell(2).value).toBe(250.5)
    expect(row2.getCell(3).value).toBe('IT01Y')
    expect(row2.getCell(4).value).toBe('Luigi Verdi')
  })

  it('rigeneraListaBatch crea la lista quando non esiste', async () => {
    mockGetPagamenti.mockResolvedValue({ data: { data: [pagamentoBatch()] } })
    mockGetAll.mockResolvedValue([])
    mockUploadExcel.mockResolvedValue('file-new')
    mockCreate.mockResolvedValue({ id: 'l-1' })

    const res = await rigeneraListaBatch('b-1', { batchNome: 'Batch 1', liste: [] })

    expect(res.azione).toBe('creata')
    expect(res.listaId).toBe('l-1')
    expect(mockUploadExcel).toHaveBeenCalledTimes(1)
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ Nome: 'Batch 1 (batch)', File: 'file-new', ConteggioRighe: 1, Totale: 100 })
    )
  })

  it('rigeneraListaBatch aggiorna la lista esistente e rimuove il vecchio file', async () => {
    mockGetPagamenti.mockResolvedValue({ data: { data: [pagamentoBatch()] } })
    mockUploadExcel.mockResolvedValue('file-new')
    mockUpdate.mockResolvedValue({})

    const liste = [{ id: 'l-1', Nome: 'Batch 1 (batch)', File: 'file-old' }]
    const res = await rigeneraListaBatch('b-1', { batchNome: 'Batch 1', liste })

    expect(res.azione).toBe('aggiornata')
    expect(mockUpdate).toHaveBeenCalledWith('l-1', { File: 'file-new', Totale: 100, ConteggioRighe: 1 })
    expect(mockDeleteFile).toHaveBeenCalledWith('file-old')
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('rigeneraListaBatch elimina la lista quando il batch non ha pagamenti', async () => {
    mockGetPagamenti.mockResolvedValue({ data: { data: [] } })
    mockDelete.mockResolvedValue({})
    mockDeleteFile.mockResolvedValue({})

    const liste = [{ id: 'l-1', Nome: 'Batch 1 (batch)', File: 'file-old' }]
    const res = await rigeneraListaBatch('b-1', { batchNome: 'Batch 1', liste })

    expect(res.azione).toBe('eliminata')
    expect(mockDeleteFile).toHaveBeenCalledWith('file-old')
    expect(mockDelete).toHaveBeenCalledWith('l-1')
  })

  it('rigeneraListaBatch segnala vuota se non c e lista né pagamenti', async () => {
    mockGetPagamenti.mockResolvedValue({ data: { data: [] } })
    const res = await rigeneraListaBatch('b-1', { batchNome: 'Batch 1', liste: [] })
    expect(res.azione).toBe('vuota')
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('rigeneraListaBatch recupera il nome batch se non fornito', async () => {
    mockGetPagamenti.mockResolvedValue({ data: { data: [pagamentoBatch()] } })
    mockGetBatch.mockResolvedValue({ data: { data: { id: 'b-1', Nome: 'Batch X' } } })
    mockGetAll.mockResolvedValue([])
    mockUploadExcel.mockResolvedValue('file-new')
    mockCreate.mockResolvedValue({ id: 'l-1' })

    await rigeneraListaBatch('b-1')
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ Nome: 'Batch X (batch)' }))
  })

  it('valutaListe rileva mancanti (solo batch con pagamenti), orfane e duplicati', async () => {
    mockGetBatches.mockResolvedValue({
      data: {
        data: [
          { id: 'b-1', Nome: 'A' },
          { id: 'b-2', Nome: 'A' },
          { id: 'b-3', Nome: 'B' },
          { id: 'b-4', Nome: 'C' }
        ]
      }
    })
    mockGetAll.mockResolvedValue([
      { id: 'l-1', Nome: 'A (batch)' },
      { id: 'l-2', Nome: 'Z (batch)' }
    ])
    mockGetPagamenti.mockResolvedValue({
      data: {
        data: [
          { id: 'p1', Batch: 'b-3' },
          { id: 'p2', Batch: 'b-3' }
        ]
      }
    })

    const res = await valutaListe()
    expect(res.batches).toBe(4)
    expect(res.liste).toHaveLength(2)
    expect(res.mancanti).toEqual([{ id: 'b-3', Nome: 'B', pagamenti: 2 }])
    expect(res.orfane).toEqual([{ id: 'l-2', Nome: 'Z (batch)' }])
    expect(res.duplicati).toEqual(['A'])
  })

  it('rigeneraListeSelezionate rigenera solo le liste indicate', async () => {
    mockGetBatches.mockResolvedValue({ data: { data: [{ id: 'b-1', Nome: 'Batch 1' }] } })
    mockGetPagamenti.mockResolvedValue({ data: { data: [pagamentoBatch()] } })
    mockUploadExcel.mockResolvedValue('file-new')
    mockUpdate.mockResolvedValue({})

    const selected = [{ id: 'l-1', Nome: 'Batch 1 (batch)', File: 'file-old' }]
    const summary = await rigeneraListeSelezionate(selected)

    expect(summary.aggiornate).toBe(1)
    expect(mockUpdate).toHaveBeenCalledWith('l-1', { File: 'file-new', Totale: 100, ConteggioRighe: 1 })
  })

  it('rigeneraListeSelezionate segnala il batch non trovato', async () => {
    mockGetBatches.mockResolvedValue({ data: { data: [] } })
    const summary = await rigeneraListeSelezionate([{ id: 'l-9', Nome: 'Sconosciuta (batch)' }])
    expect(summary.aggiornate).toBe(0)
    expect(summary.errori).toHaveLength(1)
    expect(summary.errori[0].message).toContain('Batch non trovato')
  })

  it('rigeneraListeSelezionate isola gli errori per lista', async () => {
    mockGetBatches.mockResolvedValue({
      data: {
        data: [
          { id: 'b-1', Nome: 'A' },
          { id: 'b-2', Nome: 'B' }
        ]
      }
    })
    mockGetPagamenti
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ data: { data: [pagamentoBatch()] } })
    mockUploadExcel.mockResolvedValue('file-new')
    mockUpdate.mockResolvedValue({})

    const summary = await rigeneraListeSelezionate([
      { id: 'l-1', Nome: 'A (batch)', File: 'f-a' },
      { id: 'l-2', Nome: 'B (batch)', File: 'f-b' }
    ])

    expect(summary.aggiornate).toBe(1)
    expect(summary.errori).toHaveLength(1)
    expect(summary.errori[0].message).toBe('boom')
  })
})
