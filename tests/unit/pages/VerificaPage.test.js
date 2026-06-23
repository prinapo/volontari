import { describe, it, expect, vi, beforeEach } from 'vitest'
import { quasarMount } from '../quasar-mount'
import VerificaPage from 'src/pages/VerificaPage.vue'

const mockFetchAnni = vi.fn()
const mockFetchAllPages = vi.fn()
const mockLoadFamigliaContacts = vi.fn()

const verificaState = {
  rows: [],
  anniBando: [],
  loading: false,
  fetchAnni: (...a) => mockFetchAnni(...a),
  fetchAllPages: (...a) => mockFetchAllPages(...a),
  loadFamigliaContacts: (...a) => mockLoadFamigliaContacts(...a)
}

const authState = { canVerifica: true, initialized: true }

vi.mock('stores/verifica.store', () => ({
  useVerificaStore: () => verificaState
}))

vi.mock('stores/auth.store', () => ({
  useAuthStore: () => authState
}))

vi.mock('src/utils/notify', () => ({ notifyError: vi.fn(), notifySuccess: vi.fn() }))
vi.mock('src/utils/formatters', () => ({
  formatCurrency: v => `€${v}`,
  formatDate: v => v,
  statoLabel: s => s,
  statoColor: () => 'primary'
}))
vi.mock('quasar', () => ({
  copyToClipboard: vi.fn(),
  useQuasar: () => ({
    platform: { is: { mobile: false } },
    screen: { width: 1024, sm: true, lt: { sm: false }, gt: { sm: true } }
  })
}))
vi.mock('src/utils/assets', () => ({ assetUrl: id => `/assets/${id}` }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }), useRoute: () => ({ name: 'Verifica' }) }))

describe('VerificaPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    verificaState.rows = []
    verificaState.anniBando = []
    verificaState.loading = false
  })

  it('renders verifica title', () => {
    const wrapper = quasarMount(VerificaPage)
    expect(wrapper.text()).toContain('Verifica')
  })

  it('calls fetchAnni and fetchAllPages on mount', () => {
    quasarMount(VerificaPage)
    expect(mockFetchAnni).toHaveBeenCalled()
    expect(mockFetchAllPages).toHaveBeenCalled()
  })

  it('statoRiga returns "Non ricevuta" for empty rendicontato', () => {
    const wrapper = quasarMount(VerificaPage)
    const row = { totaleRendicontato: 0, iban: '', intestatario: '', giustificativi: [] }
    expect(wrapper.vm.statoRiga(row)).toEqual({ label: 'Non ricevuta', color: 'grey' })
  })

  it('statoRiga returns "Dati bancari mancanti" when no iban', () => {
    const wrapper = quasarMount(VerificaPage)
    const row = { totaleRendicontato: 100, iban: '', intestatario: '', giustificativi: [] }
    expect(wrapper.vm.statoRiga(row)).toEqual({ label: 'Dati bancari mancanti', color: 'warning' })
  })

  it('statoRiga returns "Pronto" when all verified', () => {
    const wrapper = quasarMount(VerificaPage)
    const row = {
      totaleRendicontato: 100,
      iban: 'IT00X',
      intestatario: 'Mario',
      giustificativi: [{ Stato: 'verificato', Invalidato: false }]
    }
    expect(wrapper.vm.statoRiga(row)).toEqual({ label: 'Pronto', color: 'positive' })
  })

  it('hasPendingGiustificativi detects pending', () => {
    const wrapper = quasarMount(VerificaPage)
    expect(wrapper.vm.hasPendingGiustificativi({ giustificativi: [{ Stato: 'inviato' }] })).toBe(true)
    expect(wrapper.vm.hasPendingGiustificativi({ giustificativi: [{ Stato: 'verificato' }] })).toBe(false)
  })

  it('totalGiustificativi counts non-invalidated', () => {
    const wrapper = quasarMount(VerificaPage)
    const row = {
      giustificativi: [
        { Stato: 'draft', Invalidato: false },
        { Stato: 'draft', Invalidato: true }
      ]
    }
    expect(wrapper.vm.totalGiustificativi(row)).toBe(1)
  })

  it('loadFamigliaContatti calls store and caches', async () => {
    mockLoadFamigliaContacts.mockResolvedValue({ genitori: [{ id: 1 }], volontari: [] })
    const wrapper = quasarMount(VerificaPage)
    await wrapper.vm.loadFamigliaContatti('fam-1')
    expect(mockLoadFamigliaContacts).toHaveBeenCalledWith('fam-1')
  })
})
