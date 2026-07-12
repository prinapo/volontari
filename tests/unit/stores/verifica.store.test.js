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
const mockGetGenitoriByFamiglia = vi.fn()
const mockGetVolontariByFamiglia = vi.fn()
const mockGetContattoByEmail = vi.fn()
const mockGetContattoByEmails = vi.fn()
const mockUpdateContatto = vi.fn()
const mockUpdateEmail = vi.fn()
const mockGetEmailByContatto = vi.fn()
const mockUpdateFamiglia = vi.fn()
const mockQueryFamiglieContatti = vi.fn()
const mockGetFile = vi.fn()
const mockRenameFile = vi.fn()
const mockUploadFile = vi.fn()
const mockUpdateFolder = vi.fn()
const mockFindProgettoByFamiglia = vi.fn()
const mockRicalcolaProposta = vi.fn()

vi.mock('stores/auth.store', () => ({
  useAuthStore: () => ({ canManager: true })
}))

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
    getGenitoriByFamiglia: (...a) => mockGetGenitoriByFamiglia(...a),
    getVolontariByFamiglia: (...a) => mockGetVolontariByFamiglia(...a),
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
    update: (...a) => mockUpdateEmail(...a),
    updateSafe: (...a) => mockUpdateEmail(...a),
    getByContatto: (...a) => mockGetEmailByContatto(...a)
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
    const project = {
      id_progetto: 1,
      Famiglia: 'fam-1',
      Cognome_Beneficiario: 'R',
      Nome_Beneficiario: 'M',
      Allocato: '1000'
    }
    mockGetProgetti.mockResolvedValue({ data: { data: [project], meta: { filter_count: 1 } } })
    mockGetFamiglieBatch.mockResolvedValue({
      data: { data: [{ id_famiglia: 'fam-1', Nome_Famiglia: 'F', IBAN: 'IT00X', Intestatario_CC: 'Mario' }] }
    })
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
    mockGetGiustificativiByProgettiLight.mockResolvedValue({
      data: { data: [{ id: 'g-1', Progetto: 1, Importo: '100', Stato: 'inviato', Invalidato: false }] }
    })
    const store = useVerificaStore()
    await store.fetchPage()
    expect(mockGetGiustificativiByProgettiLight).toHaveBeenCalled()
    expect(store.rows[0].giustificativi).toHaveLength(1)
  })

  it('fetchAllPages loads all pages', async () => {
    mockGetProgetti.mockResolvedValue({
      data: { data: [{ id_progetto: 1, Famiglia: 'fam-1' }], meta: { filter_count: 1 } }
    })
    mockGetFamiglieBatch.mockResolvedValue({ data: { data: [] } })
    mockGetGiustificativiByProgetti.mockResolvedValue({ data: { data: [] } })
    const store = useVerificaStore()
    await store.fetchAllPages()
    expect(store.rows).toHaveLength(1)
  })

  it('fetchAnni loads years and falls back to empty on error', async () => {
    mockGetAnniBando.mockResolvedValueOnce({ data: { data: [{ AnnoBando: 2024 }, { AnnoBando: 2023 }] } })
    const store = useVerificaStore()
    await store.fetchAnni()
    expect(store.anniBandoList).toEqual([2024, 2023])

    mockGetAnniBando.mockRejectedValueOnce(new Error('boom'))
    await store.fetchAnni()
    expect(store.anniBandoList).toEqual([])
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

  it('verifyGiustificativo returns early when row or item is missing', async () => {
    mockVerifyGiust.mockResolvedValue({})
    const store = useVerificaStore()
    store.rows = [{ idProgetto: 2, giustificativi: [{ id: 'g-x', Stato: 'inviato', Importo: '50' }] }]

    await store.verifyGiustificativo(1, 'g-1')
    await store.verifyGiustificativo(2, 'g-1')
    expect(mockVerifyGiust).toHaveBeenCalledTimes(2)
  })

  it('updateGiustificativoField updates and recalculates', async () => {
    mockUpdateGiust.mockResolvedValue({})
    mockUpdateProgetto.mockResolvedValue({})
    const store = useVerificaStore()
    store.rows = [{ idProgetto: 1, giustificativi: [{ id: 'g-1', Importo: '100', Stato: 'draft' }] }]
    await store.updateGiustificativoField(1, 'g-1', 'Importo', '200')
    expect(mockUpdateGiust).toHaveBeenCalledWith('g-1', { Importo: '200' })
  })

  it('updateGiustificativoField returns early for missing row/item and throws friendly errors', async () => {
    mockUpdateGiust.mockResolvedValueOnce({})
    const store = useVerificaStore()
    store.rows = [{ idProgetto: 2, giustificativi: [{ id: 'g-x', Importo: '10', Stato: 'draft' }] }]
    await store.updateGiustificativoField(1, 'g-1', 'Importo', '20')

    mockUpdateGiust.mockResolvedValueOnce({})
    await store.updateGiustificativoField(2, 'g-1', 'Importo', '20')

    mockUpdateGiust.mockRejectedValueOnce(new Error('boom'))
    await expect(store.updateGiustificativoField(2, 'g-1', 'Importo', '20')).rejects.toBeTruthy()
    expect(store.error).toBe("Errore nell'aggiornamento del campo Importo")
  })

  it('rejectGiustificativo rejects and marks file', async () => {
    mockRejectGiust.mockResolvedValue({})
    mockUpdateProgetto.mockResolvedValue({})
    const store = useVerificaStore()
    store.rows = [
      { idProgetto: 1, giustificativi: [{ id: 'g-1', Stato: 'draft', Importo: '100', Allegato: 'file-1' }] }
    ]
    await store.rejectGiustificativo(1, 'g-1', 'Nota errata')
    expect(mockRejectGiust).toHaveBeenCalledWith('g-1', 'Nota errata')
    expect(store.rows[0].giustificativi[0].Stato).toBe('rifiutato')
    expect(store.rows[0].giustificativi[0].NotaRifiuto).toBe('Nota errata')
  })

  it('rejectGiustificativo reports service errors', async () => {
    mockRejectGiust.mockRejectedValueOnce({ response: { data: { errors: [{ message: 'reject fail' }] } } })
    const store = useVerificaStore()
    await expect(store.rejectGiustificativo(1, 'g-1', 'Nota')).rejects.toBeTruthy()
    expect(store.error).toBe('reject fail')
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

  it('updateBancari stores error and throws on service failure', async () => {
    mockUpdateFamiglia.mockRejectedValueOnce({ response: { data: { errors: [{ message: 'bancari fail' }] } } })
    const store = useVerificaStore()
    await expect(store.updateBancari('fam-1', { iban: 'IT00X' })).rejects.toBeTruthy()
    expect(store.error).toBe('bancari fail')
  })

  it('addGiustificativo creates with file', async () => {
    mockCreateGiust.mockResolvedValue({ data: { data: { id: 'g-1' } } })
    mockGetProgetti.mockResolvedValue({ data: { data: [], meta: {} } })
    mockGetFamiglieBatch.mockResolvedValue({ data: { data: [] } })
    mockGetGiustificativiByProgetti.mockResolvedValue({ data: { data: [] } })
    const store = useVerificaStore()
    const ok = await store.addGiustificativo(
      { Descrizione: 'test', Importo: 50, Progetto: 1, Famiglia: 'fam-1' },
      new File([], 'x.pdf')
    )
    expect(ok).toBe(true)
    expect(mockCreateGiust).toHaveBeenCalled()
  })

  it('addGiustificativo stores error and throws on failure', async () => {
    mockCreateGiust.mockRejectedValueOnce({ response: { data: { errors: [{ message: 'add fail' }] } } })
    const store = useVerificaStore()
    await expect(
      store.addGiustificativo({ Descrizione: 'x', Importo: 1, Progetto: 1, Famiglia: 'fam-1' })
    ).rejects.toBeTruthy()
    expect(store.error).toBe('add fail')
  })

  it('fetchSubmissions loads submissions', async () => {
    mockGetSubmissions.mockResolvedValue({
      data: { data: [{ id: 's-1', email: 'test@r.it' }], meta: { filter_count: 1 } }
    })
    mockGetContattoByEmails.mockResolvedValue({ data: { data: [] } })
    const store = useVerificaStore()
    await store.fetchSubmissions()
    expect(store.submissions).toHaveLength(1)
    expect(store.submissionsLoading).toBe(false)
  })

  it('fetchSubmissions falls back on 403 and detects linked states', async () => {
    mockGetSubmissions.mockRejectedValueOnce({ response: { status: 403 } }).mockResolvedValueOnce({
      data: {
        data: [
          { id: 's-1', email: 'parent@test.it' },
          { id: 's-2', email: 'vol@test.it' },
          { id: 's-3', email: 'linked@test.it' },
          { id: 's-4', email: 'missing@test.it' }
        ]
      }
    })
    mockGetContattoByEmails.mockResolvedValue({
      data: {
        data: [
          { id_contatto: 'c-1', email: [{ email_address: 'parent@test.it' }] },
          { id_contatto: 'c-2', email: [{ email_address: 'vol@test.it' }] },
          { id_contatto: 'c-3', email: [{ email_address: 'linked@test.it' }] }
        ]
      }
    })
    mockQueryFamiglieContatti.mockResolvedValue({
      data: {
        data: [
          {
            Contatto: 'c-1',
            Ruolo_nella_Famiglia: 'Genitore',
            Famiglia: { id_famiglia: 'fam-1', Nome_Famiglia: 'Fam Uno' }
          },
          {
            Contatto: 'c-2',
            Ruolo_nella_Famiglia: 'Volontario',
            Famiglia: { id_famiglia: 'fam-2', Nome_Famiglia: 'Fam Due' }
          }
        ]
      }
    })
    const store = useVerificaStore()

    await store.fetchSubmissions({ includeScartati: true })

    expect(store.submissionsTotalCount).toBe(4)
    expect(store.submissions[0]).toEqual(expect.objectContaining({ _detectState: 'linked', _famigliaId: 'fam-1' }))
    expect(store.submissions[1]).toEqual(expect.objectContaining({ _detectState: 'not_parent', _famigliaId: 'fam-2' }))
    expect(store.submissions[2]).toEqual(expect.objectContaining({ _detectState: 'not_linked' }))
    expect(store.submissions[3]).toEqual(expect.objectContaining({ _detectState: 'not_found' }))
  })

  it('fetchSubmissions resets state on non-403 errors', async () => {
    mockGetSubmissions.mockRejectedValueOnce(new Error('boom'))
    const store = useVerificaStore()
    store.submissions = [{ id: 'old' }]
    store.submissionsTotalCount = 99

    await store.fetchSubmissions()

    expect(store.submissions).toEqual([])
    expect(store.submissionsTotalCount).toBe(0)
  })

  it('fetchSubmissions uses explicit page/limit and helper failures stay silent', async () => {
    mockGetSubmissions.mockResolvedValueOnce({
      data: { data: [{ id: 's-1', email: 'x@test.it' }], meta: { filter_count: 5 } }
    })
    mockGetContattoByEmails.mockRejectedValueOnce(new Error('email fail'))
    const store = useVerificaStore()
    await store.fetchSubmissions({ page: 3, limit: 10, includeScartati: false })
    expect(mockGetSubmissions).toHaveBeenCalledWith({
      page: 3,
      limit: 10,
      includeScartati: false,
      meta: 'filter_count'
    })
    expect(store.submissions[0]).toEqual(expect.objectContaining({ _detectState: 'not_found' }))
  })

  it('scartaSubmission discards submission and reports errors', async () => {
    mockUpdateSubmission.mockResolvedValueOnce({})
    mockGetSubmissions.mockResolvedValueOnce({ data: { data: [], meta: {} } })
    mockGetContattoByEmails.mockResolvedValueOnce({ data: { data: [] } })
    const store = useVerificaStore()
    await store.scartaSubmission('s-1', 'Non valido')
    expect(mockUpdateSubmission).toHaveBeenCalledWith('s-1', { stato: 'scartato', note_riconciliazione: 'Non valido' })

    mockUpdateSubmission.mockRejectedValueOnce({ response: { data: { errors: [{ message: 'scarto fail' }] } } })
    await expect(store.scartaSubmission('s-2', 'x')).rejects.toBeTruthy()
    expect(store.error).toBe('scarto fail')
  })

  it('ripristinaSubmission restores submission and reports errors', async () => {
    mockUpdateSubmission.mockResolvedValueOnce({})
    mockGetSubmissions.mockResolvedValueOnce({ data: { data: [], meta: {} } })
    mockGetContattoByEmails.mockResolvedValueOnce({ data: { data: [] } })
    const store = useVerificaStore()
    await store.ripristinaSubmission('s-1')
    expect(mockUpdateSubmission).toHaveBeenCalledWith('s-1', { stato: 'in_attesa', note_riconciliazione: null })

    mockUpdateSubmission.mockRejectedValueOnce({ response: { data: { errors: [{ message: 'ripristino fail' }] } } })
    await expect(store.ripristinaSubmission('s-2')).rejects.toBeTruthy()
    expect(store.error).toBe('ripristino fail')
  })

  it('reconcileUpdateField updates contatto/famiglia fields', async () => {
    const store = useVerificaStore()
    await store.reconcileUpdateField('c-1', null, 'Nome', 'Mario')
    expect(mockUpdateContatto).toHaveBeenCalledWith('c-1', { Nome: 'Mario' })
    await store.reconcileUpdateField(null, 'fam-1', 'IBAN', 'IT00X')
    expect(mockUpdateFamiglia).toHaveBeenCalledWith('fam-1', { IBAN: 'IT00X' })
  })

  it('loadFamigliaContacts loads contacts and handles failures', async () => {
    mockGetGenitoriByFamiglia.mockResolvedValue({
      data: { data: [{ Contatto: { id_contatto: 'g-1', Nome: 'Anna' } }] }
    })
    mockGetVolontariByFamiglia.mockResolvedValue({
      data: { data: [{ Contatto: { id_contatto: 'v-1', Nome: 'Luca' } }] }
    })
    const store = useVerificaStore()

    let result = await store.loadFamigliaContacts('fam-1')
    expect(result.genitori[0].Contatto.id_contatto).toBe('g-1')
    expect(result.volontari[0].Contatto.id_contatto).toBe('v-1')

    mockGetGenitoriByFamiglia.mockRejectedValueOnce(new Error('boom'))
    mockGetVolontariByFamiglia.mockRejectedValueOnce(new Error('boom'))
    result = await store.loadFamigliaContacts('fam-1')
    expect(result).toEqual({ genitori: [], volontari: [] })
  })

  it('loadFamigliaContacts returns empty without famigliaId', async () => {
    const store = useVerificaStore()
    await expect(store.loadFamigliaContacts()).resolves.toEqual({ genitori: [], volontari: [] })
  })

  it('resolveSubmissionContext resolves contatto and famiglia', async () => {
    mockGetContattoByEmail.mockResolvedValue({
      data: { data: [{ id_contatto: 'c-1', Nome: 'M', Cognome: 'R', Numero_di_cellulare: '123', email: [] }] }
    })
    mockGetFamiglieByContatto.mockResolvedValue({
      data: {
        data: [
          {
            Ruolo_nella_Famiglia: 'Genitore',
            Famiglia: { id_famiglia: 'fam-1', Nome_Famiglia: 'F', IBAN: 'IT00', Intestatario_CC: 'Mario' }
          }
        ]
      }
    })
    mockGetFamigliaById.mockResolvedValue({
      data: { data: { id_famiglia: 'fam-1', IBAN: 'IT00', Intestatario_CC: 'Mario' } }
    })
    const store = useVerificaStore()
    const result = await store.resolveSubmissionContext('test@r.it')
    expect(result.contatto).toBeTruthy()
    expect(result.famigliaId).toBe('fam-1')
    expect(result.rightValues.IBAN).toBe('IT00')
  })

  it('resolveSubmissionContext handles empty email and string famiglia fallback', async () => {
    const store = useVerificaStore()
    expect(await store.resolveSubmissionContext()).toEqual(
      expect.objectContaining({ contatto: null, famigliaId: null })
    )

    mockGetContattoByEmail.mockResolvedValueOnce({
      data: {
        data: [
          {
            id_contatto: 'c-2',
            Nome: 'Sara',
            Cognome: 'Blu',
            Numero_di_cellulare: '321',
            email: [{ email_address: 'sara@test.it', Primary: true }]
          }
        ]
      }
    })
    mockGetFamiglieByContatto.mockResolvedValueOnce({
      data: { data: [{ Ruolo_nella_Famiglia: 'Volontario', Famiglia: 'fam-2' }] }
    })
    mockGetFamigliaById
      .mockResolvedValueOnce({ data: { data: { id_famiglia: 'fam-2', IBAN: 'IT99', Intestatario_CC: 'Sara Blu' } } })
      .mockRejectedValueOnce(new Error('detail fail'))

    const result = await store.resolveSubmissionContext('sara@test.it')
    expect(result.contattoId).toBe('c-2')
    expect(result.famigliaId).toBe('fam-2')
    expect(result.rightValues.Email).toBe('sara@test.it')
    expect(result.famigliaDetail).toEqual({ id_famiglia: 'fam-2', IBAN: 'IT99', Intestatario_CC: 'Sara Blu' })
  })

  it('resolveSubmissionContext tolerates invalid family FK and outer service failures', async () => {
    const store = useVerificaStore()

    mockGetContattoByEmail.mockResolvedValueOnce({
      data: {
        data: [
          {
            id_contatto: 'c-3',
            Nome: 'Paolo',
            Cognome: 'Verdi',
            email: [{ email_address: 'paolo@test.it', Primary: true }]
          }
        ]
      }
    })
    mockGetFamiglieByContatto.mockResolvedValueOnce({
      data: { data: [{ Ruolo_nella_Famiglia: 'Genitore', Famiglia: 'fam-missing' }] }
    })
    mockGetFamigliaById.mockRejectedValueOnce(new Error('fk non valido'))

    let result = await store.resolveSubmissionContext('paolo@test.it')
    expect(result.contattoId).toBe('c-3')
    expect(result.famigliaId).toBeNull()

    mockGetContattoByEmail.mockRejectedValueOnce(new Error('lookup fail'))
    result = await store.resolveSubmissionContext('boom@test.it')
    expect(result).toEqual(expect.objectContaining({ contatto: null, famigliaId: null }))
  })

  it('helper methods build maps and keep silent catch paths', async () => {
    const store = useVerificaStore()
    expect(
      store._buildContattiByEmail([
        { id_contatto: 'c-1', email: [{ email_address: 'A@B.IT' }, { email_address: '' }] },
        { id_contatto: 'c-2', email: [] }
      ])
    ).toEqual({ 'a@b.it': expect.objectContaining({ id_contatto: 'c-1' }) })

    mockQueryFamiglieContatti.mockRejectedValueOnce(new Error('fc fail'))
    const emptyMap = await store._buildFamigliaLinkMap(['c-1'])
    expect(emptyMap.size).toBe(0)

    mockGetContattoByEmails.mockRejectedValueOnce(new Error('emails fail'))
    const submissions = [{ id: 's-1', email: 'missing@test.it' }]
    await store._detectSubmissionStates(submissions)
    expect(submissions[0]).toEqual(expect.objectContaining({ _detectState: 'not_found' }))
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

  it('reconcileSubmission rejects missing submissions', async () => {
    const store = useVerificaStore()
    store.submissions = []
    await expect(
      store.reconcileSubmission({ submissionId: 'missing', famigliaId: 'fam-1', progettoId: 1 })
    ).rejects.toBeTruthy()
    expect(store.error).toBe('Errore nella riconciliazione')
  })

  it('reconcileSubmission patches copied fields and renames attachments', async () => {
    const store = useVerificaStore()
    store.submissions = [{ id: 's-2', email: 'full@test.it', descrizione: 'orig', importo: 75, data: '2026-01-02' }]

    mockUpdateContatto.mockResolvedValue({})
    mockUpdateEmail.mockResolvedValue({})
    mockUpdateFamiglia.mockResolvedValue({})
    mockUpdateFolder.mockResolvedValue({})
    mockGetFamiglieBatch.mockResolvedValue({
      data: { data: [{ id_famiglia: 'fam-9', Nome_Famiglia: 'FamigliaNove' }] }
    })
    mockGetFile.mockResolvedValue({ data: { data: { filename_download: 'doc.pdf' } } })
    mockRenameFile.mockResolvedValue({})
    mockFindProgettoByFamiglia.mockResolvedValue({ data: { data: [{ id_progetto: 9, AnnoBando: 2026 }] } })
    mockCreateGiust.mockResolvedValue({ data: { data: { id: 'g-9' } } })
    mockUpdateSubmission.mockResolvedValue({})
    mockGetSubmissions.mockResolvedValue({ data: { data: [], meta: {} } })
    mockGetContattoByEmails.mockResolvedValue({ data: { data: [] } })
    mockGetProgetti.mockResolvedValue({ data: { data: [], meta: {} } })
    mockGetGiustificativiByProgetti.mockResolvedValue({ data: { data: [] } })
    mockUpdateProgetto.mockResolvedValue({})

    await store.reconcileSubmission({
      submissionId: 's-2',
      contattoId: 'c-9',
      emailRecordId: 'email-9',
      famigliaId: 'fam-9',
      progettoId: 9,
      note: 'ok',
      allegato: 'file-9',
      copiedFields: ['Nome', 'Cognome', 'Telefono', 'Email', 'IBAN', 'Intestatario'],
      rightValues: {
        Nome: 'Mario',
        Cognome: 'Rossi',
        Telefono: '+39123',
        Email: 'new@test.it',
        IBAN: 'IT60X',
        Intestatario: 'Mario Rossi'
      }
    })

    expect(mockUpdateContatto).toHaveBeenCalledWith('c-9', {
      Nome: 'Mario',
      Cognome: 'Rossi',
      Numero_di_cellulare: '+39123'
    })
    expect(mockUpdateEmail).toHaveBeenCalledWith('email-9', { email_address: 'new@test.it' })
    expect(mockUpdateFamiglia).toHaveBeenCalledWith('fam-9', {
      IBAN: 'IT60X',
      Intestatario_CC: 'Mario Rossi'
    })
    expect(mockUpdateFolder).toHaveBeenCalledWith('file-9', undefined)
    expect(mockRenameFile).toHaveBeenCalledWith('file-9', 'FamigliaNove_doc.pdf')
    expect(mockCreateGiust).toHaveBeenCalledWith(
      expect.objectContaining({ Allegato: 'file-9', Progetto: 9, Famiglia: 'fam-9', AnnoBando: 2026 })
    )
  })

  it('reconcileSubmission stores API error messages from downstream failures', async () => {
    const store = useVerificaStore()
    store.submissions = [{ id: 's-3', email: 'err@test.it', descrizione: 'orig', importo: 10 }]
    mockFindProgettoByFamiglia.mockResolvedValueOnce({ data: { data: [] } })
    mockCreateGiust.mockRejectedValueOnce({ response: { data: { errors: [{ message: 'giust fail' }] } } })

    await expect(
      store.reconcileSubmission({
        submissionId: 's-3',
        famigliaId: 'fam-1',
        progettoId: 1,
        copiedFields: [],
        rightValues: {}
      })
    ).rejects.toBeTruthy()
    expect(store.error).toBe('giust fail')
  })

  it('updateBancari handles empty patches and reconcileUpdateField rejects unknown keys', async () => {
    const store = useVerificaStore()
    await expect(store.updateBancari('fam-1', {})).resolves.toBe(true)
    await expect(store.reconcileUpdateField('c-1', 'fam-1', 'CampoX', 'value')).rejects.toThrow(
      'Campo sconosciuto: CampoX'
    )
  })
})
