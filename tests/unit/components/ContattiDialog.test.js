import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { quasarMount } from '../quasar-mount'
import ContattiDialog from 'src/components/Gestione/ContattiDialog.vue'

const mockSearchContatti = vi.fn()
const mockGetByContatto = vi.fn()
const mockGetContattiByFamiglia = vi.fn()
const mockEnrichWithEmails = vi.fn()
const mockAssignToFamiglia = vi.fn()
const mockRemoveFromFamiglia = vi.fn()
const mockNotifySuccess = vi.fn()
const mockNotifyError = vi.fn()

const gestioneState = {
  error: null,
  assignToFamiglia: (...args) => mockAssignToFamiglia(...args),
  removeFromFamiglia: (...args) => mockRemoveFromFamiglia(...args)
}

vi.mock('src/services/contatti.service', () => ({
  contattiService: {
    search: (...args) => mockSearchContatti(...args)
  }
}))

vi.mock('src/services/email.service', () => ({
  emailService: {
    getByContatto: (...args) => mockGetByContatto(...args)
  }
}))

vi.mock('src/services/gestione.service', () => ({
  gestioneService: {
    getContattiByFamiglia: (...args) => mockGetContattiByFamiglia(...args)
  }
}))

vi.mock('src/utils/enrichment', () => ({
  enrichWithEmails: (...args) => mockEnrichWithEmails(...args)
}))

vi.mock('src/utils/notify', () => ({
  notifySuccess: (...args) => mockNotifySuccess(...args),
  notifyError: (...args) => mockNotifyError(...args)
}))

vi.mock('stores/gestione.store', () => ({
  useGestioneStore: () => gestioneState
}))

vi.mock('quasar', () => ({
  useQuasar: () => ({ screen: { lt: { sm: false } }, notify: vi.fn() })
}))

async function flushAll() {
  await nextTick()
  await Promise.resolve()
  await nextTick()
}

describe('ContattiDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    gestioneState.error = null

    mockGetContattiByFamiglia.mockResolvedValue({
      data: {
        data: [
          {
            id: 'fc-vol',
            Ruolo_nella_Famiglia: 'Volontario',
            Contatto: {
              id_contatto: 'cont-1',
              Nome: 'Mario',
              Cognome: 'Rossi'
            }
          },
          {
            id: 'fc-gen',
            Ruolo_nella_Famiglia: 'Genitore',
            Contatto: {
              id_contatto: 'cont-2',
              Nome: 'Anna',
              Cognome: 'Verdi'
            }
          }
        ]
      }
    })

    mockEnrichWithEmails.mockResolvedValue({
      'cont-1': [{ email_address: 'mario@test.it', Primary: true }],
      'cont-2': [{ email_address: 'anna@test.it', Primary: true }]
    })

    mockSearchContatti.mockResolvedValue({
      data: {
        data: [
          {
            id_contatto: 'cont-1',
            Nome: 'Mario',
            Cognome: 'Rossi',
            email: [{ email_address: 'mario@test.it', Primary: true }]
          },
          {
            id_contatto: 'cont-2',
            Nome: 'Anna',
            Cognome: 'Verdi',
            email: [{ email_address: 'anna@test.it', Primary: true }]
          },
          {
            id_contatto: 'cont-3',
            Nome: 'Luca',
            Cognome: 'Bianchi',
            email: [{ email_address: 'luca@test.it', Primary: true }]
          }
        ]
      }
    })
  })

  function mountDialog() {
    return quasarMount(ContattiDialog, {
      props: {
        modelValue: false,
        famiglia: { id_famiglia: 'fam-1', Nome_Famiglia: 'Famiglia Test' }
      },
      global: {
        stubs: {
          ContattoDialog: { template: '<div />' }
        }
      }
    })
  }

  it('loads contacts and preloads selectable options when opened', async () => {
    const wrapper = mountDialog()

    await wrapper.setProps({ modelValue: true })
    await wrapper.vm.loadContatti()
    await wrapper.vm.preloadOptions()
    await flushAll()

    expect(mockGetContattiByFamiglia).toHaveBeenCalledWith('fam-1')
    expect(mockEnrichWithEmails).toHaveBeenCalledWith(['cont-1', 'cont-2'], expect.any(Function))
    expect(mockSearchContatti).toHaveBeenCalledWith('', false)
    expect(wrapper.vm.volontari).toHaveLength(1)
    expect(wrapper.vm.genitori).toHaveLength(1)
    expect(wrapper.vm.volontari[0]._emails[0].email_address).toBe('mario@test.it')
    expect(wrapper.vm.contattoOptions).toEqual([{ id: 'cont-3', label: 'Luca Bianchi (luca@test.it)' }])
  })

  it('filters only unassigned contacts', async () => {
    const wrapper = mountDialog()
    await wrapper.setProps({ modelValue: true })
    await wrapper.vm.loadContatti()
    await wrapper.vm.preloadOptions()
    await flushAll()

    mockSearchContatti.mockResolvedValueOnce({
      data: {
        data: [
          {
            id_contatto: 'cont-2',
            Nome: 'Anna',
            Cognome: 'Verdi',
            email: [{ email_address: 'anna@test.it', Primary: true }]
          },
          {
            id_contatto: 'cont-4',
            Nome: 'Giulia',
            Cognome: 'Neri',
            email: [{ email_address: 'giulia@test.it', Primary: true }]
          }
        ]
      }
    })

    await wrapper.vm.filterContatti('Gi', fn => fn())

    expect(wrapper.vm.contattoOptions).toEqual([{ id: 'cont-4', label: 'Giulia Neri (giulia@test.it)' }])
  })

  it('assigns selected contact and refreshes data', async () => {
    mockAssignToFamiglia.mockResolvedValue(true)
    const wrapper = mountDialog()
    await wrapper.setProps({ modelValue: true })
    await wrapper.vm.loadContatti()
    await wrapper.vm.preloadOptions()
    await flushAll()
    vi.clearAllMocks()

    wrapper.vm.selectedContatto = 'cont-3'
    await wrapper.vm.handleAssign('Genitore')
    await flushAll()

    expect(mockAssignToFamiglia).toHaveBeenCalledWith('cont-3', 'fam-1', 'Genitore')
    expect(mockNotifySuccess).toHaveBeenCalled()
    expect(mockGetContattiByFamiglia).toHaveBeenCalledWith('fam-1')
    expect(mockSearchContatti).toHaveBeenCalledWith('', false)
    expect(wrapper.vm.selectedContatto).toBe(null)
  })

  it('shows role dialog for a newly created contact and can assign it', async () => {
    mockAssignToFamiglia.mockResolvedValue(true)
    const wrapper = mountDialog()

    wrapper.vm.onNewContattoSaved({ id: 'cont-9', Nome: 'Paolo', Cognome: 'Blu' })
    expect(wrapper.vm.showNewContatto).toBe(false)
    expect(wrapper.vm.newContattoId).toBe('cont-9')
    expect(wrapper.vm.newContattoNome).toBe('Paolo Blu')
    expect(wrapper.vm.showRoleDialog).toBe(true)

    await wrapper.vm.assignNewContatto('Volontario')

    expect(mockAssignToFamiglia).toHaveBeenCalledWith('cont-9', 'fam-1', 'Volontario')
    expect(mockNotifySuccess).toHaveBeenCalled()
    expect(wrapper.vm.showRoleDialog).toBe(false)
  })

  it('preloads options after saving a contact without assignment and reports remove errors', async () => {
    gestioneState.error = 'Errore remove'
    mockRemoveFromFamiglia.mockResolvedValue(false)
    const wrapper = mountDialog()
    await wrapper.setProps({ modelValue: true })
    await wrapper.vm.loadContatti()
    await wrapper.vm.preloadOptions()
    await flushAll()
    vi.clearAllMocks()

    wrapper.vm.onNewContattoSaved(null)
    await flushAll()
    expect(mockSearchContatti).toHaveBeenCalledWith('', false)

    await wrapper.vm.handleRemove({
      id: 'fc-1',
      Contatto: { id_contatto: 'cont-1' },
      Ruolo_nella_Famiglia: 'Volontario'
    })

    expect(mockRemoveFromFamiglia).toHaveBeenCalledWith('fc-1', 'cont-1', 'Volontario')
    expect(mockNotifyError).toHaveBeenCalled()
  })
})
