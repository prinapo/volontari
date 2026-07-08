import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { quasarMount } from '../quasar-mount'
import VerificaPage from 'src/pages/VerificaPage.vue'

const mockFetchAnni = vi.fn()
const mockFetchAllPages = vi.fn()
const mockLoadFamigliaContacts = vi.fn()
const mockUpdateBancari = vi.fn()
const mockFetchAll = vi.fn()
const mockVerifyGiustificativo = vi.fn()
const mockUpdateGiustificativoField = vi.fn()
const mockAddGiustificativo = vi.fn()
const mockRejectGiustificativo = vi.fn()
const mockChiudiProgetto = vi.fn()
const mockNotifySuccess = vi.fn()
const mockNotifyError = vi.fn()
const mockQNotify = vi.fn()

const verificaState = {
  rows: [],
  anniBando: [],
  loading: false,
  fetchAnni: (...a) => mockFetchAnni(...a),
  fetchAllPages: (...a) => mockFetchAllPages(...a),
  loadFamigliaContacts: (...a) => mockLoadFamigliaContacts(...a),
  updateBancari: (...a) => mockUpdateBancari(...a),
  fetchAll: (...a) => mockFetchAll(...a),
  verifyGiustificativo: (...a) => mockVerifyGiustificativo(...a),
  updateGiustificativoField: (...a) => mockUpdateGiustificativoField(...a),
  addGiustificativo: (...a) => mockAddGiustificativo(...a),
  rejectGiustificativo: (...a) => mockRejectGiustificativo(...a)
}

const authState = { canVerifica: true, initialized: true }

vi.mock('stores/verifica.store', () => ({
  useVerificaStore: () => verificaState
}))

vi.mock('stores/auth.store', () => ({
  useAuthStore: () => authState
}))

vi.mock('stores/pagamenti.store', () => ({
  usePagamentiStore: () => ({ chiudiProgetto: (...a) => mockChiudiProgetto(...a) })
}))

vi.mock('src/utils/notify', () => ({
  notifyError: (...a) => mockNotifyError(...a),
  notifySuccess: (...a) => mockNotifySuccess(...a)
}))

vi.mock('src/utils/formatters', () => ({
  formatCurrency: v => `€${v}`,
  formatDate: v => v,
  statoLabel: s => s,
  statoColor: () => 'primary'
}))

vi.mock('quasar', () => ({
  copyToClipboard: vi.fn(),
  useQuasar: () => ({
    notify: (...a) => mockQNotify(...a),
    platform: { is: { mobile: false } },
    screen: { width: 1024, sm: true, md: true, lt: { sm: false, md: false }, gt: { sm: true } }
  })
}))

vi.mock('src/utils/assets', () => ({ assetUrl: id => `/assets/${id}` }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }), useRoute: () => ({ name: 'Verifica' }) }))

async function flushAll() {
  await nextTick()
  await Promise.resolve()
  await nextTick()
}

function mountPage() {
  return quasarMount(VerificaPage, {
    global: {
      stubs: {
        PagamentiTab: { template: '<div />' },
        BancariDialog: { template: '<div />' },
        ContattoInfoLine: { template: '<div />' },
        InlineEditableField: { template: '<div />' },
        GiustificativoForm: { template: '<div />' },
        ProgettoDetailDialog: { template: '<div />' }
      }
    }
  })
}

describe('VerificaPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    verificaState.rows = []
    verificaState.anniBando = [2025, 2026]
    verificaState.loading = false
  })

  it('renders title, fetches on mount and computes totals', () => {
    verificaState.rows = [
      {
        idProgetto: 'p1',
        famiglia: 'Fam 1',
        totaleRendicontato: 100,
        totaleRimborsabile: 80,
        iban: 'IT',
        intestatario: 'Mario',
        giustificativi: []
      },
      {
        idProgetto: 'p2',
        famiglia: 'Fam 2',
        totaleRendicontato: 50,
        totaleRimborsabile: 40,
        iban: '',
        intestatario: '',
        giustificativi: [{ Stato: 'inviato' }]
      }
    ]
    const wrapper = mountPage()
    expect(wrapper.text()).toContain('Verifica')
    expect(mockFetchAnni).toHaveBeenCalled()
    expect(mockFetchAllPages).toHaveBeenCalled()
    expect(wrapper.vm.selectedTotals).toEqual({ rendicontato: 150, rimborsabile: 120 })
    expect(wrapper.vm.prontiCount).toBe(1)
    expect(wrapper.vm.annoOptions).toEqual([
      { label: '2025', value: 2025 },
      { label: '2026', value: 2026 }
    ])
  })

  it('loadData reacts to search and year filters', async () => {
    const wrapper = mountPage()
    wrapper.vm.search = 'rossi'
    wrapper.vm.selectedAnno = 2026
    await wrapper.vm.loadData()
    expect(mockFetchAllPages).toHaveBeenLastCalledWith({ search: 'rossi', anno: 2026 })

    wrapper.vm.search = ''
    wrapper.vm.selectedAnno = null
    await flushAll()
    expect(mockFetchAllPages).toHaveBeenCalledWith({ search: undefined, anno: undefined })
  })

  it('covers row state helpers across branches', () => {
    const wrapper = mountPage()
    expect(wrapper.vm.statoRiga({ totaleRendicontato: 0, iban: '', intestatario: '', giustificativi: [] })).toEqual({
      label: 'Non ricevuta',
      color: 'grey'
    })
    expect(wrapper.vm.statoRiga({ totaleRendicontato: 100, iban: '', intestatario: '', giustificativi: [] })).toEqual({
      label: 'Dati bancari mancanti',
      color: 'warning'
    })
    expect(
      wrapper.vm.statoRiga({
        totaleRendicontato: 100,
        iban: 'IT',
        intestatario: 'Mario',
        giustificativi: [{ Stato: 'inviato', Invalidato: false }]
      })
    ).toEqual({ label: 'Da verificare', color: 'orange' })
    expect(
      wrapper.vm.statoRiga({
        totaleRendicontato: 100,
        iban: 'IT',
        intestatario: 'Mario',
        giustificativi: [{ Stato: 'verificato', Invalidato: false }]
      })
    ).toEqual({ label: 'Pronto', color: 'positive' })
    expect(
      wrapper.vm.statoRiga({
        totaleRendicontato: 100,
        iban: 'IT',
        intestatario: 'Mario',
        giustificativi: [{ Stato: 'draft', Invalidato: false }]
      })
    ).toEqual({ label: 'Da completare', color: 'warning' })
    expect(wrapper.vm.hasPendingGiustificativi({ giustificativi: [{ Stato: 'inviato' }] })).toBe(true)
    expect(wrapper.vm.totalGiustificativi({ giustificativi: [{ Invalidato: false }, { Invalidato: true }] })).toBe(1)
    expect(wrapper.vm.allVerified({ giustificativi: [{ Stato: 'verificato', Invalidato: false }] })).toBe(true)
  })

  it('loads family contacts, caches them and handles failures', async () => {
    mockLoadFamigliaContacts.mockResolvedValueOnce({ genitori: [{ id: 1 }], volontari: [{ id: 2 }] })
    mockLoadFamigliaContacts.mockRejectedValueOnce(new Error('boom'))
    const wrapper = mountPage()

    await wrapper.vm.loadFamigliaContatti(null)
    expect(mockLoadFamigliaContacts).not.toHaveBeenCalled()

    await wrapper.vm.loadFamigliaContatti('fam-1')
    expect(wrapper.vm.genitoriCache['fam-1']).toEqual([{ id: 1 }])
    expect(wrapper.vm.volontariCache['fam-1']).toEqual([{ id: 2 }])

    await wrapper.vm.loadFamigliaContatti('fam-1')
    expect(mockLoadFamigliaContacts).toHaveBeenCalledTimes(1)

    await wrapper.vm.loadFamigliaContatti('fam-2')
    expect(wrapper.vm.genitoriCache['fam-2']).toEqual([])
    expect(wrapper.vm.volontariCache['fam-2']).toEqual([])
  })

  it('toggles expansion and manages bancari dialog save success/error', async () => {
    mockUpdateBancari.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('boom'))
    const wrapper = mountPage()
    const props = { expand: false, row: { idFamiglia: 'fam-1' } }

    wrapper.vm.toggleExpand(props)
    expect(props.expand).toBe(true)

    wrapper.vm.openBancariDialog({ idFamiglia: 'fam-1' })
    expect(wrapper.vm.bancariDialog).toBe(true)
    expect(wrapper.vm.editingRow).toEqual({ idFamiglia: 'fam-1' })

    await wrapper.vm.saveBancari({ iban: 'IT', intestatario: 'Mario' })
    expect(mockUpdateBancari).toHaveBeenCalledWith('fam-1', { iban: 'IT', intestatario: 'Mario' })
    expect(wrapper.vm.bancariDialog).toBe(false)

    wrapper.vm.openBancariDialog({ idFamiglia: 'fam-2' })
    await wrapper.vm.saveBancari({ iban: 'IT2', intestatario: 'Anna' })
    expect(mockNotifyError).toHaveBeenCalled()
  })

  it('handles closing project and verification flows', async () => {
    mockChiudiProgetto.mockResolvedValue({})
    mockVerifyGiustificativo.mockResolvedValue({})
    mockUpdateGiustificativoField.mockResolvedValue({})
    const wrapper = mountPage()

    wrapper.vm.openChiudiProgetto({ idProgetto: 'p1' })
    wrapper.vm.chiudiProgettoNota = 'completato'
    await wrapper.vm.handleChiudiProgetto()
    expect(mockChiudiProgetto).toHaveBeenCalledWith('p1', { automatica: false, motivo: 'completato' })
    expect(mockFetchAll).toHaveBeenCalled()

    await wrapper.vm.handleVerify('p1', { id: 'g1' })
    expect(mockVerifyGiustificativo).toHaveBeenCalledWith('p1', 'g1')

    await wrapper.vm.handleSendDraft('p1', { id: 'g2' })
    expect(mockUpdateGiustificativoField).toHaveBeenCalledWith('p1', 'g2', 'Stato', 'inviato')
  })

  it('handles reject, field save, add save and row detail', async () => {
    mockUpdateGiustificativoField.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('boom'))
    mockAddGiustificativo.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('boom'))
    mockRejectGiustificativo.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('boom'))
    const wrapper = mountPage()

    wrapper.vm.handleReject('p1', { id: 'g1' })
    expect(wrapper.vm.rejectDialog).toBe(true)
    expect(wrapper.vm.rejectProgettoId).toBe('p1')

    await wrapper.vm.confirmReject()
    expect(mockRejectGiustificativo).not.toHaveBeenCalled()

    wrapper.vm.rejectNota = 'non valido'
    await wrapper.vm.confirmReject()
    expect(mockRejectGiustificativo).toHaveBeenCalledWith('p1', 'g1', 'non valido')
    expect(mockQNotify).toHaveBeenCalledWith({ type: 'warning', message: 'Giustificativo rifiutato' })

    wrapper.vm.handleReject('p2', { id: 'g2' })
    wrapper.vm.rejectNota = 'errore'
    await wrapper.vm.confirmReject()
    expect(mockNotifyError).toHaveBeenCalled()

    await wrapper.vm.handleFieldSave('p1', { id: 'g3' }, 'Descrizione', 'Nuova')
    expect(mockUpdateGiustificativoField).toHaveBeenCalledWith('p1', 'g3', 'Descrizione', 'Nuova')

    await wrapper.vm.handleFieldSave('p1', { id: 'g4' }, 'Importo', 10)
    expect(mockNotifyError).toHaveBeenCalled()

    wrapper.vm.addingForRow = { idProgetto: 'p1' }
    const file = new File(['a'], 'doc.pdf')
    await wrapper.vm.handleAddSave({ Descrizione: 'Nuovo', File: file })
    expect(mockAddGiustificativo).toHaveBeenCalledWith({ Descrizione: 'Nuovo', File: file }, file)
    expect(wrapper.vm.addingForRow).toBe(null)

    wrapper.vm.addingForRow = { idProgetto: 'p1' }
    await wrapper.vm.handleAddSave({ Descrizione: 'Nuovo', File: file })
    expect(mockNotifyError).toHaveBeenCalled()

    wrapper.vm.openRowDetail({ idProgetto: 'p9' })
    expect(wrapper.vm.selectedProgetto).toBe('p9')
    expect(wrapper.vm.detailDialog).toBe(true)
  })
})
