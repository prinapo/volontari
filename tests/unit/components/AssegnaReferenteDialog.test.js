import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { quasarMount } from '../quasar-mount'
import AssegnaReferenteDialog from 'src/components/Gestione/AssegnaReferenteDialog.vue'

async function flushDialog() {
  await nextTick()
  await Promise.resolve()
  await nextTick()
}

const mockQuery = vi.fn()
const mockGetByVolontario = vi.fn()
const mockAssignReferente = vi.fn()
const mockRemoveReferente = vi.fn()
const mockNotifySuccess = vi.fn()
const mockNotifyError = vi.fn()

const gestioneState = {
  error: null,
  assignReferente: (...args) => mockAssignReferente(...args),
  removeReferente: (...args) => mockRemoveReferente(...args)
}

vi.mock('src/services/contatti.service', () => ({
  contattiService: { query: (...args) => mockQuery(...args) }
}))

vi.mock('src/services/referenti.service', () => ({
  referentiService: { getByVolontario: (...args) => mockGetByVolontario(...args) }
}))

vi.mock('stores/gestione.store', () => ({
  useGestioneStore: () => gestioneState
}))

vi.mock('src/utils/notify', () => ({
  notifySuccess: (...args) => mockNotifySuccess(...args),
  notifyError: (...args) => mockNotifyError(...args)
}))

vi.mock('quasar', () => ({
  useQuasar: () => ({ notify: vi.fn() })
}))

describe('AssegnaReferenteDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    gestioneState.error = null
    mockGetByVolontario.mockResolvedValue({
      data: { data: [{ id: 'rel-1', Referente: { id_contatto: 'ref-1', Nome: 'Anna', Cognome: 'Verdi' } }] }
    })
  })

  it('loads assigned referenti when opened', async () => {
    const wrapper = quasarMount(AssegnaReferenteDialog, {
      props: {
        modelValue: false,
        volontario: { id_contatto: 'vol-1', Nome: 'Mario', Cognome: 'Rossi' }
      }
    })

    await wrapper.setProps({ modelValue: true })
    await flushDialog()
    expect(mockGetByVolontario).toHaveBeenCalledWith('vol-1')
    expect(wrapper.vm.assignedReferenti).toHaveLength(1)
  })

  it('filters available referenti excluding already assigned ones', async () => {
    mockQuery.mockResolvedValue({
      data: {
        data: [
          { id_contatto: 'ref-1', Nome: 'Anna', Cognome: 'Verdi' },
          { id_contatto: 'ref-2', Nome: 'Luca', Cognome: 'Bianchi' }
        ]
      }
    })
    const wrapper = quasarMount(AssegnaReferenteDialog, {
      props: { modelValue: false, volontario: { id_contatto: 'vol-1' } }
    })
    await wrapper.setProps({ modelValue: true })
    await flushDialog()

    await wrapper.vm.filterReferenti('Lu', async fn => {
      await fn()
    })

    expect(wrapper.vm.referenteOptions).toEqual([{ label: 'Luca Bianchi', value: 'ref-2' }])
  })

  it('adds referente and emits saved on success', async () => {
    mockAssignReferente.mockResolvedValue(true)
    const wrapper = quasarMount(AssegnaReferenteDialog, {
      props: { modelValue: false, volontario: { id_contatto: 'vol-1' } }
    })
    await wrapper.setProps({ modelValue: true })
    await flushDialog()
    wrapper.vm.selectedReferente = 'ref-2'

    await wrapper.vm.addReferente()

    expect(mockAssignReferente).toHaveBeenCalledWith('vol-1', 'ref-2')
    expect(mockNotifySuccess).toHaveBeenCalled()
    expect(wrapper.emitted('saved')).toBeTruthy()
  })

  it('removes referente and reports error on failure', async () => {
    gestioneState.error = 'Errore remove'
    mockRemoveReferente.mockResolvedValue(false)
    const wrapper = quasarMount(AssegnaReferenteDialog, {
      props: { modelValue: false, volontario: { id_contatto: 'vol-1' } }
    })
    await wrapper.setProps({ modelValue: true })
    await flushDialog()

    await wrapper.vm.removeReferente({ id: 'rel-1' })

    expect(mockRemoveReferente).toHaveBeenCalledWith('rel-1')
    expect(mockNotifyError).toHaveBeenCalled()
  })
})
