import { beforeEach, describe, expect, it, vi } from 'vitest'
import { quasarMount } from '../quasar-mount'
import SubmitPage from 'src/pages/SubmitPage.vue'

const mockUploadFile = vi.fn()
const mockCreateSubmission = vi.fn()
const mockNotifySuccess = vi.fn()
const mockNotifyError = vi.fn()

vi.mock('quasar', () => ({
  useQuasar: () => ({ notify: vi.fn() })
}))

vi.mock('components/Giustificativi/GiustificativoFilePicker.vue', () => ({
  default: {
    name: 'GiustificativoFilePicker',
    template: '<div>GiustificativoFilePicker Stub</div>',
    props: ['modelValue'],
    methods: {
      touch() {}
    }
  }
}))

vi.mock('src/services/submit.service', () => ({
  submitService: {
    uploadFile: (...args) => mockUploadFile(...args),
    createSubmission: (...args) => mockCreateSubmission(...args)
  }
}))

vi.mock('src/utils/notify', () => ({
  notifySuccess: (...args) => mockNotifySuccess(...args),
  notifyError: (...args) => mockNotifyError(...args)
}))

describe('SubmitPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUploadFile.mockResolvedValue({ data: { data: { id: 'file-1' } } })
    mockCreateSubmission.mockResolvedValue({})
  })

  it('adds and removes giustificativi', () => {
    const wrapper = quasarMount(SubmitPage)

    wrapper.vm.addGiustificativo()
    wrapper.vm.addGiustificativo()
    expect(wrapper.vm.giustificativi).toHaveLength(2)

    wrapper.vm.removeGiustificativo(0)
    expect(wrapper.vm.giustificativi).toHaveLength(1)
  })

  it('computes canSubmit correctly', () => {
    const wrapper = quasarMount(SubmitPage)
    wrapper.vm.form.iban = 'IT60X0542811101000000123456'
    wrapper.vm.addGiustificativo()
    expect(wrapper.vm.canSubmit).toBe(false)

    Object.assign(wrapper.vm.giustificativi[0], {
      descrizione: 'Spesa',
      importo: '50',
      file: new File(['a'], 'test.pdf')
    })
    expect(wrapper.vm.canSubmit).toBe(true)
  })

  it('submits giustificativi and resets form on success', async () => {
    const wrapper = quasarMount(SubmitPage)
    Object.assign(wrapper.vm.form, {
      nome_richiedente: 'Mario',
      cognome_richiedente: 'Rossi',
      email: 'mario@test.it',
      telefono: '+39123',
      iban: 'IT60X0542811101000000123456',
      intestatario: 'Mario Rossi',
      nome_beneficiario: 'Luca',
      cognome_beneficiario: 'Rossi'
    })
    wrapper.vm.addGiustificativo()
    Object.assign(wrapper.vm.giustificativi[0], {
      descrizione: 'Spesa medica',
      importo: '50',
      file: new File(['a'], 'uno.pdf')
    })
    wrapper.vm.setFilePickerRef(0, { touch: vi.fn() })

    await wrapper.vm.handleSubmit()

    expect(mockUploadFile).toHaveBeenCalled()
    expect(mockCreateSubmission).toHaveBeenCalledWith(
      expect.objectContaining({
        descrizione: 'Spesa medica',
        importo: 50,
        allegato: 'file-1',
        stato: 'in_attesa'
      })
    )
    expect(mockNotifySuccess).toHaveBeenCalled()
    expect(wrapper.vm.giustificativi).toHaveLength(0)
  })

  it('returns early when form validation fails after touching file pickers', async () => {
    const wrapper = quasarMount(SubmitPage)
    const touch = vi.fn()
    wrapper.vm.addGiustificativo()
    wrapper.vm.setFilePickerRef(0, { touch })
    wrapper.vm.formRef = { validate: vi.fn().mockResolvedValue(false) }

    await wrapper.vm.handleSubmit()

    expect(touch).toHaveBeenCalled()
    expect(mockUploadFile).not.toHaveBeenCalled()
  })

  it('resets form fields explicitly', () => {
    const wrapper = quasarMount(SubmitPage)
    Object.assign(wrapper.vm.form, {
      nome_richiedente: 'Mario',
      cognome_richiedente: 'Rossi',
      email: 'mario@test.it',
      telefono: '+39123',
      iban: 'IT60X0542811101000000123456',
      intestatario: 'Mario Rossi',
      nome_beneficiario: 'Luca',
      cognome_beneficiario: 'Rossi'
    })
    wrapper.vm.addGiustificativo()

    wrapper.vm.resetForm()

    expect(wrapper.vm.form.nome_richiedente).toBe('')
    expect(wrapper.vm.form.cognome_richiedente).toBe('')
    expect(wrapper.vm.form.email).toBe('')
    expect(wrapper.vm.form.telefono).toBe('')
    expect(wrapper.vm.form.iban).toBe('')
    expect(wrapper.vm.giustificativi).toEqual([])
  })

  it('maps error statuses to user-friendly notifications', async () => {
    const wrapper = quasarMount(SubmitPage)
    wrapper.vm.addGiustificativo()
    wrapper.vm.setFilePickerRef(0, { touch: vi.fn() })
    Object.assign(wrapper.vm.form, {
      iban: 'IT60X0542811101000000123456'
    })
    Object.assign(wrapper.vm.giustificativi[0], {
      descrizione: 'Spesa',
      importo: '50',
      file: new File(['a'], 'uno.pdf')
    })

    mockUploadFile.mockRejectedValueOnce({ response: { status: 413 } })
    await wrapper.vm.handleSubmit()
    expect(mockNotifyError).toHaveBeenLastCalledWith(
      expect.anything(),
      null,
      'Il file è troppo grande. Il limite è 5MB per file.'
    )

    mockUploadFile.mockRejectedValueOnce({ message: 'Network Error' })
    await wrapper.vm.handleSubmit()
    expect(mockNotifyError).toHaveBeenLastCalledWith(
      expect.anything(),
      null,
      'Errore di connessione. Controlla la rete e riprova.'
    )

    mockUploadFile.mockRejectedValueOnce({ response: { status: 403 } })
    await wrapper.vm.handleSubmit()
    expect(mockNotifyError).toHaveBeenLastCalledWith(
      expect.anything(),
      null,
      "Permessi insufficienti. Contatta l'amministratore."
    )

    mockUploadFile.mockRejectedValueOnce({ response: { status: 500 } })
    await wrapper.vm.handleSubmit()
    expect(mockNotifyError).toHaveBeenLastCalledWith(expect.anything(), null, 'Errore del server. Riprova più tardi.')

    const genericError = { response: { status: 400 }, message: 'Boom' }
    mockUploadFile.mockRejectedValueOnce(genericError)
    await wrapper.vm.handleSubmit()
    expect(mockNotifyError).toHaveBeenLastCalledWith(
      expect.anything(),
      genericError,
      "Errore nell'invio. Riprova più tardi."
    )
  })
})
