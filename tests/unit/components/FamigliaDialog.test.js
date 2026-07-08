import { beforeEach, describe, expect, it, vi } from 'vitest'
import { quasarMount } from '../quasar-mount'
import FamigliaDialog from 'src/components/Gestione/FamigliaDialog.vue'

const mockCreateFamiglia = vi.fn()
const mockUpdateFamiglia = vi.fn()
const mockNotifySuccess = vi.fn()
const mockNotifyError = vi.fn()

const gestioneState = {
  saving: false,
  error: null,
  createFamiglia: (...args) => mockCreateFamiglia(...args),
  updateFamiglia: (...args) => mockUpdateFamiglia(...args)
}

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

describe('FamigliaDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    gestioneState.error = null
  })

  it('renders create mode title', async () => {
    const wrapper = quasarMount(FamigliaDialog, { props: { modelValue: false } })
    await wrapper.setProps({ modelValue: true })
    expect(wrapper.text()).toContain('Nuova Famiglia')
  })

  it('prefills form in edit mode', async () => {
    const wrapper = quasarMount(FamigliaDialog, {
      props: {
        modelValue: false,
        editItem: {
          id_famiglia: 'fam-1',
          Nome_Famiglia: 'Famiglia Rossi',
          IBAN: 'IT60X0542811101000000123456',
          Intestatario_CC: 'Mario Rossi'
        }
      }
    })

    await wrapper.setProps({ modelValue: true })
    expect(wrapper.vm.form.Nome_Famiglia).toBe('Famiglia Rossi')
    expect(wrapper.vm.form.Intestatario_CC).toBe('Mario Rossi')
  })

  it('creates famiglia and emits saved on success', async () => {
    mockCreateFamiglia.mockResolvedValue(true)
    const wrapper = quasarMount(FamigliaDialog, { props: { modelValue: true } })
    wrapper.vm.form.Nome_Famiglia = 'Famiglia Test'
    wrapper.vm.form.IBAN = 'IT60X0542811101000000123456'
    wrapper.vm.form.Intestatario_CC = 'Mario Rossi'

    await wrapper.vm.handleSave()

    expect(mockCreateFamiglia).toHaveBeenCalledWith({
      Nome_Famiglia: 'Famiglia Test',
      IBAN: 'IT60X0542811101000000123456',
      Intestatario_CC: 'Mario Rossi'
    })
    expect(wrapper.emitted('saved')).toBeTruthy()
    expect(mockNotifySuccess).toHaveBeenCalled()
  })

  it('updates famiglia and notifies error on failure', async () => {
    gestioneState.error = 'Errore update'
    mockUpdateFamiglia.mockResolvedValue(false)
    const wrapper = quasarMount(FamigliaDialog, {
      props: {
        modelValue: true,
        editItem: { id_famiglia: 'fam-1', Nome_Famiglia: 'Famiglia Rossi' }
      }
    })

    wrapper.vm.form.Nome_Famiglia = 'Famiglia Nuova'
    await wrapper.vm.handleSave()

    expect(mockUpdateFamiglia).toHaveBeenCalledWith('fam-1', {
      Nome_Famiglia: 'Famiglia Nuova',
      IBAN: null,
      Intestatario_CC: null
    })
    expect(mockNotifyError).toHaveBeenCalled()
  })
})
