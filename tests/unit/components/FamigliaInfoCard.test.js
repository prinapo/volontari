import { beforeEach, describe, expect, it, vi } from 'vitest'
import { quasarMount } from '../quasar-mount'
import FamigliaInfoCard from 'src/components/Famiglia/FamigliaInfoCard.vue'

const mockUpdateIBAN = vi.fn()
const mockNotifySuccess = vi.fn()
const mockNotifyError = vi.fn()

const famiglieState = {
  genitori: [],
  altriVolontari: [],
  iban: 'IT60X0542811101000000123456',
  intestatarioCC: 'Mario Rossi',
  error: null,
  updateIBAN: (...args) => mockUpdateIBAN(...args)
}

vi.mock('stores/famiglie.store', () => ({
  useFamiglieStore: () => famiglieState
}))

vi.mock('src/utils/notify', () => ({
  notifySuccess: (...args) => mockNotifySuccess(...args),
  notifyError: (...args) => mockNotifyError(...args)
}))

vi.mock('quasar', () => ({
  useQuasar: () => ({ notify: vi.fn() })
}))

vi.mock('components/Common/InlineEditableField.vue', () => ({
  default: {
    name: 'InlineEditableField',
    template: '<div class="inline-field"><slot /></div>',
    props: ['modelValue', 'label', 'readonly']
  }
}))

describe('FamigliaInfoCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    famiglieState.genitori = []
    famiglieState.altriVolontari = []
    famiglieState.iban = 'IT60X0542811101000000123456'
    famiglieState.intestatarioCC = 'Mario Rossi'
    famiglieState.error = null
  })

  it('renders famiglia name, genitori and volontari info', () => {
    famiglieState.genitori = [
      {
        id_contatto: 1,
        Nome: 'Anna',
        Cognome: 'Rossi',
        _emails: [{ email_address: 'anna@test.it', Primary: true }],
        Numero_di_cellulare: '+39333111222',
        Numero_di_telefono: '02123456'
      }
    ]
    famiglieState.altriVolontari = [
      {
        id_contatto: 2,
        Nome: 'Luca',
        Cognome: 'Bianchi',
        _emails: [{ email_address: 'luca@test.it', Primary: false }],
        Numero_di_cellulare: '+39333999888',
        _referenti: [{ id_contatto: 3, Nome: 'Ref', Cognome: 'Uno' }]
      }
    ]

    const wrapper = quasarMount(FamigliaInfoCard, {
      props: { famigliaName: 'Famiglia Test' }
    })

    expect(wrapper.text()).toContain('Famiglia Test')
    expect(wrapper.text()).toContain('Genitori')
    expect(wrapper.text()).toContain('Anna Rossi')
    expect(wrapper.text()).toContain('Altri volontari')
    expect(wrapper.text()).toContain('Luca Bianchi')
    expect(wrapper.text()).toContain('Referente: Ref Uno')
  })

  it('handleIBANSave notifies success when update succeeds', async () => {
    mockUpdateIBAN.mockResolvedValue(true)
    const wrapper = quasarMount(FamigliaInfoCard)

    await wrapper.vm.handleIBANSave('IT11X123')

    expect(mockUpdateIBAN).toHaveBeenCalledWith('IT11X123', 'Mario Rossi')
    expect(mockNotifySuccess).toHaveBeenCalled()
  })

  it('handleIntestatarioSave notifies error when update fails', async () => {
    famiglieState.error = 'Errore update'
    mockUpdateIBAN.mockResolvedValue(false)
    const wrapper = quasarMount(FamigliaInfoCard)

    await wrapper.vm.handleIntestatarioSave('Nuovo Intestatario')

    expect(mockUpdateIBAN).toHaveBeenCalledWith('IT60X0542811101000000123456', 'Nuovo Intestatario')
    expect(mockNotifyError).toHaveBeenCalled()
  })
})
