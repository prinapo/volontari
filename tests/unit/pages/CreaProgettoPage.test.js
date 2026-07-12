import { beforeEach, describe, expect, it, vi } from 'vitest'
import { quasarMount } from '../quasar-mount'
import CreaProgettoPage from 'src/pages/CreaProgettoPage.vue'

const mockPush = vi.fn()
const mockSearchFamiglie = vi.fn()
const mockCreateProgetto = vi.fn()
const mockUploadFile = vi.fn()
const mockCreateAllegato = vi.fn()
const mockNotifySuccess = vi.fn()
const mockNotifyError = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush })
}))

vi.mock('quasar', () => ({
  useQuasar: () => ({ notify: vi.fn() })
}))

vi.mock('src/services/gestione.service', () => ({
  gestioneService: { searchFamiglie: (...args) => mockSearchFamiglie(...args) }
}))

vi.mock('src/services/files.service', () => ({
  filesService: {
    upload: (...args) => mockUploadFile(...args)
  }
}))

vi.mock('src/services/progetti.service', () => ({
  progettiService: {
    createProgetto: (...args) => mockCreateProgetto(...args),
    createAllegato: (...args) => mockCreateAllegato(...args)
  }
}))

vi.mock('src/utils/notify', () => ({
  notifySuccess: (...args) => mockNotifySuccess(...args),
  notifyError: (...args) => mockNotifyError(...args)
}))

describe('CreaProgettoPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSearchFamiglie.mockResolvedValue({ data: { data: [] } })
    mockCreateProgetto.mockResolvedValue({ data: { data: { id_progetto: 'proj-1' } } })
    mockUploadFile.mockResolvedValue({ data: { data: { id: 'file-1' } } })
    mockCreateAllegato.mockResolvedValue({})
  })

  it('renders page title', () => {
    const wrapper = quasarMount(CreaProgettoPage)
    expect(wrapper.text()).toContain('Crea progetto di test')
  })

  it('loads family options on filter', async () => {
    mockSearchFamiglie.mockResolvedValue({ data: { data: [{ id_famiglia: 'fam-1', Nome_Famiglia: 'Famiglia Uno' }] } })
    const wrapper = quasarMount(CreaProgettoPage)

    await wrapper.vm.filterFamiglie('Fam', fn => fn())

    expect(mockSearchFamiglie).toHaveBeenCalledWith('Fam')
    expect(wrapper.vm.famigliaOptions).toHaveLength(1)
  })

  it('clears family options when filter fails', async () => {
    mockSearchFamiglie.mockRejectedValue(new Error('boom'))
    const wrapper = quasarMount(CreaProgettoPage)
    wrapper.vm.famigliaOptions = [{ id_famiglia: 'fam-1' }]

    await wrapper.vm.filterFamiglie('Fam', fn => fn())

    expect(wrapper.vm.famigliaOptions).toEqual([])
  })

  it('creates project, uploads files and redirects on submit', async () => {
    mockCreateProgetto.mockResolvedValue({ data: { data: { id_progetto: 'proj-1' } } })
    mockUploadFile
      .mockResolvedValueOnce({ data: { data: { id: 'file-1' } } })
      .mockResolvedValueOnce({ data: { data: { id: 'file-2' } } })
      .mockResolvedValueOnce({ data: { data: { id: 'file-3' } } })

    const wrapper = quasarMount(CreaProgettoPage)
    Object.assign(wrapper.vm.form, {
      Famiglia: 'fam-1',
      Cognome_Beneficiario: 'Rossi',
      Nome_Beneficiario: 'Mario',
      AnnoBando: '2026',
      Allocato: '5000',
      Titolo_Progetto: 'Titolo',
      Ambito: 'Scuola',
      Data_Inizio_Progetto: '2026-01-01',
      Data_Fine_Progetto: '2026-12-31',
      Descrizione_Progetto: 'Descrizione',
      Descrizione_Condizione: 'Condizione',
      Dettaglio_Costi: 'Costi',
      Eta: '12',
      Relazione_con_il_soggetto_richiedente: 'Madre'
    })
    wrapper.vm.allegati.Progetto = new File(['a'], 'progetto.pdf')
    wrapper.vm.allegati.ISEE = new File(['b'], 'isee.pdf')
    wrapper.vm.allegati.Giustificativi = new File(['c'], 'giust.pdf')

    await wrapper.vm.handleSubmit()

    expect(mockCreateProgetto).toHaveBeenCalledWith(
      expect.objectContaining({
        Famiglia: 'fam-1',
        Cognome_Beneficiario: 'Rossi',
        Nome_Beneficiario: 'Mario',
        AnnoBando: 2026,
        Allocato: 5000,
        StatoProgetto: 'aperto'
      })
    )
    expect(mockUploadFile).toHaveBeenCalledTimes(3)
    expect(mockCreateAllegato).toHaveBeenCalledTimes(3)
    expect(mockNotifySuccess).toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledWith({ name: 'Admin' })
  })

  it('returns early when form validation fails', async () => {
    const wrapper = quasarMount(CreaProgettoPage)
    wrapper.vm.formRef = { validate: vi.fn().mockResolvedValue(false) }

    await wrapper.vm.handleSubmit()

    expect(mockCreateProgetto).not.toHaveBeenCalled()
  })

  it('creates project without attachments and falls back to generated id', async () => {
    mockCreateProgetto.mockResolvedValue({ data: { data: {} } })
    const wrapper = quasarMount(CreaProgettoPage)
    wrapper.vm.formRef = { validate: vi.fn().mockResolvedValue(true) }
    Object.assign(wrapper.vm.form, {
      Famiglia: 'fam-1',
      Cognome_Beneficiario: 'Rossi',
      Nome_Beneficiario: 'Mario',
      AnnoBando: '',
      Allocato: ''
    })

    await wrapper.vm.handleSubmit()

    expect(mockCreateProgetto).toHaveBeenCalledWith(
      expect.objectContaining({
        AnnoBando: null,
        Allocato: null
      })
    )
    expect(mockUploadFile).not.toHaveBeenCalled()
    expect(mockCreateAllegato).not.toHaveBeenCalled()
    expect(mockNotifySuccess).toHaveBeenCalled()
  })

  it('shows error notification when submit fails', async () => {
    mockCreateProgetto.mockRejectedValue({
      response: { data: { errors: [{ message: 'Creazione fallita' }] } }
    })

    const wrapper = quasarMount(CreaProgettoPage)
    Object.assign(wrapper.vm.form, {
      Famiglia: 'fam-1',
      Cognome_Beneficiario: 'Rossi',
      Nome_Beneficiario: 'Mario'
    })

    await wrapper.vm.handleSubmit()

    expect(wrapper.vm.error).toBe('Creazione fallita')
    expect(mockNotifyError).toHaveBeenCalled()
  })

  it('falls back to generic error message on submit failure without backend details', async () => {
    mockCreateProgetto.mockRejectedValue(new Error('boom'))
    const wrapper = quasarMount(CreaProgettoPage)
    Object.assign(wrapper.vm.form, {
      Famiglia: 'fam-1',
      Cognome_Beneficiario: 'Rossi',
      Nome_Beneficiario: 'Mario'
    })

    await wrapper.vm.handleSubmit()

    expect(wrapper.vm.error).toBe('Errore nella creazione del progetto')
    expect(mockNotifyError).toHaveBeenCalled()
  })
})
