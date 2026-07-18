import { beforeEach, describe, expect, it, vi } from 'vitest'
import { quasarMount } from '../quasar-mount'
import RiconciliazionePage from 'src/pages/RiconciliazionePage.vue'

const mockFetchSubmissions = vi.fn()
const mockReconcileSubmission = vi.fn()
const mockScartaSubmission = vi.fn()
const mockRipristinaSubmission = vi.fn()
const mockAssignToFamiglia = vi.fn()
const mockUpdateSubmission = vi.fn()
const mockNotifySuccess = vi.fn()
const mockNotifyError = vi.fn()
const mockQNotify = vi.fn()

let onOkHandler = null

const verificaState = {
  includeScartati: false,
  submissionsLoading: false,
  submissionsTotalCount: 1,
  submissions: [
    {
      id: 'sub-1',
      email: 'test@test.it',
      nome_richiedente: 'Mario',
      cognome_richiedente: 'Rossi',
      descrizione: 'Descrizione lunga',
      telefono: '+3912345',
      importo: 100,
      data_invio: '2026-01-01',
      stato: 'in_attesa',
      _detectState: 'linked',
      _foundContatto: { id_contatto: 'cont-1' },
      _famigliaId: 'fam-1'
    }
  ],
  fetchSubmissions: (...args) => mockFetchSubmissions(...args),
  reconcileSubmission: (...args) => mockReconcileSubmission(...args),
  scartaSubmission: (...args) => mockScartaSubmission(...args),
  ripristinaSubmission: (...args) => mockRipristinaSubmission(...args)
}

const gestioneState = {
  assignToFamiglia: (...args) => mockAssignToFamiglia(...args)
}

vi.mock('stores/verifica.store', () => ({
  useVerificaStore: () => verificaState
}))

vi.mock('stores/gestione.store', () => ({
  useGestioneStore: () => gestioneState
}))

vi.mock('src/services/verifica.service', () => ({
  verificaService: { updateSubmission: (...args) => mockUpdateSubmission(...args) }
}))

vi.mock('src/utils/notify', () => ({
  notifySuccess: (...args) => mockNotifySuccess(...args),
  notifyError: (...args) => mockNotifyError(...args)
}))

vi.mock('src/utils/assets', () => ({ assetUrl: id => `/assets/${id}` }))
vi.mock('src/utils/formatters', () => ({
  formatCurrency: value => `€${value}`,
  formatDate: value => value
}))

vi.mock('quasar', () => ({
  useQuasar: () => ({
    screen: { lt: { sm: false } },
    notify: (...args) => mockQNotify(...args),
    dialog: () => ({
      onOk(callback) {
        onOkHandler = callback
        return this
      }
    })
  })
}))

vi.mock('components/Gestione/AssegnaFamigliaDialog.vue', () => ({
  default: { name: 'AssegnaFamigliaDialog', template: '<div>AssegnaFamigliaDialog Stub</div>', props: ['modelValue', 'contatto', 'ruolo'] }
}))
vi.mock('components/Gestione/ContattoDialog.vue', () => ({
  default: { name: 'ContattoDialog', template: '<div>ContattoDialog Stub</div>', props: ['modelValue', 'initialData'] }
}))
vi.mock('components/RiconciliaDialog.vue', () => ({
  default: { name: 'RiconciliaDialog', template: '<div>RiconciliaDialog Stub</div>', props: ['modelValue', 'submission'] }
}))

describe('RiconciliazionePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    onOkHandler = null
    verificaState.includeScartati = false
    verificaState.submissionsLoading = false
    verificaState.submissionsTotalCount = 1
    verificaState.submissions = [
      {
        id: 'sub-1',
        email: 'test@test.it',
        nome_richiedente: 'Mario',
        cognome_richiedente: 'Rossi',
        descrizione: 'Descrizione lunga da mostrare nel dialog',
        telefono: '+3912345',
        importo: 100,
        data_invio: '2026-01-01',
        stato: 'in_attesa',
        _detectState: 'linked',
        _foundContatto: { id_contatto: 'cont-1' },
        _famigliaId: 'fam-1'
      }
    ]
  })

  it('renders page title and loads submissions on mount', () => {
    const wrapper = quasarMount(RiconciliazionePage)
    expect(wrapper.text()).toContain('Da riconciliare')
    expect(mockFetchSubmissions).toHaveBeenCalledWith({ page: 1, limit: 25 })
  })

  it('opens dialogs and computes initial contact data', async () => {
    const wrapper = quasarMount(RiconciliazionePage)
    const submission = verificaState.submissions[0]

    wrapper.vm.openRiconcilia(submission)
    wrapper.vm.openCreaContatto(submission)
    wrapper.vm.openAssociaFamiglia(submission)
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.riconciliaDialog).toBe(true)
    expect(wrapper.vm.contattoDialogVisible).toBe(true)
    expect(wrapper.vm.assegnaDialogVisible).toBe(true)
    expect(wrapper.vm.contattoInitialData.Email).toBe('test@test.it')
  })

  it('resets page to first page when toggle changes', () => {
    const wrapper = quasarMount(RiconciliazionePage)
    wrapper.vm.pagination.page = 3
    wrapper.vm.onToggleScartati(true)
    expect(wrapper.vm.pagination.page).toBe(1)
  })

  it('updates submission email and reloads data', async () => {
    mockUpdateSubmission.mockResolvedValue({})
    const wrapper = quasarMount(RiconciliazionePage)
    const submission = { id: 'sub-1', email: 'new@test.it' }

    await wrapper.vm.handleEmailEdit(submission)

    expect(mockUpdateSubmission).toHaveBeenCalledWith('sub-1', { email: 'new@test.it' })
    expect(mockFetchSubmissions).toHaveBeenCalledTimes(2)
  })

  it('associates as parent and notifies success', async () => {
    mockAssignToFamiglia.mockResolvedValue({})
    const wrapper = quasarMount(RiconciliazionePage)

    await wrapper.vm.handleAssociaGenitore({
      _foundContatto: { id_contatto: 'cont-1' },
      _famigliaId: 'fam-1'
    })

    expect(mockAssignToFamiglia).toHaveBeenCalledWith('cont-1', 'fam-1', 'Genitore')
    expect(mockNotifySuccess).toHaveBeenCalled()
  })

  it('reconciles submission and closes dialog', async () => {
    mockReconcileSubmission.mockResolvedValue({})
    const wrapper = quasarMount(RiconciliazionePage)
    wrapper.vm.riconciliaDialog = true
    wrapper.vm.reconcilingSubmission = { id: 'sub-1' }

    await wrapper.vm.handleRiconcilia({ id: 'sub-1' })

    expect(mockReconcileSubmission).toHaveBeenCalledWith({ id: 'sub-1' })
    expect(wrapper.vm.riconciliaDialog).toBe(false)
    expect(wrapper.vm.reconcilingSubmission).toBe(null)
  })

  it('handles created contact by closing dialog and reloading', async () => {
    const wrapper = quasarMount(RiconciliazionePage)
    wrapper.vm.contattoDialogVisible = true
    wrapper.vm.submissionForContatto = { id: 'sub-1' }

    wrapper.vm.handleContattoCreated()
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.contattoDialogVisible).toBe(false)
    expect(wrapper.vm.submissionForContatto).toBe(null)
    expect(mockFetchSubmissions).toHaveBeenCalledTimes(2)
  })

  it('scarta submission with note and warns when note is missing', async () => {
    mockScartaSubmission.mockResolvedValue({})
    const wrapper = quasarMount(RiconciliazionePage)

    wrapper.vm.handleScarta({ id: 'sub-1' })
    expect(onOkHandler).toBeTypeOf('function')

    await onOkHandler('')
    expect(mockQNotify).toHaveBeenCalledWith({ type: 'warning', message: 'Inserisci una motivazione' })

    await onOkHandler('Motivo test')
    expect(mockScartaSubmission).toHaveBeenCalledWith('sub-1', 'Motivo test')
  })

  it('ripristina submission and computes card colors', async () => {
    mockRipristinaSubmission.mockResolvedValue({})
    const wrapper = quasarMount(RiconciliazionePage)

    await wrapper.vm.handleRipristina({ id: 'sub-1' })

    expect(mockRipristinaSubmission).toHaveBeenCalledWith('sub-1')
    expect(wrapper.vm.cardStateColor('linked', 'in_attesa')).toBe('var(--q-positive)')
    expect(wrapper.vm.cardStateColor('whatever', 'scartato')).toBe('#bdbdbd')
  })
})
