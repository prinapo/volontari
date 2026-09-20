import { describe, it, expect, vi, beforeEach } from 'vitest'
import { usePagamentiStore } from 'src/stores/pagamenti.store'

const mockGetPagamenti = vi.fn()
const mockCreatePagamento = vi.fn()
const mockUpdatePagamento = vi.fn()
const mockDeletePagamento = vi.fn()
const mockGetBatches = vi.fn()
const mockCreateBatch = vi.fn()
const mockGetAssociazioni = vi.fn()
const mockGetProgettoById = vi.fn()
const mockUpdateProgettoStats = vi.fn()
const mockGetGiustificativiByProgetto = vi.fn()
const mockGetFamigliaVolontari = vi.fn()
const mockGetFamigliaGenitori = vi.fn()
const mockGetFamigliaById = vi.fn()
const mockUpdateFamiglia = vi.fn()
const mockSendEmail = vi.fn()
const mockGetListe = vi.fn()
const mockCreateLista = vi.fn()
const mockUploadCsv = vi.fn()
const mockDeleteLista = vi.fn()
const mockDeleteFile = vi.fn()
const mockVerificaStore = { filteredRows: [] }

vi.mock('src/services/pagamenti.service', () => ({
  pagamentiService: {
    getPagamenti: (...a) => mockGetPagamenti(...a),
    createPagamento: (...a) => mockCreatePagamento(...a),
    updatePagamento: (...a) => mockUpdatePagamento(...a),
    deletePagamento: (...a) => mockDeletePagamento(...a),
    getBatches: (...a) => mockGetBatches(...a),
    createBatch: (...a) => mockCreateBatch(...a)
  }
}))

vi.mock('src/services/associazioni.service', () => ({
  associazioniService: {
    getAll: (...a) => mockGetAssociazioni(...a)
  }
}))

vi.mock('src/services/progetti.service', () => ({
  progettiService: {
    getById: (...a) => mockGetProgettoById(...a),
    updateStats: (...a) => mockUpdateProgettoStats(...a)
  }
}))

vi.mock('src/services/verifica.service', () => ({
  verificaService: {
    getGiustificativiByProgetto: (...a) => mockGetGiustificativiByProgetto(...a)
  }
}))

vi.mock('src/services/famiglie.service', () => ({
  famiglieService: {
    getVolontariByFamiglia: (...a) => mockGetFamigliaVolontari(...a),
    getGenitoriByFamiglia: (...a) => mockGetFamigliaGenitori(...a),
    getById: (...a) => mockGetFamigliaById(...a),
    update: (...a) => mockUpdateFamiglia(...a)
  }
}))

vi.mock('src/services/admin.service', () => ({
  adminService: {
    sendEmail: (...a) => mockSendEmail(...a)
  }
}))

vi.mock('src/services/liste-pagamenti.service', () => ({
  listePagamentiService: {
    getAll: (...a) => mockGetListe(...a),
    create: (...a) => mockCreateLista(...a),
    uploadCsv: (...a) => mockUploadCsv(...a),
    delete: (...a) => mockDeleteLista(...a),
    deleteFile: (...a) => mockDeleteFile(...a)
  }
}))

const mockSegnaPagato = vi.fn()
const mockSegnaFallito = vi.fn()
const mockSegnaAnnullato = vi.fn()
const mockSegnaInPagamento = vi.fn()
const mockRicalcolaProposta = vi.fn()
const mockRicalcolaTotaliProgetto = vi.fn()
const mockRipristinaProposto = vi.fn()
const mockRipristinaInPagamento = vi.fn()
const mockCorreggiDati = vi.fn()
const mockChiudiProgetto = vi.fn()
const mockRiapriProgetto = vi.fn()

vi.mock('src/usecases/pagamenti', () => ({
  segnaPagato: (...a) => mockSegnaPagato(...a),
  segnaFallito: (...a) => mockSegnaFallito(...a),
  segnaAnnullato: (...a) => mockSegnaAnnullato(...a),
  segnaInPagamento: (...a) => mockSegnaInPagamento(...a),
  ricalcolaProposta: (...a) => mockRicalcolaProposta(...a),
  ricalcolaTotaliProgetto: (...a) => mockRicalcolaTotaliProgetto(...a),
  ripristinaProposto: (...a) => mockRipristinaProposto(...a),
  ripristinaInPagamento: (...a) => mockRipristinaInPagamento(...a),
  correggiDati: (...a) => mockCorreggiDati(...a),
  chiudiProgetto: (...a) => mockChiudiProgetto(...a),
  riapriProgetto: (...a) => mockRiapriProgetto(...a)
}))

vi.mock('stores/verifica.store', () => ({
  useVerificaStore: () => mockVerificaStore
}))

describe('pagamenti store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockVerificaStore.filteredRows = []
    localStorage.clear()
  })

  it('has initial state', () => {
    const store = usePagamentiStore()
    expect(store.proposti).toEqual([])
    expect(store.inCorso).toEqual([])
    expect(store.falliti).toEqual([])
    expect(store.batches).toEqual([])
    expect(store.loading).toBe(false)
  })

  it('init fetches all data', async () => {
    mockGetAssociazioni.mockResolvedValue({ data: { data: [{ Nome: 'A', Budget: '1000' }] } })
    mockGetPagamenti.mockResolvedValue({ data: { data: [] } })
    mockGetBatches.mockResolvedValue({ data: { data: [] } })
    const store = usePagamentiStore()
    await store.init()
    expect(mockGetAssociazioni).toHaveBeenCalled()
    expect(store.associazioni).toHaveLength(1)
    expect(store.budgetMap.A).toBe(1000)
  })

  it('fetchProposti loads proposed payments', async () => {
    mockGetPagamenti.mockResolvedValue({ data: { data: [{ id: 1, Importo: 100, Batch: null }] } })
    const store = usePagamentiStore()
    await store.fetchProposti()
    expect(store.proposti).toHaveLength(1)
  })

  it('fetchInCorso loads in-progress payments', async () => {
    mockGetPagamenti.mockResolvedValue({ data: { data: [{ id: 2, Stato: 'in_pagamento' }] } })
    const store = usePagamentiStore()
    await store.fetchInCorso()
    expect(store.inCorso).toHaveLength(1)
  })

  it('fetchInCorso builds combined _and filter with search and batchFilter', async () => {
    mockGetPagamenti.mockResolvedValue({ data: { data: [{ id: 2, Stato: 'in_pagamento', Batch: { id: 'b-1' } }] } })
    const store = usePagamentiStore()
    await store.fetchInCorso('rossi', 'b-1')
    expect(mockGetPagamenti).toHaveBeenCalledWith({
      fields:
        '*,Batch.id,Batch.Nome,Batch.Associazione,Progetto.id_progetto,Famiglia.id_famiglia,Famiglia.Nome_Famiglia,Famiglia.IBAN,Famiglia.Intestatario_CC',
      limit: -1,
      sort: 'DataProposta',
      'filter[_and][0][Stato][_in]': 'in_pagamento,pagato',
      'filter[_and][1][Batch][_eq]': 'b-1',
      'filter[_and][2][_or][0][Famiglia][Nome_Famiglia][_icontains]': 'rossi',
      'filter[_and][2][_or][1][IBAN][_icontains]': 'rossi',
      'filter[_and][2][_or][2][Intestatario][_icontains]': 'rossi',
      'filter[_and][2][_or][3][Batch][Nome][_icontains]': 'rossi'
    })
    expect(store.inCorso).toHaveLength(1)
  })

  it('fetchInCorso uses only batchFilter when no search', async () => {
    mockGetPagamenti.mockResolvedValue({ data: { data: [{ id: 2, Stato: 'in_pagamento' }] } })
    const store = usePagamentiStore()
    await store.fetchInCorso(undefined, 'b-1')
    expect(mockGetPagamenti).toHaveBeenCalledWith(
      expect.objectContaining({
        'filter[_and][0][Stato][_in]': 'in_pagamento,pagato',
        'filter[_and][1][Batch][_eq]': 'b-1'
      })
    )
  })

  it('fetchInCorso uses only search when no batchFilter', async () => {
    mockGetPagamenti.mockResolvedValue({ data: { data: [{ id: 2, Stato: 'in_pagamento' }] } })
    const store = usePagamentiStore()
    await store.fetchInCorso('rossi')
    expect(mockGetPagamenti).toHaveBeenCalledWith(
      expect.objectContaining({
        'filter[_and][0][Stato][_in]': 'in_pagamento,pagato',
        'filter[_and][1][_or][0][Famiglia][Nome_Famiglia][_icontains]': 'rossi'
      })
    )
  })

  it('fetchFalliti loads failed payments', async () => {
    mockGetPagamenti.mockResolvedValue({ data: { data: [{ id: 3 }] } })
    const store = usePagamentiStore()
    await store.fetchFalliti()
    expect(store.falliti).toHaveLength(1)
  })

  it('fetchBatches loads batches', async () => {
    mockGetBatches.mockResolvedValue({ data: { data: [{ id: 'b-1', Nome: 'Batch 1', Associazione: 'A' }] } })
    const store = usePagamentiStore()
    await store.fetchBatches()
    expect(store.batches).toHaveLength(1)
  })

  it('residuoAssociazione getter calculates remaining', () => {
    const store = usePagamentiStore()
    store.budgetMap = { A: 1000 }
    store.inCorso = [{ Importo: '200', Batch: 'b-1' }]
    store.proposti = [{ Importo: '100', Batch: 'b-1' }]
    store.batches = [{ id: 'b-1', Associazione: 'A' }]
    expect(store.residuoAssociazione('A')).toBe(700)
  })

  it('ricalcolaProposta delega allo use case e aggiorna proposti/annullati', async () => {
    mockRicalcolaProposta.mockResolvedValue()
    mockGetPagamenti.mockResolvedValue({ data: { data: [] } })
    const store = usePagamentiStore()
    await store.ricalcolaProposta(1)
    expect(mockRicalcolaProposta).toHaveBeenCalledWith(1, {})
    expect(mockGetPagamenti).toHaveBeenCalled()
  })

  it('creaBatch creates batch for proposals', async () => {
    mockGetPagamenti.mockResolvedValueOnce({
      data: { data: [{ id: 'p-1', Stato: 'proposto', Progetto: 1, Importo: '100' }] }
    })
    mockCreateBatch.mockResolvedValue({ data: { data: { id: 'b-1' } } })
    mockUpdatePagamento.mockResolvedValue({})
    mockSegnaInPagamento.mockResolvedValue([])
    mockGetAssociazioni.mockResolvedValue({ data: { data: [{ Nome: 'A', Budget: '1000' }] } })
    mockGetPagamenti.mockResolvedValue({ data: { data: [] } })
    mockGetBatches.mockResolvedValue({ data: { data: [] } })
    mockGetListe.mockResolvedValue([])
    const store = usePagamentiStore()
    store.budgetMap = { A: 1000 }
    store.batches = []
    store.inCorso = []
    store.proposti = []
    await store.creaBatch({ nome: 'B1', associazione: 'A', pagamentoIds: ['p-1'] })
    expect(mockCreateBatch).toHaveBeenCalled()
    expect(mockSegnaInPagamento).toHaveBeenCalledWith({ pagamentoIds: ['p-1'], batchId: 'b-1' })
  })

  it('creaBatch uses user_id and passa i pagamenti a segnaInPagamento', async () => {
    localStorage.setItem('user_id', 'user-42')
    mockGetPagamenti.mockResolvedValueOnce({
      data: {
        data: [
          { id: 'p-1', Stato: 'proposto', Progetto: 10, Importo: '100' },
          { id: 'p-2', Stato: 'proposto', Progetto: 11, Importo: '50' }
        ]
      }
    })
    mockCreateBatch.mockResolvedValueOnce({ data: { data: { id: 'batch-2' } } })
    mockUpdatePagamento.mockResolvedValue({})
    mockSegnaInPagamento.mockResolvedValue([])
    mockGetListe.mockResolvedValue([])
    const store = usePagamentiStore()
    store.budgetMap = { A: 1000 }
    const initSpy = vi.spyOn(store, 'init').mockResolvedValue()

    const batchId = await store.creaBatch({ nome: 'Batch 2', associazione: 'A', pagamentoIds: ['p-1', 'p-2'] })

    expect(batchId).toBe('batch-2')
    expect(mockCreateBatch).toHaveBeenCalledWith(expect.objectContaining({ CreatoDA: 'user-42' }))
    expect(mockSegnaInPagamento).toHaveBeenCalledWith({ pagamentoIds: ['p-1', 'p-2'], batchId: 'batch-2' })
    expect(initSpy).toHaveBeenCalled()
  })

  it('segnaPagato delega allo use case e aggiorna', async () => {
    mockSegnaPagato.mockResolvedValue({})
    mockGetAssociazioni.mockResolvedValue({ data: { data: [] } })
    mockGetPagamenti.mockResolvedValue({ data: { data: [] } })
    mockGetBatches.mockResolvedValue({ data: { data: [] } })
    mockGetListe.mockResolvedValue([])
    const store = usePagamentiStore()
    await store.segnaPagato('p-1')
    expect(mockSegnaPagato).toHaveBeenCalledWith('p-1')
    expect(store.loading).toBe(false)
  })

  it('segnaPagato propaga gli errori dello use case', async () => {
    mockSegnaPagato.mockRejectedValueOnce(new Error('Solo pagamenti in_pagamento possono essere segnati come pagati'))
    const store = usePagamentiStore()
    await expect(store.segnaPagato('p-x')).rejects.toThrow(
      'Solo pagamenti in_pagamento possono essere segnati come pagati'
    )
    expect(store.error).toBe('Solo pagamenti in_pagamento possono essere segnati come pagati')

    mockSegnaPagato.mockRejectedValueOnce(new Error('update pay fail'))
    await expect(store.segnaPagato('p-y')).rejects.toThrow('update pay fail')
    expect(store.error).toBe('update pay fail')
  })

  it('segnaFallito delega e aggiorna la lista batch', async () => {
    mockSegnaFallito.mockResolvedValue({ Batch: null })
    mockGetAssociazioni.mockResolvedValue({ data: { data: [] } })
    mockGetPagamenti.mockResolvedValue({ data: { data: [] } })
    mockGetBatches.mockResolvedValue({ data: { data: [] } })
    mockGetListe.mockResolvedValue([])
    const store = usePagamentiStore()
    await store.segnaFallito('p-1', 'IBAN errato')
    expect(mockSegnaFallito).toHaveBeenCalledWith('p-1', 'IBAN errato')
  })

  it('segnaFallito propaga gli errori dello use case', async () => {
    mockSegnaFallito.mockRejectedValueOnce(new Error('Solo pagamenti in_pagamento possono essere segnati come falliti'))
    const store = usePagamentiStore()
    await expect(store.segnaFallito('p-1', 'bad')).rejects.toThrow(
      'Solo pagamenti in_pagamento possono essere segnati come falliti'
    )
    expect(store.error).toBe('Solo pagamenti in_pagamento possono essere segnati come falliti')
  })

  it('correggiDati delega e aggiorna i falliti', async () => {
    mockCorreggiDati.mockResolvedValue()
    mockGetPagamenti.mockResolvedValue({ data: { data: [] } })
    const store = usePagamentiStore()
    await store.correggiDati('p-1', { iban: 'IT00X', intestatario: 'Mario' })
    expect(mockCorreggiDati).toHaveBeenCalledWith('p-1', { iban: 'IT00X', intestatario: 'Mario' })
    expect(store.loading).toBe(false)
  })

  it('correggiDati propaga gli errori dello use case', async () => {
    mockCorreggiDati.mockRejectedValueOnce(new Error('Solo pagamenti falliti sono modificabili'))
    const store = usePagamentiStore()
    await store.correggiDati('p-2', { iban: 'IT00X', intestatario: 'Mario' })
    expect(store.error).toBe('Solo pagamenti falliti sono modificabili')

    mockCorreggiDati.mockRejectedValueOnce(new Error('patch fail'))
    await store.correggiDati('p-3', { iban: 'IT00Y', intestatario: 'Luigi' })
    expect(store.error).toBe('patch fail')
  })

  it('chiudiProgetto delega allo use case', async () => {
    mockChiudiProgetto.mockResolvedValue()
    const store = usePagamentiStore()
    await store.chiudiProgetto(1, { automatica: true })
    expect(mockChiudiProgetto).toHaveBeenCalledWith(1, { automatica: true, motivo: null })
  })

  it('fetchAssociazioni handles error silently', async () => {
    mockGetAssociazioni.mockRejectedValue(new Error('fail'))
    const store = usePagamentiStore()
    await store.fetchAssociazioni()
    expect(store.associazioni).toEqual([])
  })

  it('fetchProposti handles error silently', async () => {
    mockGetPagamenti.mockRejectedValue(new Error('fail'))
    const store = usePagamentiStore()
    await store.fetchProposti()
    expect(store.proposti).toEqual([])
  })

  it('fetchInCorso handles error silently', async () => {
    mockGetPagamenti.mockRejectedValue(new Error('fail'))
    const store = usePagamentiStore()
    await store.fetchInCorso()
    expect(store.inCorso).toEqual([])
  })

  it('fetchFalliti handles error silently', async () => {
    mockGetPagamenti.mockRejectedValue(new Error('fail'))
    const store = usePagamentiStore()
    await store.fetchFalliti()
    expect(store.falliti).toEqual([])
  })

  it('fetchBatches handles error silently', async () => {
    mockGetBatches.mockRejectedValue(new Error('fail'))
    const store = usePagamentiStore()
    await store.fetchBatches()
    expect(store.batches).toEqual([])
  })

  it('creaBatch rejects non-proposed payments and insufficient budget', async () => {
    const store = usePagamentiStore()
    store.budgetMap = { A: 50 }

    mockGetPagamenti.mockResolvedValueOnce({
      data: { data: [{ id: 'p-1', Stato: 'pagato', Progetto: 1, Importo: '10' }] }
    })
    await expect(store.creaBatch({ nome: 'B1', associazione: 'A', pagamentoIds: ['p-1'] })).rejects.toThrow(
      'Solo pagamenti in stato proposto possono essere inclusi in un batch'
    )

    mockGetPagamenti.mockResolvedValueOnce({
      data: { data: [{ id: 'p-2', Stato: 'proposto', Progetto: 1, Importo: '100' }] }
    })
    await expect(store.creaBatch({ nome: 'B2', associazione: 'A', pagamentoIds: ['p-2'] })).rejects.toThrow(
      'Capienza insufficiente per A. Disponibile: €50.00, richiesto: €100.00'
    )
  })

  it('fetchListe loads data and handles service errors', async () => {
    const store = usePagamentiStore()
    mockGetListe.mockResolvedValueOnce([{ id: 'l-1', Nome: 'Lista 1' }])
    await store.fetchListe()
    expect(store.liste).toEqual([{ id: 'l-1', Nome: 'Lista 1' }])

    mockGetListe.mockRejectedValueOnce(new Error('fail'))
    await store.fetchListe()
    expect(store.liste).toEqual([])
  })

  it('eliminaLista deletes optional file and keeps error on failure', async () => {
    mockDeleteFile.mockResolvedValueOnce()
    mockDeleteLista.mockResolvedValueOnce()
    mockGetListe.mockResolvedValueOnce([])
    const store = usePagamentiStore()

    await store.eliminaLista('lista-1', 'file-1')
    expect(mockDeleteFile).toHaveBeenCalledWith('file-1')
    expect(mockDeleteLista).toHaveBeenCalledWith('lista-1')

    mockDeleteLista.mockRejectedValueOnce(new Error('delete fail'))
    await expect(store.eliminaLista('lista-2')).rejects.toThrow('delete fail')
    expect(store.error).toBe('delete fail')
  })

  it('chiudiProgetto propaga gli errori dello use case', async () => {
    mockChiudiProgetto.mockRejectedValue(new Error('fail'))
    const store = usePagamentiStore()
    await expect(store.chiudiProgetto(1, { automatica: false })).rejects.toThrow('fail')
    expect(store.error).toBe('fail')
  })

  it('fetchAnnullati carica i pagamenti annullati', async () => {
    mockGetPagamenti.mockResolvedValue({
      data: { data: [{ id: 1, Stato: 'annullato', NoteEsito: 'Rimosso dal gruppo' }] }
    })
    const store = usePagamentiStore()
    await store.fetchAnnullati()
    expect(store.annullati).toHaveLength(1)
    expect(mockGetPagamenti).toHaveBeenCalledWith(
      expect.objectContaining({
        'filter[Stato][_eq]': 'annullato',
        sort: '-DataProposta',
        limit: -1
      })
    )
  })

  it('fetchAnnullati filtra per motivo e ricerca', async () => {
    mockGetPagamenti.mockResolvedValue({ data: { data: [] } })
    const store = usePagamentiStore()
    await store.fetchAnnullati('rossi', 'Rimosso dal gruppo')
    expect(mockGetPagamenti).toHaveBeenCalledWith(
      expect.objectContaining({
        'filter[_and][0][Stato][_eq]': 'annullato',
        'filter[_and][1][NoteEsito][_eq]': 'Rimosso dal gruppo',
        'filter[_and][2][_or][0][Famiglia][Nome_Famiglia][_icontains]': 'rossi'
      })
    )
  })
})
