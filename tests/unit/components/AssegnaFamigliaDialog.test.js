import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { quasarMount } from '../quasar-mount'
import AssegnaFamigliaDialog from 'src/components/Gestione/AssegnaFamigliaDialog.vue'

async function flushDialog() {
  await nextTick()
  await Promise.resolve()
  await nextTick()
}

const mockGetFamiglieByContatto = vi.fn()
const mockGetFamiglie = vi.fn()
const mockSearchFamiglie = vi.fn()
const mockAssignToFamiglia = vi.fn()
const mockRemoveFromFamiglia = vi.fn()
const mockNotifySuccess = vi.fn()
const mockNotifyError = vi.fn()

const gestioneState = {
  error: null,
  assignToFamiglia: (...args) => mockAssignToFamiglia(...args),
  removeFromFamiglia: (...args) => mockRemoveFromFamiglia(...args)
}

vi.mock('src/services/gestione.service', () => ({
  gestioneService: {
    getFamiglieByContatto: (...args) => mockGetFamiglieByContatto(...args),
    getFamiglie: (...args) => mockGetFamiglie(...args),
    searchFamiglie: (...args) => mockSearchFamiglie(...args)
  }
}))

vi.mock('stores/gestione.store', () => ({
  useGestioneStore: () => gestioneState
}))

vi.mock('src/utils/notify', () => ({
  notifySuccess: (...args) => mockNotifySuccess(...args),
  notifyError: (...args) => mockNotifyError(...args)
}))

vi.mock('quasar', () => ({
  useQuasar: () => ({ screen: { lt: { sm: false } }, notify: vi.fn() })
}))

describe('AssegnaFamigliaDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    gestioneState.error = null
    mockGetFamiglieByContatto.mockResolvedValue({
      data: { data: [{ id: 'fc-1', Famiglia: { Nome_Famiglia: 'Famiglia Uno' }, Ruolo_nella_Famiglia: 'Volontario' }] }
    })
  })

  it('loads assigned families when opened', async () => {
    const wrapper = quasarMount(AssegnaFamigliaDialog, {
      props: { modelValue: false, contatto: { id_contatto: 'cont-1' } }
    })

    await wrapper.setProps({ modelValue: true })
    await flushDialog()
    expect(mockGetFamiglieByContatto).toHaveBeenCalledWith('cont-1')
    expect(wrapper.vm.famiglie).toHaveLength(1)
  })

  it('filters all families or searched families', async () => {
    mockGetFamiglie.mockResolvedValue({ data: { data: [{ id_famiglia: 'fam-1', Nome_Famiglia: 'Uno' }] } })
    mockSearchFamiglie.mockResolvedValue({ data: { data: [{ id_famiglia: 'fam-2', Nome_Famiglia: 'Due' }] } })
    const wrapper = quasarMount(AssegnaFamigliaDialog, {
      props: { modelValue: false, contatto: { id_contatto: 'cont-1' } }
    })

    await wrapper.vm.filterFamiglie('', async fn => {
      await fn()
    })
    await flushDialog()
    expect(wrapper.vm.famigliaOptions[0].Nome_Famiglia).toBe('Uno')

    await wrapper.vm.filterFamiglie('Du', async fn => {
      await fn()
    })
    await flushDialog()
    expect(wrapper.vm.famigliaOptions[0].Nome_Famiglia).toBe('Due')
  })

  it('assigns selected family successfully', async () => {
    mockAssignToFamiglia.mockResolvedValue(true)
    const wrapper = quasarMount(AssegnaFamigliaDialog, {
      props: { modelValue: false, contatto: { id_contatto: 'cont-1' } }
    })
    await wrapper.setProps({ modelValue: true })
    await flushDialog()
    wrapper.vm.selectedFamiglia = 'fam-2'
    wrapper.vm.selectedRuolo = 'Genitore'

    await wrapper.vm.handleAssign()

    expect(mockAssignToFamiglia).toHaveBeenCalledWith('cont-1', 'fam-2', 'Genitore')
    expect(mockNotifySuccess).toHaveBeenCalled()
  })

  it('removes assigned family and reports error on failure', async () => {
    gestioneState.error = 'Errore remove'
    mockRemoveFromFamiglia.mockResolvedValue(false)
    const wrapper = quasarMount(AssegnaFamigliaDialog, {
      props: { modelValue: false, contatto: { id_contatto: 'cont-1' } }
    })
    await wrapper.setProps({ modelValue: true })
    await flushDialog()

    await wrapper.vm.handleRemove({ id: 'fc-1', Ruolo_nella_Famiglia: 'Volontario' })

    expect(mockRemoveFromFamiglia).toHaveBeenCalledWith('fc-1', 'cont-1', 'Volontario')
    expect(mockNotifyError).toHaveBeenCalled()
  })
})
