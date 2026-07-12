import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { quasarMount } from '../quasar-mount'
import ContattoDialog from 'src/components/Gestione/ContattoDialog.vue'

async function flushDialog() {
  await nextTick()
  await Promise.resolve()
  await nextTick()
}

const mockGetAllByContatto = vi.fn()
const mockUpdateEmail = vi.fn()
const mockCreateEmail = vi.fn()
const mockRemoveEmail = vi.fn()
const mockUpdateContatto = vi.fn()
const mockCreateGenitore = vi.fn()
const mockNotifyError = vi.fn()

const gestioneState = {
  saving: false,
  error: null,
  updateContatto: (...args) => mockUpdateContatto(...args),
  createGenitore: (...args) => mockCreateGenitore(...args)
}

vi.mock('src/services/email.service', () => ({
  emailService: {
    getAllByContatto: (...args) => mockGetAllByContatto(...args),
    update: (...args) => mockUpdateEmail(...args),
    updateSafe: (...args) => mockUpdateEmail(...args),
    create: (...args) => mockCreateEmail(...args),
    createSafe: (...args) => mockCreateEmail(...args),
    remove: (...args) => mockRemoveEmail(...args)
  }
}))

vi.mock('stores/gestione.store', () => ({
  useGestioneStore: () => gestioneState
}))

vi.mock('src/utils/notify', () => ({
  notifyError: (...args) => mockNotifyError(...args)
}))

vi.mock('quasar', () => ({
  useQuasar: () => ({ notify: vi.fn() })
}))

describe('ContattoDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    gestioneState.error = null
    mockGetAllByContatto.mockResolvedValue({
      data: {
        data: [{ id: 'mail-1', email_address: 'test@example.com', Primary: true }]
      }
    })
  })

  it('loads edit data and emails on open', async () => {
    const wrapper = quasarMount(ContattoDialog, {
      props: {
        modelValue: false,
        editItem: {
          id_contatto: 'cont-1',
          Nome: 'Mario',
          Cognome: 'Rossi',
          Numero_di_cellulare: '+39123',
          Numero_di_telefono: '02123',
          IsReferente: true
        }
      }
    })

    await wrapper.setProps({ modelValue: true })
    await flushDialog()
    expect(mockGetAllByContatto).toHaveBeenCalledWith('cont-1')
    expect(wrapper.vm.form.Nome).toBe('Mario')
    expect(wrapper.vm.emails).toHaveLength(1)
  })

  it('manages email list helpers', () => {
    const wrapper = quasarMount(ContattoDialog, { props: { modelValue: true } })

    wrapper.vm.addEmail()
    wrapper.vm.addEmail()
    expect(wrapper.vm.emails).toHaveLength(2)
    expect(wrapper.vm.emails[0].Primary).toBe(true)

    wrapper.vm.setPrimary(1)
    expect(wrapper.vm.emails[1].Primary).toBe(true)

    wrapper.vm.removeEmail(1)
    expect(wrapper.vm.emails).toHaveLength(1)
    expect(wrapper.vm.emails[0].Primary).toBe(true)
  })

  it('updates or creates email on blur in edit mode', async () => {
    mockUpdateEmail.mockResolvedValue({})
    mockCreateEmail.mockResolvedValue({ data: { data: { id: 'mail-2' } } })
    const wrapper = quasarMount(ContattoDialog, {
      props: { modelValue: false, editItem: { id_contatto: 'cont-1', Nome: 'Mario', Cognome: 'Rossi' } }
    })
    await wrapper.setProps({ modelValue: true })
    await flushDialog()

    await wrapper.vm.onEmailBlur({ id: 'mail-1', email_address: 'UP@MAIL.IT', Primary: true }, 0)
    expect(mockUpdateEmail).toHaveBeenCalledWith('mail-1', { email_address: 'up@mail.it' })

    await wrapper.vm.onEmailBlur({ id: null, email_address: 'NEW@MAIL.IT', Primary: false }, 1)
    expect(mockCreateEmail).toHaveBeenCalledWith({
      email_address: 'new@mail.it',
      Contatto_Relation: 'cont-1',
      Primary: false
    })
  })

  it('saves edit mode and syncs emails', async () => {
    mockUpdateContatto.mockResolvedValue(true)
    mockUpdateEmail.mockResolvedValue({})
    mockCreateEmail.mockResolvedValue({})
    mockRemoveEmail.mockResolvedValue({})
    const wrapper = quasarMount(ContattoDialog, {
      props: {
        modelValue: false,
        editItem: { id_contatto: 'cont-1', Nome: 'Mario', Cognome: 'Rossi', IsReferente: false }
      }
    })
    await wrapper.setProps({ modelValue: true })
    await flushDialog()
    wrapper.vm.form.Nome = 'Mario'
    wrapper.vm.form.Cognome = 'Rossi'
    wrapper.vm.emails = [
      { id: 'mail-1', email_address: 'uno@test.it', Primary: true },
      { id: null, email_address: 'due@test.it', Primary: false }
    ]
    wrapper.vm.originalEmailIds = ['mail-1', 'mail-3']

    await wrapper.vm.handleSave()
    await flushDialog()

    expect(mockUpdateContatto).toHaveBeenCalledWith(
      'cont-1',
      expect.objectContaining({ Nome: 'Mario', Cognome: 'Rossi' })
    )
    expect(mockUpdateEmail).toHaveBeenCalled()
    expect(mockCreateEmail).toHaveBeenCalledWith({
      email_address: 'due@test.it',
      Contatto_Relation: 'cont-1',
      Primary: false
    })
    expect(mockRemoveEmail).toHaveBeenCalledWith('mail-3')
    expect(wrapper.emitted('saved')).toBeTruthy()
  })

  it('creates new contact in create mode', async () => {
    mockCreateGenitore.mockResolvedValue('cont-new')
    const wrapper = quasarMount(ContattoDialog, { props: { modelValue: true } })
    wrapper.vm.form.Nome = 'Anna'
    wrapper.vm.form.Cognome = 'Verdi'
    wrapper.vm.emails = [{ email_address: 'anna@test.it' }]

    await wrapper.vm.handleSave()

    expect(mockCreateGenitore).toHaveBeenCalled()
    expect(wrapper.emitted('saved')[0][0]).toEqual({ id: 'cont-new', Nome: 'Anna', Cognome: 'Verdi' })
  })
})
