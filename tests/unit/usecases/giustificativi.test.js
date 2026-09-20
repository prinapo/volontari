import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  creaGiustificativo,
  creaSubmission,
  riconciliaSubmission,
  verificaGiustificativo,
  inviaGiustificativo
} from 'src/usecases/giustificativi'

const mockGetProgettoById = vi.fn()
const mockGetGiustificativiByProgetto = vi.fn()
const mockUpdateProgetto = vi.fn()
const mockFindProgettoByFamiglia = vi.fn()
const mockUpdateSubmission = vi.fn()
const mockGetSubmissionById = vi.fn()
const mockCreate = vi.fn()
const mockFindByProject = vi.fn()
const mockCreateRendicontazione = vi.fn()
const mockGetById = vi.fn()
const mockUpdateGiustificativo = vi.fn()
const mockUpload = vi.fn()
const mockSubmitService = vi.fn()

vi.mock('src/services/verifica.service', () => ({
  verificaService: {
    getProgettoById: (...a) => mockGetProgettoById(...a),
    getGiustificativiByProgetto: (...a) => mockGetGiustificativiByProgetto(...a),
    updateProgetto: (...a) => mockUpdateProgetto(...a),
    findProgettoByFamiglia: (...a) => mockFindProgettoByFamiglia(...a),
    updateSubmission: (...a) => mockUpdateSubmission(...a),
    getSubmissionById: (...a) => mockGetSubmissionById(...a)
  }
}))

vi.mock('src/services/submit.service', () => ({
  submitService: {
    createSubmission: (...a) => mockSubmitService(...a)
  }
}))

vi.mock('src/services/giustificativi.service', () => ({
  giustificativiService: {
    create: (...a) => mockCreate(...a),
    findByProject: (...a) => mockFindByProject(...a),
    createRendicontazione: (...a) => mockCreateRendicontazione(...a),
    getById: (...a) => mockGetById(...a),
    update: (...a) => mockUpdateGiustificativo(...a)
  }
}))

vi.mock('src/utils/file-naming', () => ({
  uploadAndPrefixFile: (...a) => mockUpload(...a),
  markFileObsolete: vi.fn(() => Promise.resolve()),
  markFileRejected: vi.fn(() => Promise.resolve())
}))

const operativo = { data: { data: { id_progetto: 1, StatoProgetto: 'accettato', Allocato: '1000', TotalePagato: 0 } } }

describe('creaGiustificativo', () => {
  beforeEach(() => vi.clearAllMocks())

  it('crea, carica il file e sincronizza gli aggregati', async () => {
    mockGetProgettoById.mockResolvedValue(operativo)
    mockGetGiustificativiByProgetto.mockResolvedValue({
      data: { data: [{ Stato: 'inviato', Importo: '10', Invalidato: false }] }
    })
    mockFindByProject.mockResolvedValue({ data: { data: [] } })
    mockCreateRendicontazione.mockResolvedValue({ data: { data: { id: 'rend-1' } } })
    mockUpload.mockResolvedValue('file-1')
    mockCreate.mockResolvedValue({ data: { data: { Descrizione: 'test', id: 'g-1' } } })
    mockUpdateProgetto.mockResolvedValue({})

    const created = await creaGiustificativo(
      { Progetto: 1, Famiglia: 'fam-1', Descrizione: 'test', Importo: 10, Stato: 'inviato', file: new File([], 'x') },
      { origine: 'volontario' }
    )

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        Progetto: 1,
        Famiglia: 'fam-1',
        Descrizione: 'test',
        Importo: 10,
        Rendicontazione: 'rend-1',
        Allegato: 'file-1'
      })
    )
    expect(mockUpdateProgetto).toHaveBeenCalledWith(1, expect.objectContaining({ StatoProgetto: 'in_rendicontazione' }))
    expect(created.Descrizione).toBe('test')
  })

  it('applica la guardia "progetto non operativo" senza creare nulla', async () => {
    mockGetProgettoById.mockResolvedValue({ data: { data: { StatoProgetto: 'proposto' } } })
    await expect(
      creaGiustificativo({ Progetto: 1, Descrizione: 'x', Importo: 1 }, { origine: 'verificatore' })
    ).rejects.toThrow('Progetto non operativo')
    expect(mockCreate).not.toHaveBeenCalled()
    expect(mockCreateRendicontazione).not.toHaveBeenCalled()
    expect(mockUpdateProgetto).not.toHaveBeenCalled()
  })

  it('consente la creazione su progetto in rimborso_parziale (operativo)', async () => {
    mockGetProgettoById.mockResolvedValue({
      data: { data: { id_progetto: 1, StatoProgetto: 'rimborso_parziale', Allocato: '1000', TotalePagato: '200' } }
    })
    mockGetGiustificativiByProgetto.mockResolvedValue({ data: { data: [] } })
    mockFindByProject.mockResolvedValue({ data: { data: [] } })
    mockCreateRendicontazione.mockResolvedValue({ data: { data: { id: 'rend-1' } } })
    mockCreate.mockResolvedValue({ data: { data: { Descrizione: 'x', id: 'g-1' } } })
    mockUpdateProgetto.mockResolvedValue({})

    await creaGiustificativo(
      { Progetto: 1, Famiglia: 'fam-1', Descrizione: 'x', Importo: 10 },
      { origine: 'volontario' }
    )

    expect(mockCreate).toHaveBeenCalled()
    expect(mockUpdateProgetto).toHaveBeenCalledWith(1, expect.anything())
  })

  it('mappa errori di creazione come "Creazione giustificativo fallita"', async () => {
    mockGetProgettoById.mockResolvedValue(operativo)
    mockFindByProject.mockResolvedValue({ data: { data: [] } })
    mockCreate.mockResolvedValue({ data: { data: { Descrizione: 'other' } } })
    await expect(
      creaGiustificativo({ Progetto: 1, Descrizione: 'x', Importo: 1 }, { origine: 'volontario' })
    ).rejects.toThrow('Creazione giustificativo fallita')
  })
})

describe('verificaGiustificativo / inviaGiustificativo', () => {
  beforeEach(() => vi.clearAllMocks())

  it('verifica e sincronizza', async () => {
    mockGetById.mockResolvedValue({ data: { data: { Stato: 'inviato' } } })
    mockUpdateGiustificativo.mockResolvedValue({})
    mockGetProgettoById.mockResolvedValue(operativo)
    mockGetGiustificativiByProgetto.mockResolvedValue({ data: { data: [] } })
    mockUpdateProgetto.mockResolvedValue({})
    await verificaGiustificativo({ id: 'g-1', progettoId: 1 })
    expect(mockUpdateGiustificativo).toHaveBeenCalledWith(
      'g-1',
      expect.objectContaining({ Stato: 'verificato', Pagamento: null })
    )
    expect(mockUpdateProgetto).toHaveBeenCalledWith(1, expect.anything())
  })

  it('invia e sincronizza', async () => {
    mockGetById.mockResolvedValue({ data: { data: { Stato: 'draft' } } })
    mockUpdateGiustificativo.mockResolvedValue({ data: { data: { id: 'g-1', Stato: 'inviato' } } })
    mockGetProgettoById.mockResolvedValue(operativo)
    mockGetGiustificativiByProgetto.mockResolvedValue({ data: { data: [] } })
    mockUpdateProgetto.mockResolvedValue({})
    const res = await inviaGiustificativo({ id: 'g-1', progettoId: 1 })
    expect(mockUpdateGiustificativo).toHaveBeenCalledWith('g-1', { Stato: 'inviato' })
    expect(res.Stato).toBe('inviato')
    expect(mockUpdateProgetto).toHaveBeenCalledWith(1, expect.anything())
  })
})

describe('riconciliaSubmission', () => {
  beforeEach(() => vi.clearAllMocks())

  it('crea il giustificativo, marca la submission e sincronizza', async () => {
    mockGetProgettoById.mockResolvedValue(operativo)
    mockGetGiustificativiByProgetto.mockResolvedValue({ data: { data: [] } })
    mockFindProgettoByFamiglia.mockResolvedValue({ data: { data: [{ id_progetto: 9, AnnoBando: 2026 }] } })
    mockCreate.mockResolvedValue({ data: { data: { id: 'g-9' } } })
    mockGetSubmissionById.mockResolvedValue({ data: { data: { id: 's-1', stato: 'inserito' } } })
    mockUpdateSubmission.mockResolvedValue({})
    mockUpdateProgetto.mockResolvedValue({})

    const id = await riconciliaSubmission({
      submissionId: 's-1',
      famigliaId: 'fam-9',
      progettoId: 9,
      descrizione: 'invio',
      importo: 100,
      copiedFields: []
    })

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ Progetto: 9, Famiglia: 'fam-9', Stato: 'inviato', AnnoBando: 2026 })
    )
    expect(mockUpdateSubmission).toHaveBeenCalledWith(
      's-1',
      expect.objectContaining({ stato: 'inviato', giustificativo_creato: 'g-9' })
    )
    expect(mockUpdateProgetto).toHaveBeenCalledWith(9, expect.anything())
    expect(id).toBe('g-9')
  })

  it('applica la guardia progetto non operativo anche in riconciliazione', async () => {
    mockGetProgettoById.mockResolvedValue({ data: { data: { StatoProgetto: 'proposto' } } })
    mockFindProgettoByFamiglia.mockResolvedValue({ data: { data: [{ id_progetto: 9, AnnoBando: 2026 }] } })
    await expect(
      riconciliaSubmission({
        submissionId: 's-1',
        famigliaId: 'fam-9',
        progettoId: 9,
        descrizione: 'x',
        importo: 1,
        copiedFields: []
      })
    ).rejects.toThrow('Progetto non operativo')
    expect(mockCreate).not.toHaveBeenCalled()
  })
})

describe('creaSubmission (pubblico non loggato)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('accoda la submission con stato inserito e email lowercase', async () => {
    mockSubmitService.mockResolvedValue({ data: { data: { id: 's-1' } } })
    const res = await creaSubmission({ email: 'Mario@Example.IT', descrizione: 'x', importo: 10 })
    expect(res).toEqual({ id: 's-1' })
    const payload = mockSubmitService.mock.calls[0][0]
    expect(payload.email).toBe('mario@example.it')
    expect(payload.stato).toBe('inserito')
    expect(payload.data_invio).toBeTruthy()
  })
})
