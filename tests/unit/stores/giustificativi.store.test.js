import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useGiustificativiStore } from 'src/stores/giustificativi.store'

const mockGetByProgetto = vi.fn()
const mockCreate = vi.fn()
const mockUpdate = vi.fn()
const mockSubmit = vi.fn()
const mockInvalidate = vi.fn()
const mockFindByProject = vi.fn()
const mockCreateRendicontazione = vi.fn()
const mockUpload = vi.fn()
const mockMarkFileObsolete = vi.fn()
const mockGetFile = vi.fn()
const mockRenameFile = vi.fn()

vi.mock('src/services/giustificativi.service', () => ({
  giustificativiService: {
    getByProgetto: (...a) => mockGetByProgetto(...a),
    create: (...a) => mockCreate(...a),
    update: (...a) => mockUpdate(...a),
    submit: (...a) => mockSubmit(...a),
    invalidate: (...a) => mockInvalidate(...a),
    findByProject: (...a) => mockFindByProject(...a),
    createRendicontazione: (...a) => mockCreateRendicontazione(...a)
  }
}))

vi.mock('src/utils/file-naming', () => ({
  uploadAndPrefixFile: (...a) => mockUpload(...a),
  markFileObsolete: (...a) => mockMarkFileObsolete(...a)
}))

vi.mock('src/services/files.service', () => ({
  filesService: {
    upload: (...a) => mockUpload(...a),
    getFile: (...a) => mockGetFile(...a),
    renameFile: (...a) => mockRenameFile(...a)
  }
}))

describe('giustificativi store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('has initial state', () => {
    const store = useGiustificativiStore()
    expect(store.items).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.saving).toBe(false)
    expect(store.editingItem).toBeNull()
    expect(store.error).toBeNull()
  })

  it('fetchByProgetto loads items', async () => {
    mockGetByProgetto.mockResolvedValue({ data: { data: [{ id: 1, Stato: 'draft' }] } })
    const store = useGiustificativiStore()
    await store.fetchByProgetto(10)
    expect(mockGetByProgetto).toHaveBeenCalledWith(10)
    expect(store.items).toHaveLength(1)
    expect(store.loading).toBe(false)
  })

  it('fetchByProgetto handles error', async () => {
    mockGetByProgetto.mockRejectedValue({ response: { data: { errors: [{ message: 'Err' }] } } })
    const store = useGiustificativiStore()
    await store.fetchByProgetto(10)
    expect(store.error).toBe('Err')
  })

  it('createGiustificativo creates with file and rendicontazione', async () => {
    mockFindByProject.mockResolvedValue({ data: { data: [] } })
    mockCreateRendicontazione.mockResolvedValue({ data: { data: { id: 'rend-1' } } })
    mockUpload.mockResolvedValue('file-1')
    mockCreate.mockResolvedValue({ data: { data: { Descrizione: 'test' } } })
    const store = useGiustificativiStore()
    const ok = await store.createGiustificativo(
      { Progetto: 1, Famiglia: 'fam-1', Descrizione: 'test', Importo: 10 },
      new File([], 'x')
    )
    expect(ok).toBe(true)
    expect(mockCreate).toHaveBeenCalled()
    expect(store.saving).toBe(false)
  })

  it('createGiustificativo returns false on mismatched response and on service errors', async () => {
    mockFindByProject.mockResolvedValueOnce({ data: { data: [{ id: 'rend-existing' }] } })
    mockCreate.mockResolvedValueOnce({ data: { data: { Descrizione: 'other' } } })
    const store = useGiustificativiStore()

    let ok = await store.createGiustificativo({ Progetto: 1, Famiglia: 'fam-1', Descrizione: 'test', Importo: 10 })
    expect(ok).toBe(false)
    expect(mockUpload).not.toHaveBeenCalled()

    mockFindByProject.mockRejectedValueOnce({ response: { data: { errors: [{ message: 'create fail' }] } } })
    ok = await store.createGiustificativo({ Progetto: 1, Famiglia: 'fam-1', Descrizione: 'test', Importo: 10 })
    expect(ok).toBe(false)
    expect(store.error).toBe('create fail')
  })

  it('submitGiustificativo sends submit', async () => {
    mockSubmit.mockResolvedValue({ data: { data: { id: 1, Stato: 'inviato' } } })
    const store = useGiustificativiStore()
    store.items = [{ id: 1, Stato: 'draft' }]
    const ok = await store.submitGiustificativo(1)
    expect(ok).toBe(true)
    expect(store.items[0].Stato).toBe('inviato')
    expect(store.saving).toBe(false)
  })

  it('submitGiustificativo returns true even without updated payload and false on errors', async () => {
    mockSubmit.mockResolvedValueOnce({ data: { data: null } })
    const store = useGiustificativiStore()
    store.items = [{ id: 1, Stato: 'draft' }]
    let ok = await store.submitGiustificativo(1)
    expect(ok).toBe(true)
    expect(store.items[0].Stato).toBe('draft')

    mockSubmit.mockRejectedValueOnce({ response: { data: { errors: [{ message: 'submit fail' }] } } })
    ok = await store.submitGiustificativo(1)
    expect(ok).toBe(false)
    expect(store.error).toBe('submit fail')
  })

  it('startInlineEdit / cancelInlineEdit', () => {
    const store = useGiustificativiStore()
    store.startInlineEdit({ id: 1, Descrizione: 'x' })
    expect(store.editingItem).toEqual({ id: 1, Descrizione: 'x' })
    store.cancelInlineEdit()
    expect(store.editingItem).toBeNull()
  })

  it('saveInlineEdit updates field and handles errors', async () => {
    mockUpdate.mockResolvedValueOnce({ data: { data: { id: 1, Descrizione: 'new' } } })
    const store = useGiustificativiStore()
    store.items = [{ id: 1, Descrizione: 'old' }]
    let ok = await store.saveInlineEdit(1, 'Descrizione', 'new')
    expect(ok).toBe(true)
    expect(store.items[0].Descrizione).toBe('new')

    mockUpdate.mockRejectedValueOnce({ response: { data: { errors: [{ message: 'inline fail' }] } } })
    ok = await store.saveInlineEdit(1, 'Descrizione', 'bad')
    expect(ok).toBe(false)
    expect(store.error).toBe('inline fail')
  })

  it('invalidateGiustificativo marks invalidated and handles errors', async () => {
    mockInvalidate.mockResolvedValueOnce({})
    const store = useGiustificativiStore()
    store.items = [{ id: 1, Allegato: 'file-1' }]
    let ok = await store.invalidateGiustificativo(1)
    expect(ok).toBe(true)
    expect(mockMarkFileObsolete).toHaveBeenCalledWith('file-1')
    expect(store.items[0].Invalidato).toBe(true)
    expect(store.saving).toBe(false)

    mockInvalidate.mockRejectedValueOnce({ response: { data: { errors: [{ message: 'invalidate fail' }] } } })
    ok = await store.invalidateGiustificativo(1)
    expect(ok).toBe(false)
    expect(store.error).toBe('invalidate fail')
  })

  it('draftItems getter filters drafts', () => {
    const store = useGiustificativiStore()
    store.items = [
      { id: 1, Stato: 'draft' },
      { id: 2, Stato: 'inviato' }
    ]
    expect(store.draftItems).toHaveLength(1)
    expect(store.draftItems[0].id).toBe(1)
  })

  it('inviatoItems getter filters sent', () => {
    const store = useGiustificativiStore()
    store.items = [
      { id: 1, Stato: 'inviato' },
      { id: 2, Stato: 'draft' }
    ]
    expect(store.inviatoItems).toHaveLength(1)
  })

  it('canEdit getter checks draft state', () => {
    const store = useGiustificativiStore()
    store.items = [
      { id: 1, Stato: 'draft' },
      { id: 2, Stato: 'inviato' }
    ]
    expect(store.canEdit(1)).toBe(true)
    expect(store.canEdit(2)).toBe(false)
    expect(store.canEdit(99)).toBeFalsy()
  })

  it('updateGiustificativo with new file', async () => {
    mockUpload.mockResolvedValueOnce('new-file')
    mockUpdate.mockResolvedValueOnce({ data: { data: { id: 1, Descrizione: 'upd' } } })
    const store = useGiustificativiStore()
    store.items = [{ id: 1, Descrizione: 'old', Allegato: 'old-file', Famiglia: 'fam-1' }]
    const ok = await store.updateGiustificativo(1, { Descrizione: 'upd' }, new File([], 'x.pdf'))
    expect(ok).toBe(true)
    expect(mockMarkFileObsolete).toHaveBeenCalledWith('old-file')
    expect(store.items[0].Descrizione).toBe('upd')
    expect(store.saving).toBe(false)
  })

  it('updateGiustificativo handles missing updated payload and service errors', async () => {
    mockUpdate.mockResolvedValueOnce({ data: { data: null } })
    const store = useGiustificativiStore()
    store.items = [{ id: 1, Descrizione: 'old', Allegato: null, Famiglia: 'fam-1' }]
    let ok = await store.updateGiustificativo(1, { Descrizione: 'upd' })
    expect(ok).toBe(true)
    expect(store.items[0].Descrizione).toBe('old')

    mockUpdate.mockRejectedValueOnce({ response: { data: { errors: [{ message: 'update fail' }] } } })
    ok = await store.updateGiustificativo(1, { Descrizione: 'err' })
    expect(ok).toBe(false)
    expect(store.error).toBe('update fail')
  })

  it('ensureRendicontazione reuses existing, creates new and returns null without ids', async () => {
    mockFindByProject.mockResolvedValueOnce({ data: { data: [{ id: 'rend-existing' }] } })
    const store = useGiustificativiStore()
    let id = await store.ensureRendicontazione({ Famiglia: 'fam-1', Progetto: 1 })
    expect(id).toBe('rend-existing')
    expect(mockCreateRendicontazione).not.toHaveBeenCalled()

    mockFindByProject.mockResolvedValueOnce({ data: { data: [] } })
    mockCreateRendicontazione.mockResolvedValueOnce({ data: { data: { id: 'rend-new' } } })
    id = await store.ensureRendicontazione({ Famiglia: 'fam-1', Progetto: 1, AnnoBando: 2026 })
    expect(id).toBe('rend-new')

    id = await store.ensureRendicontazione({ Famiglia: null, Progetto: 1 })
    expect(id).toBeNull()
  })
})
