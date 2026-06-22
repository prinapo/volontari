import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useVerificaStore } from 'src/stores/verifica.store'

const mockGetProgetti = vi.fn()
const mockGetGiustificativiByProgetti = vi.fn()
const mockGetGiustificativiByProgettiLight = vi.fn()
const mockGetRendicontazioniBatch = vi.fn()
const mockUpdateProgetto = vi.fn()
const mockVerifyGiust = vi.fn()
const mockUpdateGiust = vi.fn()
const mockRejectGiust = vi.fn()
const mockCreateGiust = vi.fn()
const mockGetAnniBando = vi.fn()
const mockGetSubmissions = vi.fn()
const mockUpdateSubmission = vi.fn()
const mockGetFamiglieBatch = vi.fn()
const mockGetFamigliaById = vi.fn()
const mockGetFamiglieByContatto = vi.fn()
const mockGetContattoByEmail = vi.fn()
const mockGetContattoByEmails = vi.fn()
const mockUpdateContatto = vi.fn()
const mockUpdateEmail = vi.fn()
const mockUpdateFamiglia = vi.fn()
const mockQueryFamiglieContatti = vi.fn()
const mockGetFile = vi.fn()
const mockRenameFile = vi.fn()
const mockUploadFile = vi.fn()
const mockUpdateFolder = vi.fn()
const mockFindProgettoByFamiglia = vi.fn()
const mockRicalcolaProposta = vi.fn()

vi.mock('src/services/verifica.service', () => ({
  verificaService: {
    getProgetti: (...a) => mockGetProgetti(...a),
    getGiustificativiByProgetti: (...a) => mockGetGiustificativiByProgetti(...a),
    getGiustificativiByProgettiLight: (...a) => mockGetGiustificativiByProgettiLight(...a),
    getRendicontazioniBatch: (...a) => mockGetRendicontazioniBatch(...a),
    updateProgetto: (...a) => mockUpdateProgetto(...a),
    getSubmissions: (...a) => mockGetSubmissions(...a),
    updateSubmission: (...a) => mockUpdateSubmission(...a),
    getAnniBando: (...a) => mockGetAnniBando(...a),
    findProgettoByFamiglia: (...a) => mockFindProgettoByFamiglia(...a)
  }
}))

vi.mock('src/services/famiglie.service', () => ({
  famiglieService: {
    getFamiglieBatch: (...a) => mockGetFamiglieBatch(...a),
    getById: (...a) => mockGetFamigliaById(...a),
    getFamiglieByContatto: (...a) => mockGetFamiglieByContatto(...a),
    update: (...a) => mockUpdateFamiglia(...a)
  }
}))

vi.mock('src/services/contatti.service', () => ({
  contattiService: {
    getByEmail: (...a) => mockGetContattoByEmail(...a),
    getByEmails: (...a) => mockGetContattoByEmails(...a),
    update: (...a) => mockUpdateContatto(...a)
  }
}))

vi.mock('src/services/email.service', () => ({
  emailService: {
    update: (...a) => mockUpdateEmail(...a)
  }
}))

vi.mock('src/services/gestione.service', () => ({
  gestioneService: {
    queryFamiglieContatti: (...a) => mockQueryFamiglieContatti(...a)
  }
}))

vi.mock('src/services/giustificativi.service', () => ({
  giustificativiService: {
    verify: (...a) => mockVerifyGiust(...a),
    update: (...a) => mockUpdateGiust(...a),
    reject: (...a) => mockRejectGiust(...a),
    create: (...a) => mockCreateGiust(...a)
  }
}))

vi.mock('src/services/files.service', () => ({
  filesService: {
    getFile: (...a) => mockGetFile(...a),
    renameFile: (...a) => mockRenameFile(...a),
    upload: (...a) => mockUploadFile(...a),
    updateFolder: (...a) => mockUpdateFolder(...a)
  }
}))

vi.mock('src/utils/enrichment', () => ({
  enrichWithEmails: vi.fn(() => Promise.resolve({}))
}))

vi.mock('src/utils/file-naming', () => ({
  uploadAndPrefixFile: vi.fn(() => Promise.resolve('file-id')),
  markFileRejected: vi.fn(() => Promise.resolve())
}))

vi.mock('src/stores/pagamenti.store', () => ({
  usePagamentiStore: () => ({
    ricalcolaProposta: (...a) => mockRicalcolaProposta(...a)
  })
}))

describe('verifica store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('has initial state', () => {
    const store = useVerificaStore()
    expect(store.rows).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.page).toBe(1)
    expect(store.limit).toBe(25)
  })

  it('totalPages getter', () => {
    const store = useVerificaStore()
    store.filterCount = 50
    store.limit = 25
    expect(store.totalPages).toBe(2)
  })

  it('fetchPage loads data and maps rows', async () => {
    const project = { id_progetto: 1, Famiglia: 'fam-1', Cognome_Beneficiario: 'R', Nome_Beneficiario: 'M', Allocato: '1000' }
    mockGetProgetti.mockResolvedValue({ data: { data: [project], meta: { filter_count: 1 } } })
    mockGetFamiglieBatch.mockResolvedValue({ data: { data: [{ id_famiglia: 'fam-1', Nome_Famiglia: 'F', IBAN: 'IT00X', Intestatario_CC: 'Mario' }] } })
    mockGetGiustificativiByProgetti.mockResolvedValue({ data: { data: [] } })
    const store = useVerificaStore()
    await store.fetchPage({ page: 1, limit: 25 })
    expect(store.rows).toHaveLength(1)
    expect(store.rows[0].idProgetto).toBe(1)
    expect(store.rows[0].famiglia).toBe('F')
    expect(store.loading).toBe(false)
  })

  it('fetchPage handles 403 and falls back to light endpoint', async () => {
    const project = { id_progetto: 1, Famiglia: 'fam-1' }
    mockGetProgetti.mockResolvedValue({ data: { data: [project], meta: { filter_count: 1 } } })
    mockGetFamiglieBatch.mockResolvedValue({ data: { data: [] } })
    mockGetGiustificativiByProgetti.mockRejectedValue({ response: { status: 403 } })
    mockGetGiustificativiByProgettiLight.mockResolvedValue({ data: { data: [{ id: 'g-1', Progetto: 1, Importo: '100', Stato: 'inviato', Invalidato: false }] } })
    const store = useVerificaStore()
    await store.fetchPage()
    expect(mockGetGiustificativiByProgettiLight).toHaveBeenCalled()
    expect(store.rows[0].giustificativi).toHaveLength(1)
  })

  it('fetchAllPages loads all pages', async () => {
    mockGetProgetti.mockResolvedValue({ data: { data: [{ id_progetto: 1, Famiglia: 'fam-1' }], meta: { filter_count: 1 } } })
    mockGetFamiglieBatch.mockResolvedValue({ data: { data: [] } })
    mockGetGiustificativiByProgetti.mockResolvedValue({ data: { data: [] } })
    const store = useVerificaStore()
    await store.fetchAllPages()
    expect(store.rows).toHaveLength(1)
  })

  it('fetchAnni loads years', async () => {
    mockGetAnniBando.mockResolvedValue({ data: { data: [{ AnnoBando: 2024 }, { AnnoBando: 2023 }] } })
    const store = useVerificaStore()
    await store.fetchAnni()
    expect(store.anniBandoList).toEqual([2024, 2023])
  })

  it('verifyGiustificativo verifies and recalculates', async () => {
    mockVerifyGiust.mockResolvedValue({})
    mockUpdateProgetto.mockResolvedValue({})
    const store = useVerificaStore()
    store.rows = [{ idProgetto: 1, giustificativi: [{ id: 'g-1', Stato: 'inviato', Importo: '100' }] }]
    await store.verifyGiustificativo(1, 'g-1')
    expect(mockVerifyGiust).toHaveBeenCalledWith('g-1')
    expect(mockRicalcolaProposta).toHaveBeenCalled()
  })

  it('updateGiustificativoField updates and recalculates', async () => {
    mockUpdateGiust.mockResolvedValue({})
    mockUpdateProgetto.mockResolvedValue({})
    const store = useVerificaStore()
    store.rows = [{ idProgetto: 1, giustificativi: [{ id: 'g-1', Importo: '100', Stato: 'draft' }] }]
    await store.updateGiustificativoField(1, 'g-1', 'Importo', '200')
    expect(mockUpdateGiust).toHaveBeenCalledWith('g-1', { Importo: '200' })
  })

  it('rejectGiustificativo rejects and marks file', async () => {
    mockRejectGiust.mockResolvedValue({})
    mockUpdateProgetto.mockResolvedValue({})
    const store = useVerificaStore()
    store.rows = [{ idProgetto: 1, giustificativi: [{ id: 'g-1', Stato: 'draft', Importo: '100', Allegato: 'file-1' }] }]
    await store.rejectGiustificativo(1, 'g-1', 'Nota errata')
    expect(mockRejectGiust).toHaveBeenCalledWith('g-1', 'Nota errata')
    expect(store.rows[0].giustificativi[0].Stato).toBe('rifiutato')
    expect(store.rows[0].giustificativi[0].NotaRifiuto).toBe('Nota errata')
  })

  it('updateBancari updates IBAN on rows', async () => {
    mockGetFamigliaById.mockResolvedValue({ data: { data: { id_famiglia: 'fam-1', IBAN: 'IT00' } } })
    const store = useVerificaStore()
    store.rows = [{ idFamiglia: 'fam-1' }]
    const ok = await store.updateBancari('fam-1', { iban: 'IT00X', intestatario: 'Mario' })
    expect(ok).toBe(true)
    expect(mockUpdateFamiglia).toHaveBeenCalled()
    expect(store.rows[0].iban).toBe('IT00X')
  })

  it('addGiustificativo creates with file', async () => {
    mockCreateGiust.mockResolvedValue({ data: { data: { id: 'g-1' } } })
    mockGetProgetti.mockResolvedValue({ data: { data: [], meta: {} } })
    mockGetFamiglieBatch.mockResolvedValue({ data: { data: [] } })
    mockGetGiustificativiByProgetti.mockResolvedValue({ data: { data: [] } })
    const store = useVerificaStore()
    const ok = await store.addGiustificativo({ Descrizione: 'test', Importo: 50, Progetto: 1, Famiglia: 'fam-1' }, new File([], 'x.pdf'))
    expect(ok).toBe(true)
    expect(mockCreateGiust).toHaveBeenCalled()
  })

  it('fetchSubmissions loads submissions', async () => {
    mockGetSubmissions.mockResolvedValue({ data: { data: [{ id: 's-1', email: 'test@r.it' }], meta: { filter_count: 1 } } })
    mockGetContattoByEmails.mockResolvedValue({ data: { data: [] } })
    const store = useVerificaStore()
    await store.fetchSubmissions()
    expect(store.submissions).toHaveLength(1)
    expect(store.submissionsLoading).toBe(false)
  })

  it('scartaSubmission discards submission', async () => {
    mockUpdateSubmission.mockResolvedValue({})
    mockGetSubmissions.mockResolvedValue({ data: { data: [], meta: {} } })
    mockGetContattoByEmails.mockResolvedValue({ data: { data: [] } })
    const store = useVerificaStore()
    await store.scartaSubmission('s-1', 'Non valido')
    expect(mockUpdateSubmission).toHaveBeenCalledWith('s-1', { stato: 'scartato', note_riconciliazione: 'Non valido' })
  })

  it('ripristinaSubmission restores submission', async () => {
    mockUpdateSubmission.mockResolvedValue({})
    mockGetSubmissions.mockResolvedValue({ data: { data: [], meta: {} } })
    mockGetContattoByEmails.mockResolvedValue({ data: { data: [] } })
    const store = useVerificaStore()
    await store.ripristinaSubmission('s-1')
    expect(mockUpdateSubmission).toHaveBeenCalledWith('s-1', { stato: 'in_attesa', note_riconciliazione: null })
  })

  it('reconcileUpdateField updates contatto/famiglia fields', async () => {
    const store = useVerificaStore()
    await store.reconcileUpdateField('c-1', null, 'Nome', 'Mario')
    expect(mockUpdateContatto).toHaveBeenCalledWith('c-1', { Nome: 'Mario' })
    await store.reconcileUpdateField(null, 'fam-1', 'IBAN', 'IT00X')
    expect(mockUpdateFamiglia).toHaveBeenCalledWith('fam-1', { IBAN: 'IT00X' })
  })

  it('loadFamigliaContacts loads contacts with emails', async () => {
    mockGetFamiglieBatch.mockResolvedValue({ data: { data: [] } })
    mockGetGiustificativiByProgetti.mockResolvedValue({ data: { data: [] } })
    mockGetProgetti.mockResolvedValue({ data: { data: [], meta: {} } })
    const store = useVerificaStore()
    const result = await store.loadFamigliaContacts('fam-1')
    expect(result).toEqual({ genitori: [], volontari: [] })
  })

  it('resolveSubmissionContext resolves contatto and famiglia', async () => {
    mockGetContattoByEmail.mockResolvedValue({ data: { data: [{ id_contatto: 'c-1', Nome: 'M', Cognome: 'R', Numero_di_cellulare: '123', email: [] }] } })
    mockGetFamiglieByContatto.mockResolvedValue({ data: { data: [{ Ruolo_nella_Famiglia: 'Genitore', Famiglia: { id_famiglia: 'fam-1', Nome_Famiglia: 'F', IBAN: 'IT00', Intestatario_CC: 'Mario' } }] } })
    mockGetFamigliaById.mockResolvedValue({ data: { data: { id_famiglia: 'fam-1', IBAN: 'IT00', Intestatario_CC: 'Mario' } } })
    const store = useVerificaStore()
    const result = await store.resolveSubmissionContext('test@r.it')
    expect(result.contatto).toBeTruthy()
    expect(result.famigliaId).toBe('fam-1')
    expect(result.rightValues.IBAN).toBe('IT00')
  })

  it('reconcileSubmission reconciles a submission', async () => {
    const store = useVerificaStore()
    store.submissions = [{ id: 's-1', email: 'test@r.it', descrizione: 'test', importo: 100 }]

    mockFindProgettoByFamiglia.mockResolvedValue({ data: { data: [{ id_progetto: 1, AnnoBando: 2024 }] } })
    mockCreateGiust.mockResolvedValue({ data: { data: { id: 'g-1' } } })
    mockUpdateSubmission.mockResolvedValue({})
    mockGetSubmissions.mockResolvedValue({ data: { data: [], meta: {} } })
    mockGetContattoByEmails.mockResolvedValue({ data: { data: [] } })
    mockGetProgetti.mockResolvedValue({ data: { data: [], meta: {} } })
    mockGetFamiglieBatch.mockResolvedValue({ data: { data: [] } })
    mockGetGiustificativiByProgetti.mockResolvedValue({ data: { data: [] } })
    mockUpdateProgetto.mockResolvedValue({})

    await store.reconcileSubmission({
      submissionId: 's-1',
      contattoId: 'c-1',
      famigliaId: 'fam-1',
      progettoId: 1,
      descrizione: 'riconciliato',
      importo: 100,
      copiedFields: ['Nome', 'Cognome'],
      rightValues: { Nome: 'M', Cognome: 'R' }
    })
    expect(mockCreateGiust).toHaveBeenCalled()
    expect(mockUpdateSubmission).toHaveBeenCalled()
  })
})
