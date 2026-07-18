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

  it('ricalcolaProposta creates missing proposal', async () => {
    mockGetProgettoById.mockResolvedValue({
      data: {
        data: {
          id_progetto: 1,
          Allocato: '1000',
          Famiglia: 'fam-1',
          IBAN: '',
          Intestatario_CC: '',
          StatoProgetto: 'aperto'
        }
      }
    })
    mockGetGiustificativiByProgetto.mockResolvedValue({
      data: { data: [{ id: 'g-1', Stato: 'verificato', Importo: '800' }] }
    })
    mockGetPagamenti
      .mockResolvedValueOnce({ data: { data: [{ Importo: '200', Stato: 'in_pagamento' }] } })
      .mockResolvedValueOnce({ data: { data: [] } })
    mockGetProgettoById.mockResolvedValue({
      data: { data: { id_progetto: 1, Allocato: '1000', StatoProgetto: 'aperto' } }
    })
    mockGetGiustificativiByProgetto.mockResolvedValue({ data: { data: [{ Stato: 'verificato', Importo: '800' }] } })
    mockGetPagamenti.mockResolvedValue({ data: { data: [] } })
    mockUpdateProgettoStats.mockResolvedValue({})
    mockCreatePagamento.mockResolvedValue({ data: { data: {} } })
    mockGetPagamenti.mockResolvedValue({ data: { data: [] } })
    const store = usePagamentiStore()
    await store.ricalcolaProposta(1)
    expect(mockCreatePagamento).toHaveBeenCalled()
  })

  it('creaBatch creates batch for proposals', async () => {
    mockGetPagamenti.mockResolvedValue({
      data: { data: [{ id: 'p-1', Stato: 'proposto', Progetto: 1, Importo: '100' }] }
    })
    mockCreateBatch.mockResolvedValue({ data: { data: { id: 'b-1' } } })
    mockUpdatePagamento.mockResolvedValue({})
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
  })

  it('creaBatch uses user_id and recalculates each selected payment', async () => {
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
    mockGetListe.mockResolvedValue([])
    const store = usePagamentiStore()
    store.budgetMap = { A: 1000 }
    const totalsSpy = vi.spyOn(store, 'ricalcolaTotaliProgetto').mockResolvedValue()
    const initSpy = vi.spyOn(store, 'init').mockResolvedValue()

    const batchId = await store.creaBatch({ nome: 'Batch 2', associazione: 'A', pagamentoIds: ['p-1', 'p-2'] })

    expect(batchId).toBe('batch-2')
    expect(mockCreateBatch).toHaveBeenCalledWith(expect.objectContaining({ CreatoDA: 'user-42' }))
    expect(mockUpdatePagamento).toHaveBeenNthCalledWith(1, 'p-1', { Stato: 'in_pagamento', Batch: 'batch-2' })
    expect(mockUpdatePagamento).toHaveBeenNthCalledWith(2, 'p-2', { Stato: 'in_pagamento', Batch: 'batch-2' })
    expect(totalsSpy).toHaveBeenCalledWith(10)
    expect(totalsSpy).toHaveBeenCalledWith(11)
    expect(initSpy).toHaveBeenCalled()
  })

  it('segnaPagato marks as paid', async () => {
    mockGetPagamenti
      .mockResolvedValueOnce({
        data: { data: [{ id: 'p-1', Stato: 'in_pagamento', Progetto: 1, Famiglia: 'fam-1', Importo: 100 }] }
      })
      .mockResolvedValue({ data: { data: [] } })
    mockUpdatePagamento.mockResolvedValue({})
    mockGetProgettoById.mockResolvedValue({
      data: { data: { id_progetto: 1, Allocato: '1000', StatoProgetto: 'aperto' } }
    })
    mockGetGiustificativiByProgetto.mockResolvedValue({ data: { data: [] } })
    mockUpdateProgettoStats.mockResolvedValue({})
    mockGetFamigliaVolontari.mockResolvedValue({ data: { data: [] } })
    mockGetFamigliaGenitori.mockResolvedValue({ data: { data: [] } })
    mockGetAssociazioni.mockResolvedValue({ data: { data: [] } })
    mockGetBatches.mockResolvedValue({ data: { data: [] } })
    const store = usePagamentiStore()
    await store.segnaPagato('p-1')
    expect(mockUpdatePagamento).toHaveBeenCalled()
    expect(store.loading).toBe(false)
  })

  it('segnaPagato rejects invalid states and stores update errors', async () => {
    mockGetPagamenti.mockResolvedValueOnce({ data: { data: [{ id: 'p-x', Stato: 'fallito', Progetto: 1 }] } })
    const store = usePagamentiStore()
    await expect(store.segnaPagato('p-x')).rejects.toThrow('Solo pagamenti in_pagamento possono essere segnati come pagati')
    expect(store.error).toBe('Solo pagamenti in_pagamento possono essere segnati come pagati')

    mockGetPagamenti.mockResolvedValueOnce({ data: { data: [{ id: 'p-y', Stato: 'in_pagamento', Progetto: 1 }] } })
    mockUpdatePagamento.mockRejectedValueOnce(new Error('update pay fail'))
    await expect(store.segnaPagato('p-y')).rejects.toThrow('update pay fail')
    expect(store.error).toBe('update pay fail')
  })

  it('segnaFallito marks as failed', async () => {
    mockGetPagamenti
      .mockResolvedValueOnce({ data: { data: [{ id: 'p-1', Stato: 'in_pagamento', Progetto: 1 }] } })
      .mockResolvedValue({ data: { data: [] } })
    mockUpdatePagamento.mockResolvedValue({})
    mockGetProgettoById.mockResolvedValue({
      data: { data: { id_progetto: 1, Allocato: '1000', StatoProgetto: 'aperto' } }
    })
    mockGetGiustificativiByProgetto.mockResolvedValue({ data: { data: [] } })
    mockUpdateProgettoStats.mockResolvedValue({})
    mockGetAssociazioni.mockResolvedValue({ data: { data: [] } })
    mockGetBatches.mockResolvedValue({ data: { data: [] } })
    const store = usePagamentiStore()
    await store.segnaFallito('p-1', 'IBAN errato')
    expect(mockUpdatePagamento).toHaveBeenCalledWith('p-1', expect.objectContaining({ Stato: 'fallito' }))
  })

  it('segnaFallito rejects invalid states', async () => {
    mockGetPagamenti.mockResolvedValueOnce({ data: { data: [{ id: 'p-1', Stato: 'pagato', Progetto: 1 }] } })
    const store = usePagamentiStore()
    await expect(store.segnaFallito('p-1', 'bad')).rejects.toThrow('Solo pagamenti in_pagamento possono essere segnati come falliti')
    expect(store.error).toBe('Solo pagamenti in_pagamento possono essere segnati come falliti')
  })

  it('correggiDati fixes failed payment', async () => {
    mockGetPagamenti.mockResolvedValue({
      data: { data: [{ id: 'p-1', Stato: 'fallito', Famiglia: 'fam-1', Progetto: 1, Importo: 100 }] }
    })
    mockUpdatePagamento.mockResolvedValue({})
    mockGetAssociazioni.mockResolvedValue({ data: { data: [] } })
    const store = usePagamentiStore()
    vi.doMock('src/services/famiglie.service', () => ({
      famiglieService: { update: vi.fn().mockResolvedValue({}) }
    }))
    await store.correggiDati('p-1', { iban: 'IT00X', intestatario: 'Mario' })
    expect(mockUpdatePagamento).toHaveBeenCalled()
    expect(store.loading).toBe(false)
  })

  it('correggiDati rejects non-failed payments and stores service errors', async () => {
    mockGetPagamenti.mockResolvedValueOnce({
      data: { data: [{ id: 'p-2', Stato: 'pagato', Famiglia: 'fam-1', Progetto: 1 }] }
    })
    const store = usePagamentiStore()
    await store.correggiDati('p-2', { iban: 'IT00X', intestatario: 'Mario' })
    expect(store.error).toBe('Solo pagamenti falliti sono modificabili')

    mockGetPagamenti.mockResolvedValueOnce({
      data: { data: [{ id: 'p-3', Stato: 'fallito', Famiglia: 'fam-1', Progetto: 1 }] }
    })
    mockUpdatePagamento.mockRejectedValueOnce(new Error('patch fail'))
    await store.correggiDati('p-3', { iban: 'IT00Y', intestatario: 'Luigi' })
    expect(store.error).toBe('patch fail')
  })

  it('chiudiProgetto sets closed state', async () => {
    mockUpdateProgettoStats.mockResolvedValue({})
    const store = usePagamentiStore()
    await store.chiudiProgetto(1, { automatica: true })
    expect(mockUpdateProgettoStats).toHaveBeenCalledWith(1, expect.objectContaining({ StatoProgetto: 'chiuso' }))
  })

  it('inviaNotificaPagamento sends email to volontario', async () => {
    mockGetProgettoById.mockResolvedValue({ data: { data: { id_progetto: 1 } } })
    mockGetFamigliaVolontari.mockResolvedValue({
      data: { data: [{ Contatto: { user_id: 'u-1', email: [{ email_address: 'v@r.it' }] } }] }
    })
    mockGetFamigliaById.mockResolvedValue({ data: { data: { Nome_Famiglia: 'Fam Test' } } })
    mockSendEmail.mockResolvedValue({})
    mockUpdatePagamento.mockResolvedValue({})
    const store = usePagamentiStore()
    await store.inviaNotificaPagamento({ id: 'p-1', Famiglia: 'fam-1', Importo: 100, NotificaInviata: false })
    expect(mockSendEmail).toHaveBeenCalled()
    expect(mockUpdatePagamento).toHaveBeenCalledWith('p-1', { NotificaInviata: true })
  })

  it('inviaNotificaPagamento skips if already sent', async () => {
    const store = usePagamentiStore()
    await store.inviaNotificaPagamento({ NotificaInviata: true })
    expect(mockGetProgettoById).not.toHaveBeenCalled()
  })

  it('inviaNotificaPagamento logs errors when email delivery fails', async () => {
    mockGetProgettoById.mockResolvedValueOnce({ data: { data: { id_progetto: 1 } } })
    mockGetFamigliaVolontari.mockResolvedValueOnce({
      data: { data: [{ Contatto: { user_id: 'u-1', email: [{ email_address: 'v@r.it' }] } }] }
    })
    mockGetFamigliaById.mockResolvedValueOnce({ data: { data: { Nome_Famiglia: 'Fam Test' } } })
    mockSendEmail.mockRejectedValueOnce(new Error('smtp down'))
    const store = usePagamentiStore()

    await store.inviaNotificaPagamento({
      id: 'p-err',
      Progetto: 1,
      Famiglia: 'fam-1',
      Importo: 100,
      NotificaInviata: false
    })
    expect(store.error).toBeTruthy()
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

  it('segnaAnnullato updates in_pagamento payments and refreshes derived data', async () => {
    mockGetPagamenti.mockResolvedValueOnce({
      data: { data: [{ id: 'p-1', Stato: 'in_pagamento', Progetto: 7 }] }
    })
    mockUpdatePagamento.mockResolvedValue({})
    const store = usePagamentiStore()
    const totalsSpy = vi.spyOn(store, 'ricalcolaTotaliProgetto').mockResolvedValue()
    const propostaSpy = vi.spyOn(store, 'ricalcolaProposta').mockResolvedValue()
    const initSpy = vi.spyOn(store, 'init').mockResolvedValue()

    await store.segnaAnnullato('p-1')

    expect(mockUpdatePagamento).toHaveBeenCalledWith('p-1', {
      Stato: 'annullato',
      Batch: null,
      NoteEsito: 'Rimosso dal gruppo'
    })
    expect(totalsSpy).toHaveBeenCalledWith(7)
    expect(propostaSpy).toHaveBeenCalledWith(7, { iban: undefined, intestatario: undefined })
    expect(initSpy).toHaveBeenCalled()
  })

  it('segnaAnnullato accepts fallito and rejects invalid states', async () => {
    mockGetPagamenti.mockResolvedValueOnce({
      data: { data: [{ id: 'p-2', Stato: 'fallito', Progetto: 9 }] }
    })
    mockUpdatePagamento.mockResolvedValue({})
    const store = usePagamentiStore()
    vi.spyOn(store, 'ricalcolaTotaliProgetto').mockResolvedValue()
    vi.spyOn(store, 'ricalcolaProposta').mockResolvedValue()
    vi.spyOn(store, 'init').mockResolvedValue()

    await store.segnaAnnullato('p-2')
    expect(mockUpdatePagamento).toHaveBeenCalledWith('p-2', {
      Stato: 'annullato',
      Batch: null,
      NoteEsito: 'Rimosso dal gruppo'
    })
    expect(store.error).toBeFalsy()

    mockGetPagamenti.mockResolvedValueOnce({
      data: { data: [{ id: 'p-3', Stato: 'pagato', Progetto: 9 }] }
    })
    await expect(store.segnaAnnullato('p-3')).rejects.toThrow('Solo pagamenti in_pagamento o falliti possono essere rimossi dal gruppo')
    expect(store.error).toBe('Solo pagamenti in_pagamento o falliti possono essere rimossi dal gruppo')
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

  it('ricalcolaProposta deletes existing proposal when no amount remains', async () => {
    mockGetProgettoById.mockResolvedValue({
      data: {
        data: {
          id_progetto: 12,
          Allocato: '1000',
          Famiglia: 'fam-1',
          StatoProgetto: 'aperto'
        }
      }
    })
    mockGetGiustificativiByProgetto.mockResolvedValue({
      data: { data: [{ id: 'g-1', Stato: 'verificato', Importo: '100' }] }
    })
    mockGetPagamenti
      .mockResolvedValueOnce({ data: { data: [{ id: 'paid-1', Stato: 'pagato', Importo: '200' }] } })
      .mockResolvedValueOnce({ data: { data: [{ id: 'prop-1', Stato: 'proposto', Importo: '50' }] } })
    mockDeletePagamento.mockResolvedValue({})
    const store = usePagamentiStore()
    const totalsSpy = vi.spyOn(store, 'ricalcolaTotaliProgetto').mockResolvedValue()
    const propostiSpy = vi.spyOn(store, 'fetchProposti').mockResolvedValue()

    await store.ricalcolaProposta(12)

    expect(mockDeletePagamento).toHaveBeenCalledWith('prop-1')
    expect(totalsSpy).toHaveBeenCalledWith(12)
    expect(propostiSpy).toHaveBeenCalled()
  })

  it('ricalcolaTotaliProgetto updates stats and auto-closes fully paid projects', async () => {
    mockGetProgettoById.mockResolvedValue({
      data: { data: { id_progetto: 21, Allocato: '100', StatoProgetto: 'aperto' } }
    })
    mockGetGiustificativiByProgetto.mockResolvedValue({
      data: { data: [{ Stato: 'verificato', Importo: '100' }] }
    })
    mockGetPagamenti.mockResolvedValue({
      data: {
        data: [
          { id: 'prop-1', Stato: 'proposto', Importo: '0' },
          { id: 'paid-1', Stato: 'pagato', Importo: '100' }
        ]
      }
    })
    mockUpdateProgettoStats.mockResolvedValue({})
    const store = usePagamentiStore()
    const closeSpy = vi.spyOn(store, 'chiudiProgetto').mockResolvedValue()

    await store.ricalcolaTotaliProgetto(21)

    expect(mockUpdateProgettoStats).toHaveBeenCalledWith(21, {
      TotaleVerificato: 100,
      TotaleProposto: 0,
      TotaleInPagamento: 0,
      TotalePagato: 100,
      ResiduoAllocato: 0
    })
    expect(closeSpy).toHaveBeenCalledWith(21, { automatica: true })
  })

  it('ricalcolaTotaliProgetto returns early without project and stores fetch errors', async () => {
    mockGetProgettoById.mockResolvedValueOnce({ data: { data: null } })
    const store = usePagamentiStore()
    await store.ricalcolaTotaliProgetto(99)
    expect(mockUpdateProgettoStats).not.toHaveBeenCalled()

    mockGetProgettoById.mockRejectedValueOnce(new Error('totali fail'))
    await expect(store.ricalcolaTotaliProgetto(100)).rejects.toThrow('totali fail')
    expect(store.error).toBe('totali fail')
  })

  it('inviaNotificaPagamento falls back to a genitore and skips when nobody is reachable', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const store = usePagamentiStore()

    mockGetProgettoById.mockResolvedValue({ data: { data: { id_progetto: 1 } } })
    mockGetFamigliaVolontari.mockResolvedValueOnce({ data: { data: [{ Contatto: { email: [] } }] } })
    mockGetFamigliaGenitori.mockResolvedValueOnce({
      data: {
        data: [{ Contatto: { email: [{ email_address: 'gen@test.it', Primary: true }] } }]
      }
    })
    mockGetFamigliaById.mockResolvedValueOnce({ data: { data: { Nome_Famiglia: 'Famiglia Uno' } } })
    mockSendEmail.mockResolvedValueOnce({})
    mockUpdatePagamento.mockResolvedValueOnce({})

    await store.inviaNotificaPagamento({
      id: 'p-1',
      Progetto: 1,
      Famiglia: 'fam-1',
      Importo: 100,
      NotificaInviata: false
    })
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'gen@test.it', subject: 'Pagamento effettuato' })
    )

    mockGetProgettoById.mockResolvedValueOnce({ data: { data: { id_progetto: 1 } } })
    mockGetFamigliaVolontari.mockResolvedValueOnce({ data: { data: [] } })
    mockGetFamigliaGenitori.mockResolvedValueOnce({ data: { data: [] } })

    await store.inviaNotificaPagamento({
      id: 'p-2',
      Progetto: 1,
      Famiglia: 'fam-2',
      Importo: 50,
      NotificaInviata: false
    })
    expect(warnSpy).toHaveBeenCalled()
    warnSpy.mockRestore()
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

  it('chiudiProgetto handles error', async () => {
    mockUpdateProgettoStats.mockRejectedValue(new Error('fail'))
    const store = usePagamentiStore()
    await expect(store.chiudiProgetto(1, { automatica: false })).rejects.toThrow('fail')
    expect(store.error).toBe('fail')
  })
})
