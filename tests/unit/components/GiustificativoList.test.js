import { describe, it, expect, vi, beforeEach } from 'vitest'
import { quasarMount } from '../quasar-mount'
import GiustificativoList from 'src/components/Giustificativi/GiustificativoList.vue'

const mockFetchByProgetto = vi.fn()

vi.mock('stores/giustificativi.store', () => ({
  useGiustificativiStore: () => ({
    items: [],
    loading: false,
    saving: false,
    error: null,
    fetchByProgetto: (...a) => mockFetchByProgetto(...a)
  })
}))

describe('GiustificativoList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders empty state', () => {
    const wrapper = quasarMount(GiustificativoList, {
      props: { progettoId: 'p-1', famigliaId: 'fam-1' }
    })
    expect(wrapper.text()).toContain('Giustificativi')
    expect(wrapper.text()).toContain('Nessun giustificativo presente')
  })

  it('fetches items on mount with progettoId', () => {
    quasarMount(GiustificativoList, {
      props: { progettoId: 'p-1', famigliaId: 'fam-1' }
    })
    expect(mockFetchByProgetto).toHaveBeenCalledWith('p-1')
  })
})
