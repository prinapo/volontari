import { beforeEach, describe, expect, it, vi } from 'vitest'
import FamigliePage from 'src/pages/FamigliePage.vue'
import { quasarMount } from '../quasar-mount'

const mockInit = vi.fn()
const mockSelectFamiglia = vi.fn()
const mockSelectProgetto = vi.fn()

const authState = {
  initialized: true,
  canManager: false,
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
  erogazioni: [],
  erogazioniLoading: false,
  totaleErogato: 0,
  saving: false,
  init: (...args) => mockInit(...args),
  selectFamiglia: (...args) => mockSelectFamiglia(...args),
  selectProgetto: (...args) => mockSelectProgetto(...args)
}

const giustificativiState = {
  data: []
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

vi.mock('components/Erogazioni/ErogazioneList.vue', () => ({
  default: { name: 'ErogazioneList', template: '<div>ErogazioneList Stub</div>' }
}))

describe('FamigliePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.initialized = true
    authState.canManager = false
    authState.contattoId = 'cont-1'
    famiglieState.loading = false
    famiglieState.famiglia = null
    famiglieState.famiglieContatti = []
    famiglieState.famigliaOptions = []
    famiglieState.selectedFamigliaId = null
    famiglieState.selectedProgettoId = null
    famiglieState.selectedProgetto = null
    famiglieState.progetti = []
    famiglieState.erogazioni = []
    famiglieState.totaleErogato = 0
    giustificativiState.data = []
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
    famiglieState.erogazioni = [{ id: 1, Stato: 'pagato', Importo: '40' }]
    famiglieState.totaleErogato = 40
    giustificativiState.data = [{ Importo: '50' }, { Importo: '25' }]

    const wrapper = quasarMount(FamigliePage)

    expect(wrapper.text()).toContain('FamigliaInfoCard Stub')
    expect(wrapper.text()).toContain('GiustificativoList Stub')
    expect(wrapper.text()).toContain('ErogazioneList Stub')
    expect(wrapper.text()).toContain('Totale Erogato')
    expect(wrapper.vm.totaleGiustificativi).toBe(75)
    expect(wrapper.vm.totaleRimborsabile).toBe(60)
    expect(wrapper.vm.erogazioniCount).toBe(1)
    expect(wrapper.vm.giustificativiCount).toBe(2)
  })

  it('renders section headers with the item counts', () => {
    famiglieState.famiglia = { id_famiglia: 'fam-1' }
    famiglieState.selectedProgettoId = 'p-1'
    famiglieState.selectedProgetto = { Allocato: '100', AnnoBando: 2026 }
    famiglieState.erogazioni = [
      { id: 1, Stato: 'pagato', Importo: '40' },
      { id: 2, Stato: 'proposto', Importo: '10' }
    ]
    giustificativiState.data = [
      { Importo: '50', Invalidato: false },
      { Importo: '25', Invalidato: true }
    ]

    const wrapper = quasarMount(FamigliePage)

    expect(wrapper.text()).toContain('Giustificativi (1)')
    expect(wrapper.text()).toContain('Erogazioni (2)')
  })

  it('shows verifica area when no family is linked but user can verify', () => {
    authState.canManager = true
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
