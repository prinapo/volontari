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

describe('pagamenti store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
    const store = usePagamentiStore()
    store.budgetMap = { A: 1000 }
    store.batches = []
    store.inCorso = []
    store.proposti = []
    await store.creaBatch({ nome: 'B1', associazione: 'A', pagamentoIds: ['p-1'] })
    expect(mockCreateBatch).toHaveBeenCalled()
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

  it('correggiDati fixes failed payment', async () => {
    mockGetPagamenti.mockResolvedValue({
      data: { data: [{ id: 'p-1', Stato: 'fallito', Famiglia: 'fam-1', Progetto: 1, Importo: 100 }] }
    })
    mockUpdatePagamento.mockResolvedValue({})
    mockGetAssociazioni.mockResolvedValue({ data: { data: [] } })
    const store = usePagamentiStore()
    // need to set up the dynamic import mock
    vi.doMock('src/services/famiglie.service', () => ({
      famiglieService: { update: vi.fn().mockResolvedValue({}) }
    }))
    await store.correggiDati('p-1', { iban: 'IT00X', intestatario: 'Mario' })
    expect(mockUpdatePagamento).toHaveBeenCalled()
    expect(store.loading).toBe(false)
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

  it('chiudiProgetto handles error', async () => {
    mockUpdateProgettoStats.mockRejectedValue(new Error('fail'))
    const store = usePagamentiStore()
    await store.chiudiProgetto(1, { automatica: false })
    expect(store.error).toBe('fail')
  })
})
