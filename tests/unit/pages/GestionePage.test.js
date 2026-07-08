import { beforeEach, describe, expect, it, vi } from 'vitest'
import { quasarMount } from '../quasar-mount'
import GestionePage from 'src/pages/GestionePage.vue'

const mockFetchAll = vi.fn()

const authState = {
  initialized: true
}

const gestioneState = {
  loading: false,
  famiglie: [{ id_famiglia: 'fam-1' }],
  fetchAll: (...args) => mockFetchAll(...args)
}

vi.mock('stores/auth.store', () => ({
  useAuthStore: () => authState
}))

vi.mock('stores/gestione.store', () => ({
  useGestioneStore: () => gestioneState
}))

vi.mock('components/Gestione/ContattiTab.vue', () => ({
  default: { name: 'ContattiTab', template: '<div>ContattiTab Stub</div>' }
}))

vi.mock('components/Gestione/FamiglieTab.vue', () => ({
  default: { name: 'FamiglieTab', template: '<div>FamiglieTab Stub</div>' }
}))

describe('GestionePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.initialized = true
    gestioneState.loading = false
    gestioneState.famiglie = [{ id_famiglia: 'fam-1' }]
  })

  it('shows loading state when auth is not initialized', () => {
    authState.initialized = false
    const wrapper = quasarMount(GestionePage)
    expect(wrapper.text()).toContain('Caricamento...')
  })

  it('renders tabs and fetches data on mount', () => {
    const wrapper = quasarMount(GestionePage)
    expect(wrapper.text()).toContain('Famiglie')
    expect(wrapper.text()).toContain('Contatti')
    expect(mockFetchAll).toHaveBeenCalled()
  })

  it('starts from famiglie tab by default', () => {
    const wrapper = quasarMount(GestionePage)
    expect(wrapper.vm.tab).toBe('famiglie')
  })
})
