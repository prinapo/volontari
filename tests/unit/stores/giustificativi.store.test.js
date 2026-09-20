import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useGiustificativiStore } from 'src/stores/giustificativi.store'

const mockGetByProgetto = vi.fn()
const mockFindByProject = vi.fn()
const mockCreateRendicontazione = vi.fn()
const mockCreaGiustificativo = vi.fn()
const mockInviaGiustificativo = vi.fn()
const mockAggiornaGiustificativo = vi.fn()
const mockAggiornaCampoGiustificativo = vi.fn()
const mockInvalidaGiustificativo = vi.fn()

vi.mock('src/services/giustificativi.service', () => ({
  giustificativiService: {
    getByProgetto: (...a) => mockGetByProgetto(...a),
    findByProject: (...a) => mockFindByProject(...a),
    createRendicontazione: (...a) => mockCreateRendicontazione(...a)
  }
}))

vi.mock('src/usecases/giustificativi', () => ({
  creaGiustificativo: (...a) => mockCreaGiustificativo(...a),
  inviaGiustificativo: (...a) => mockInviaGiustificativo(...a),
  aggiornaGiustificativo: (...a) => mockAggiornaGiustificativo(...a),
  aggiornaCampoGiustificativo: (...a) => mockAggiornaCampoGiustificativo(...a),
  invalidaGiustificativo: (...a) => mockInvalidaGiustificativo(...a)
}))

describe('giustificativi store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('has initial state', () => {
    const store = useGiustificativiStore()
    expect(store.data).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.saving).toBe(false)
    expect(store.editingItem).toBeNull()
    expect(store.error).toBeNull()
  })

  it('fetchByProgetto loads data', async () => {
    mockGetByProgetto.mockResolvedValue({ data: { data: [{ id: 1, Stato: 'draft' }] } })
    const store = useGiustificativiStore()
    await store.fetchByProgetto(10)
    expect(mockGetByProgetto).toHaveBeenCalledWith(10)
    expect(store.data).toHaveLength(1)
    expect(store.loading).toBe(false)
  })

  it('fetchByProgetto handles error', async () => {
    mockGetByProgetto.mockRejectedValue({ response: { data: { errors: [{ message: 'Err' }] } } })
    const store = useGiustificativiStore()
    await store.fetchByProgetto(10)
    expect(store.error).toBe('Err')
  })

  it('createGiustificativo delega allo use case con origine volontario', async () => {
    mockCreaGiustificativo.mockResolvedValue({ id: 'g-1' })
    const store = useGiustificativiStore()
    await store.createGiustificativo(
      { Progetto: 1, Famiglia: 'fam-1', Descrizione: 'test', Importo: 10 },
      new File([], 'x')
    )
    expect(mockCreaGiustificativo).toHaveBeenCalledWith(
      expect.objectContaining({ Progetto: 1, Famiglia: 'fam-1', file: expect.any(File) }),
      { origine: 'volontario' }
    )
    expect(store.saving).toBe(false)
    expect(store.error).toBeNull()
  })

  it('createGiustificativo mappa gli errori senza chiamare servizi', async () => {
    mockCreaGiustificativo.mockRejectedValueOnce({ response: { data: { errors: [{ message: 'create fail' }] } } })
    const store = useGiustificativiStore()
    await expect(
      store.createGiustificativo({ Progetto: 1, Famiglia: 'fam-1', Descrizione: 'test', Importo: 10 })
    ).rejects.toThrow()
    expect(mockFindByProject).not.toHaveBeenCalled()
    expect(mockCreateRendicontazione).not.toHaveBeenCalled()
    expect(store.error).toBe('create fail')
  })

  it('submitGiustificativo invia e aggiorna localmente', async () => {
    mockInviaGiustificativo.mockResolvedValue({ id: 1, Stato: 'inviato' })
    const store = useGiustificativiStore()
    store.data = [{ id: 1, Stato: 'draft', Progetto: 5 }]
    await store.submitGiustificativo(1)
    expect(mockInviaGiustificativo).toHaveBeenCalledWith({ id: 1, progettoId: 5, statoCorrente: 'draft' })
    expect(store.data[0].Stato).toBe('inviato')
    expect(store.saving).toBe(false)
    expect(store.error).toBeNull()
  })

  it('submitGiustificativo gestisce payload mancante ed errori', async () => {
    mockInviaGiustificativo.mockResolvedValueOnce(null)
    const store = useGiustificativiStore()
    store.data = [{ id: 1, Stato: 'draft', Progetto: 5 }]
    await store.submitGiustificativo(1)
    expect(store.data[0].Stato).toBe('draft')
    expect(store.error).toBeNull()

    mockInviaGiustificativo.mockRejectedValueOnce({ response: { data: { errors: [{ message: 'submit fail' }] } } })
    await expect(store.submitGiustificativo(1)).rejects.toThrow()
    expect(store.error).toBe('submit fail')
  })

  it('startInlineEdit / cancelInlineEdit', () => {
    const store = useGiustificativiStore()
    store.startInlineEdit({ id: 1, Descrizione: 'x' })
    expect(store.editingItem).toEqual({ id: 1, Descrizione: 'x' })
    store.cancelInlineEdit()
    expect(store.editingItem).toBeNull()
  })

  it('saveInlineEdit aggiorna campo via use case', async () => {
    mockAggiornaCampoGiustificativo.mockResolvedValueOnce({ id: 1, Descrizione: 'new' })
    const store = useGiustificativiStore()
    store.data = [{ id: 1, Descrizione: 'old', Progetto: 8 }]
    await store.saveInlineEdit(1, 'Descrizione', 'new')
    expect(mockAggiornaCampoGiustificativo).toHaveBeenCalledWith({
      id: 1,
      field: 'Descrizione',
      value: 'new',
      progettoId: 8
    })
    expect(store.data[0].Descrizione).toBe('new')
    expect(store.error).toBeNull()

    mockAggiornaCampoGiustificativo.mockRejectedValueOnce({
      response: { data: { errors: [{ message: 'inline fail' }] } }
    })
    await expect(store.saveInlineEdit(1, 'Descrizione', 'bad')).rejects.toThrow()
    expect(store.error).toBe('inline fail')
  })

  it('invalidateGiustificativo marca invalidato via use case', async () => {
    mockInvalidaGiustificativo.mockResolvedValueOnce()
    const store = useGiustificativiStore()
    store.data = [{ id: 1, Allegato: 'file-1', Progetto: 9 }]
    await store.invalidateGiustificativo(1)
    expect(mockInvalidaGiustificativo).toHaveBeenCalledWith({ id: 1, allegato: 'file-1', progettoId: 9 })
    expect(store.data[0].Invalidato).toBe(true)
    expect(store.saving).toBe(false)
    expect(store.error).toBeNull()

    mockInvalidaGiustificativo.mockRejectedValueOnce({
      response: { data: { errors: [{ message: 'invalidate fail' }] } }
    })
    await expect(store.invalidateGiustificativo(1)).rejects.toThrow()
    expect(store.error).toBe('invalidate fail')
  })

  it('draftItems getter filters drafts', () => {
    const store = useGiustificativiStore()
    store.data = [
      { id: 1, Stato: 'draft' },
      { id: 2, Stato: 'inviato' }
    ]
    expect(store.draftItems).toHaveLength(1)
    expect(store.draftItems[0].id).toBe(1)
  })

  it('inviatoItems getter filters sent', () => {
    const store = useGiustificativiStore()
    store.data = [
      { id: 1, Stato: 'inviato' },
      { id: 2, Stato: 'draft' }
    ]
    expect(store.inviatoItems).toHaveLength(1)
  })

  it('canEdit getter checks draft state', () => {
    const store = useGiustificativiStore()
    store.data = [
      { id: 1, Stato: 'draft' },
      { id: 2, Stato: 'inviato' }
    ]
    expect(store.canEdit(1)).toBe(true)
    expect(store.canEdit(2)).toBe(false)
    expect(store.canEdit(99)).toBeFalsy()
  })

  it('updateGiustificativo aggiorna via use case', async () => {
    mockAggiornaGiustificativo.mockResolvedValueOnce({ id: 1, Descrizione: 'upd' })
    const store = useGiustificativiStore()
    store.data = [{ id: 1, Descrizione: 'old', Allegato: 'old-file', Famiglia: 'fam-1', Progetto: 7 }]
    await store.updateGiustificativo(1, { Descrizione: 'upd' }, new File([], 'x.pdf'))
    expect(mockAggiornaGiustificativo).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 1,
        file: expect.any(File),
        allegatoAttuale: 'old-file',
        famigliaId: 'fam-1',
        progettoId: 7
      })
    )
    expect(store.data[0].Descrizione).toBe('upd')
    expect(store.saving).toBe(false)
    expect(store.error).toBeNull()
  })

  it('updateGiustificativo gestisce payload mancante ed errori', async () => {
    mockAggiornaGiustificativo.mockResolvedValueOnce(null)
    const store = useGiustificativiStore()
    store.data = [{ id: 1, Descrizione: 'old', Allegato: null, Famiglia: 'fam-1', Progetto: 7 }]
    await store.updateGiustificativo(1, { Descrizione: 'upd' })
    expect(store.data[0].Descrizione).toBe('old')
    expect(store.error).toBeNull()

    mockAggiornaGiustificativo.mockRejectedValueOnce({ response: { data: { errors: [{ message: 'update fail' }] } } })
    await expect(store.updateGiustificativo(1, { Descrizione: 'err' })).rejects.toThrow()
    expect(store.error).toBe('update fail')
  })
})
