import { beforeEach, describe, expect, it, vi } from 'vitest'
import { quasarMount } from '../quasar-mount'
import FamigliePage from 'src/pages/FamigliePage.vue'

const mockInit = vi.fn()
const mockSelectFamiglia = vi.fn()
const mockSelectProgetto = vi.fn()

const authState = {
  initialized: true,
  canVerifica: false,
  contattoId: 'cont-1'
}

const famiglieState = {
  loading: false,
  famiglia: null,
  famiglieContatti: [],
  famigliaOptions: [],
  selectedFamigliaId: null,
  selectedProgettoId: null,
  selectedProgetto: null,
  progetti: [],
  famigliaName: 'Famiglia Test',
  iban: 'IT60X0542811101000000123456',
  intestatarioCC: 'Mario Rossi',
  saving: false,
  init: (...args) => mockInit(...args),
  selectFamiglia: (...args) => mockSelectFamiglia(...args),
  selectProgetto: (...args) => mockSelectProgetto(...args)
}

const giustificativiState = {
  items: []
}

vi.mock('stores/auth.store', () => ({
  useAuthStore: () => authState
}))

vi.mock('stores/famiglie.store', () => ({
  useFamiglieStore: () => famiglieState
}))

vi.mock('stores/giustificativi.store', () => ({
  useGiustificativiStore: () => giustificativiState
}))

vi.mock('src/utils/formatters', () => ({
  formatCurrency: value => `€${value}`
}))

vi.mock('components/Famiglia/FamigliaInfoCard.vue', () => ({
  default: { name: 'FamigliaInfoCard', template: '<div>FamigliaInfoCard Stub</div>' }
}))

vi.mock('components/Famiglia/ProgettoSelector.vue', () => ({
  default: { name: 'ProgettoSelector', template: '<div>ProgettoSelector Stub</div>' }
}))

vi.mock('components/Giustificativi/GiustificativoList.vue', () => ({
  default: { name: 'GiustificativoList', template: '<div>GiustificativoList Stub</div>' }
}))

describe('FamigliePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.initialized = true
    authState.canVerifica = false
    authState.contattoId = 'cont-1'
    famiglieState.loading = false
    famiglieState.famiglia = null
    famiglieState.famiglieContatti = []
    famiglieState.famigliaOptions = []
    famiglieState.selectedFamigliaId = null
    famiglieState.selectedProgettoId = null
    famiglieState.selectedProgetto = null
    famiglieState.progetti = []
    giustificativiState.items = []
  })

  it('shows loading screen when auth is not initialized', () => {
    authState.initialized = false
    const wrapper = quasarMount(FamigliePage)
    expect(wrapper.text()).toContain('Caricamento...')
  })

  it('initializes famiglie store immediately from contattoId', () => {
    quasarMount(FamigliePage)
    expect(mockInit).toHaveBeenCalledWith('cont-1')
  })

  it('renders family content and computed totals', () => {
    famiglieState.famiglia = { id_famiglia: 'fam-1' }
    famiglieState.selectedProgettoId = 'p-1'
    famiglieState.selectedProgetto = { Allocato: '100', AnnoBando: 2026 }
    giustificativiState.items = [{ Importo: '50' }, { Importo: '25' }]

    const wrapper = quasarMount(FamigliePage)

    expect(wrapper.text()).toContain('FamigliaInfoCard Stub')
    expect(wrapper.text()).toContain('GiustificativoList Stub')
    expect(wrapper.vm.totaleGiustificativi).toBe(75)
    expect(wrapper.vm.totaleRimborsabile).toBe(60)
  })

  it('shows verifica area when no family is linked but user can verify', () => {
    authState.canVerifica = true
    const wrapper = quasarMount(FamigliePage)
    expect(wrapper.text()).toContain('Area verifica disponibile')
  })

  it('shows empty state when no family and no verifica access', () => {
    const wrapper = quasarMount(FamigliePage)
    expect(wrapper.text()).toContain('Nessun dato disponibile')
  })

  it('delegates selection handlers to store actions', () => {
    const wrapper = quasarMount(FamigliePage)
    wrapper.vm.handleFamigliaChange('fam-2')
    wrapper.vm.handleProjectChange('proj-2')

    expect(mockSelectFamiglia).toHaveBeenCalledWith('fam-2')
    expect(mockSelectProgetto).toHaveBeenCalledWith('proj-2')
  })
})
