import { beforeEach, describe, expect, it, vi } from 'vitest'
import ComunicazioniPage from 'src/pages/ComunicazioniPage.vue'
import { quasarMount } from '../quasar-mount'

const mockSearchContatti = vi.fn()
const mockGetFamiglieContatti = vi.fn()

const comunicazioniState = {
  audience: 'contatti',
  filters: {
    ruoli: [],
    cognome: '',
    statoProgetto: [],
    annoBando: null,
    giustificativi: null,
    pagamenti: [],
    senzaVolontario: false,
    referenteId: null,
    contattoId: null
  },
  oggetto: '',
  corpo: '',
  link: '',
  recipients: [],
  selected: [],
  esito: null,
  loading: false,
  sending: false,
  error: null,
  caricaDestinatari: vi.fn(),
  selectAll: vi.fn(),
  deselectAll: vi.fn(),
  setSelected: vi.fn(),
  invia: vi.fn(),
  reset: vi.fn(),
  setAudience: vi.fn()
}

vi.mock('stores/comunicazioni.store', () => ({
  useComunicazioniStore: () => comunicazioniState
}))

vi.mock('src/services/contatti.service', () => ({
  contattiService: { search: (...args) => mockSearchContatti(...args) }
}))

vi.mock('src/services/comunicazioni.service', () => ({
  comunicazioniService: { getFamiglieContatti: (...args) => mockGetFamiglieContatti(...args) }
}))

vi.mock('src/utils/notify', () => ({
  notifyError: vi.fn(),
  notifySuccess: vi.fn()
}))

vi.mock('quasar', () => ({
  useQuasar: () => ({ notify: vi.fn() })
}))

const extraStubs = {
  'q-stepper': { template: '<div><slot /></div>', props: ['modelValue'] },
  'q-step': { template: '<div><slot /></div>', props: ['name', 'title'] },
  'q-stepper-navigation': { template: '<div><slot /></div>' },
  'q-option-group': { template: '<div><slot /></div>', props: ['modelValue', 'options'] },
  'q-option': { template: '<div><slot /></div>' }
}

function mountPage() {
  return quasarMount(ComunicazioniPage, { global: { stubs: extraStubs } })
}

describe('ComunicazioniPage — filtro "Contatto singolo"', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetFamiglieContatti.mockResolvedValue({ data: { data: [] } })
  })

  it('carica i primi contatti con input vuoto (usa il callback di Quasar)', async () => {
    mockSearchContatti.mockResolvedValue({
      data: {
        data: [
          {
            id_contatto: 'c-1',
            Nome: 'Mario',
            Cognome: 'Rossi',
            email: [{ email_address: 'mario@x.it', Primary: true }]
          }
        ]
      }
    })
    const wrapper = mountPage()

    await wrapper.vm.filterContatti('', fn => fn())

    expect(mockSearchContatti).toHaveBeenCalledWith('')
    expect(wrapper.vm.contattiOptions).toEqual([{ label: 'Mario Rossi (mario@x.it)', value: 'c-1' }])
  })

  it('filtra i contatti con input valorizzato', async () => {
    mockSearchContatti.mockResolvedValue({
      data: { data: [{ id_contatto: 'c-2', Nome: 'Anna', Cognome: 'Verdi' }] }
    })
    const wrapper = mountPage()

    await wrapper.vm.filterContatti('ann', fn => fn())

    expect(mockSearchContatti).toHaveBeenCalledWith('ann')
    expect(wrapper.vm.contattiOptions).toEqual([{ label: 'Anna Verdi', value: 'c-2' }])
  })

  it('svuota le opzioni in caso di errore', async () => {
    mockSearchContatti.mockRejectedValue(new Error('boom'))
    const wrapper = mountPage()
    wrapper.vm.contattiOptions = [{ label: 'x', value: 1 }]

    await wrapper.vm.filterContatti('a', fn => fn())

    expect(wrapper.vm.contattiOptions).toEqual([])
  })
})
