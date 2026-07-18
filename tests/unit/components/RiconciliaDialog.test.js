import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { quasarMount } from '../quasar-mount'
import RiconciliaDialog from 'src/components/RiconciliaDialog.vue'

const mockNotifySuccess = vi.fn()
const mockNotifyError = vi.fn()
const mockDialog = vi.fn()

const mockUpdateProgetto = vi.fn()
const mockFindProgettoByFamiglia = vi.fn()
const mockResolveSubmissionContext = vi.fn()
const mockLoadFamigliaContacts = vi.fn()
const mockReconcileUpdateField = vi.fn()

const verificaState = {
  resolveSubmissionContext: (...args) => mockResolveSubmissionContext(...args),
  loadFamigliaContacts: (...args) => mockLoadFamigliaContacts(...args),
  reconcileUpdateField: (...args) => mockReconcileUpdateField(...args)
}

vi.mock('src/services/verifica.service', () => ({
  verificaService: {
    updateProgetto: (...args) => mockUpdateProgetto(...args),
    findProgettoByFamiglia: (...args) => mockFindProgettoByFamiglia(...args)
  }
}))

vi.mock('stores/verifica.store', () => ({
  useVerificaStore: () => verificaState
}))

vi.mock('src/utils/notify', () => ({
  notifySuccess: (...args) => mockNotifySuccess(...args),
  notifyError: (...args) => mockNotifyError(...args)
}))

vi.mock('quasar', () => ({
  useQuasar: () => ({
    dialog: (...args) => mockDialog(...args),
    notify: vi.fn(),
    screen: { lt: { sm: false } }
  })
}))

vi.mock('src/utils/assets', () => ({
  assetUrl: value => `asset:${value}`
}))

vi.mock('src/utils/formatters', () => ({
  displayFullName: contatto => [contatto?.Nome, contatto?.Cognome].filter(Boolean).join(' ')
}))

function okDialog(handler) {
  return {
    onOk(callback) {
      if (handler) handler(callback)
      return this
    }
  }
}

async function flushAll() {
  await nextTick()
  await Promise.resolve()
  await nextTick()
}

describe('RiconciliaDialog', () => {
  const submission = {
    id: 'sub-1',
    nome_richiedente: 'Mario',
    cognome_richiedente: 'Rossi',
    email: 'mario@test.it',
    telefono: '+39123',
    iban: 'IT60X0542811101000000123456',
    intestatario: 'Mario Rossi',
    nome_beneficiario: 'Luca',
    cognome_beneficiario: 'Rossi',
    descrizione: 'Spesa medica',
    importo: '45.5',
    data: '2026-01-15T10:00:00.000Z',
    allegato: 'file-1'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockDialog.mockReturnValue(okDialog())
    mockUpdateProgetto.mockResolvedValue({})
    mockFindProgettoByFamiglia.mockResolvedValue({
      data: {
        data: [
          {
            id_progetto: 'prog-1',
            Cognome_Beneficiario: 'Rossi',
            Nome_Beneficiario: 'Luca',
            Interstatario_CC: 'Mario Rossi',
            AnnoBando: 2026
          }
        ]
      }
    })
    mockResolveSubmissionContext.mockResolvedValue({
      contattoId: 'cont-1',
      famigliaId: 'fam-1',
      rightValues: {
        Nome: 'Mario',
        Cognome: 'Rossi',
        Email: 'db@test.it',
        Telefono: '+39123',
        IBAN: 'IT00DB',
        Intestatario: 'Mario DB'
      },
      famigliaDetail: { Nome_Famiglia: 'Famiglia Rossi' }
    })
    mockLoadFamigliaContacts.mockResolvedValue({
      genitori: [{ id: 'g1', Contatto: { Nome: 'Mario', Cognome: 'Rossi' }, _emails: [] }],
      volontari: [{ id: 'v1', Contatto: { Nome: 'Luca', Cognome: 'Rossi' }, _emails: [] }]
    })
    mockReconcileUpdateField.mockResolvedValue({})
  })

  function mountDialog(extraProps = {}) {
    return quasarMount(RiconciliaDialog, {
      props: {
        modelValue: true,
        submission,
        ...extraProps
      },
      global: {
        stubs: {
          'q-radio': { template: '<div />', props: ['modelValue', 'val', 'label'] },
          'q-scroll-area': { template: '<div><slot /></div>' }
        }
      }
    })
  }

  it('initializes data from submission context and auto-selects single project', async () => {
    const wrapper = mountDialog()

    await wrapper.vm.initData()
    await flushAll()

    expect(mockResolveSubmissionContext).toHaveBeenCalledWith('mario@test.it')
    expect(mockLoadFamigliaContacts).toHaveBeenCalledWith('fam-1')
    expect(mockFindProgettoByFamiglia).toHaveBeenCalledWith('fam-1')
    expect(wrapper.vm.contattoIdRef).toBe('cont-1')
    expect(wrapper.vm.famigliaIdRef).toBe('fam-1')
    expect(wrapper.vm.famigliaDetail.Nome_Famiglia).toBe('Famiglia Rossi')
    expect(wrapper.vm.selectedProgettoId).toBe('prog-1')
    expect(wrapper.vm.projectValues.Cognome_Beneficiario).toBe('Rossi')
    expect(wrapper.vm.giustDescrizione).toBe('Spesa medica')
    expect(wrapper.vm.giustImporto).toBe('45.5')
    expect(wrapper.vm.giustData).toBe('2026-01-15')
  })

  it('handles field comparison and save helpers for contact data', async () => {
    const wrapper = mountDialog()
    wrapper.vm.contattoIdRef = 'cont-1'
    wrapper.vm.famigliaIdRef = 'fam-1'
    wrapper.vm.rightValues = {
      Nome: 'Marco',
      Cognome: 'Rossi',
      Email: 'x@test.it',
      Telefono: '',
      IBAN: '',
      Intestatario: ''
    }

    expect(wrapper.vm.getLeftValue('Nome')).toBe('Mario')
    expect(wrapper.vm.isFieldDifferent('Nome')).toBe(true)
    expect(wrapper.vm.isFieldDifferent('Telefono')).toBe(true)

    wrapper.vm.confirmField('Nome')
    expect(wrapper.vm.isFieldDifferent('Nome')).toBe(false)

    wrapper.vm.setRightValue('Nome', 'Mario')
    expect(wrapper.vm.isFieldDifferent('Nome')).toBe(false)

    await wrapper.vm.saveField('Nome')
    expect(mockReconcileUpdateField).toHaveBeenCalledWith('cont-1', 'fam-1', 'Nome', 'Mario')
    expect(mockNotifySuccess).toHaveBeenCalled()
  })

  it('copies and saves a contact field', async () => {
    const wrapper = mountDialog()
    wrapper.vm.contattoIdRef = 'cont-1'
    wrapper.vm.famigliaIdRef = 'fam-1'

    wrapper.vm.copyField('Telefono')
    await flushAll()

    expect(mockReconcileUpdateField).toHaveBeenCalledWith('cont-1', 'fam-1', 'Telefono', '+39123')
  })

  it('handles project field comparison, copy and save', async () => {
    mockDialog.mockReturnValueOnce(okDialog(callback => callback()))
    const wrapper = mountDialog()
    wrapper.vm.progettiList = [
      {
        id_progetto: 'prog-1',
        Cognome_Beneficiario: 'Bianchi',
        Nome_Beneficiario: 'Luca',
        Interstatario_CC: 'Altro'
      }
    ]
    wrapper.vm.selectedProgettoId = 'prog-1'
    wrapper.vm.initProjectValues()

    expect(wrapper.vm.selectedProgetto.id_progetto).toBe('prog-1')
    expect(wrapper.vm.progettoOptions).toEqual([{ label: 'Bianchi Luca (N/A)', value: 'prog-1' }])
    expect(wrapper.vm.getSubmissionProjectValue('Cognome_Beneficiario')).toBe('Rossi')
    expect(wrapper.vm.getSubmissionProjectValue('Intestatario')).toBe('')
    expect(wrapper.vm.isProjectFieldDifferent('Cognome_Beneficiario')).toBe(true)

    wrapper.vm.confirmProjectField('Cognome_Beneficiario')
    expect(wrapper.vm.isProjectFieldDifferent('Cognome_Beneficiario')).toBe(false)

    wrapper.vm.setProjectValue('Cognome_Beneficiario', 'Rossi')
    await wrapper.vm.saveProjectField('Cognome_Beneficiario')
    expect(mockUpdateProgetto).toHaveBeenCalledWith('prog-1', { Cognome_Beneficiario: 'Rossi' })

    wrapper.vm.setProjectValue('Nome_Beneficiario', '')
    wrapper.vm.copyProjectField('Nome_Beneficiario')
    await flushAll()
    expect(mockUpdateProgetto).toHaveBeenCalledWith('prog-1', { Nome_Beneficiario: 'Luca' })
  })

  it('loads empty lists when famiglia is missing or services fail', async () => {
    const wrapper = mountDialog({ submission: { ...submission, email: '' } })

    await wrapper.vm.loadFamigliaMembers(null)
    await wrapper.vm.loadProgetti(null)
    expect(wrapper.vm.genitoriList).toEqual([])
    expect(wrapper.vm.volontariList).toEqual([])
    expect(wrapper.vm.progettiList).toEqual([])

    mockLoadFamigliaContacts.mockRejectedValueOnce(new Error('boom'))
    mockFindProgettoByFamiglia.mockRejectedValueOnce(new Error('boom'))
    await wrapper.vm.loadFamigliaMembers('fam-1')
    await wrapper.vm.loadProgetti('fam-1')
    expect(wrapper.vm.genitoriList).toEqual([])
    expect(wrapper.vm.volontariList).toEqual([])
    expect(wrapper.vm.progettiList).toEqual([])

    await wrapper.vm.initData()
    expect(wrapper.vm.contattoIdRef).toBe(null)
  })

  it('emits reconcile payload and closes dialog', async () => {
    const wrapper = mountDialog()
    wrapper.vm.contattoIdRef = 'cont-1'
    wrapper.vm.famigliaIdRef = 'fam-1'
    wrapper.vm.selectedProgettoId = 'prog-1'
    wrapper.vm.note = 'nota test'
    wrapper.vm.giustDescrizione = 'Spesa medica'
    wrapper.vm.giustImporto = '12.5'
    wrapper.vm.giustData = '2026-01-15'
    wrapper.vm.rightValues = {
      Nome: 'Mario',
      Cognome: 'Rossi',
      Email: 'a',
      Telefono: '1',
      IBAN: 'IT',
      Intestatario: 'Mario'
    }
    wrapper.vm.projectValues = { Cognome_Beneficiario: 'Rossi', Nome_Beneficiario: 'Luca', Intestatario: 'Mario' }
    wrapper.vm.confirmedFields = new Set(['Nome'])
    wrapper.vm.projectConfirmedFields = new Set(['Cognome_Beneficiario'])

    await wrapper.vm.confirmReconcile()

    const emitted = wrapper.emitted('reconcile')
    expect(emitted).toBeTruthy()
    expect(emitted[0][0]).toEqual(
      expect.objectContaining({
        submissionId: 'sub-1',
        contattoId: 'cont-1',
        famigliaId: 'fam-1',
        progettoId: 'prog-1',
        note: 'nota test',
        importo: 12.5,
        copiedFields: ['Nome', 'Progetto_Cognome_Beneficiario']
      })
    )
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
  })

  it('returns early from reconcile when no project is selected', async () => {
    const wrapper = mountDialog()

    await wrapper.vm.confirmReconcile()

    expect(wrapper.emitted('reconcile')).toBeFalsy()
    expect(wrapper.vm.saving).toBe(false)
  })

  it('covers project and contact error branches plus silent init branches', async () => {
    const wrapper = mountDialog()

    wrapper.vm.progettiList = [{ id_progetto: 'prog-1', Cognome_Beneficiario: 'Bianchi', Nome_Beneficiario: 'Luca' }]
    wrapper.vm.selectedProgettoId = 'prog-1'
    wrapper.vm.initProjectValues()

    mockUpdateProgetto.mockRejectedValueOnce(new Error('project boom'))
    wrapper.vm.setProjectValue('Cognome_Beneficiario', 'Rossi')
    await wrapper.vm.saveProjectField('Cognome_Beneficiario')
    expect(mockNotifyError).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(Error),
      'Cognome_Beneficiario: Errore aggiornamento'
    )
    expect(wrapper.vm.savingProjectField).toBe(null)

    mockReconcileUpdateField.mockRejectedValueOnce(new Error('field boom'))
    wrapper.vm.contattoIdRef = 'cont-1'
    wrapper.vm.famigliaIdRef = 'fam-1'
    wrapper.vm.rightValues.Nome = 'Mario'
    await wrapper.vm.saveField('Nome')
    expect(mockNotifyError).toHaveBeenCalledWith(expect.anything(), expect.any(Error), 'Nome: Errore sconosciuto')
    expect(wrapper.vm.savingField).toBe(null)

    mockResolveSubmissionContext.mockResolvedValueOnce({
      contattoId: 'cont-2',
      famigliaId: null,
      rightValues: { Nome: 'Mario', Cognome: 'Rossi', Email: '', Telefono: '', IBAN: '', Intestatario: '' },
      famigliaDetail: null
    })
    await wrapper.vm.initData()
    expect(mockLoadFamigliaContacts).not.toHaveBeenCalledWith(null)
    expect(mockFindProgettoByFamiglia).not.toHaveBeenCalledWith(null)

    mockResolveSubmissionContext.mockRejectedValueOnce(new Error('ctx boom'))
    await expect(wrapper.vm.initData()).resolves.toBeUndefined()
  })

  it('handles model setter and early-return helpers safely', async () => {
    const wrapper = mountDialog()

    wrapper.vm.model = false
    await flushAll()
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])

    wrapper.vm.progettiList = []
    wrapper.vm.selectedProgettoId = 'missing'
    expect(wrapper.vm.selectedProgetto).toBe(null)

    await wrapper.vm.saveProjectField('Nome_Beneficiario')
    expect(mockUpdateProgetto).not.toHaveBeenCalled()

    wrapper.vm.copyField('Unknown')
    wrapper.vm.copyProjectField('Unknown')
    expect(mockDialog).not.toHaveBeenCalled()

    wrapper.vm.projectValues.Nome_Beneficiario = ''
    wrapper.vm.projectConfirmedFields = new Set()
    expect(wrapper.vm.isProjectFieldDifferent('Nome_Beneficiario')).toBe(true)

    wrapper.vm.projectValues.Nome_Beneficiario = 'Luca'
    expect(wrapper.vm.isProjectFieldDifferent('Nome_Beneficiario')).toBe(false)

    wrapper.vm.projectValues.Nome_Beneficiario = ''
    wrapper.vm.confirmedFields = new Set(['Nome'])
    expect(wrapper.vm.isFieldDifferent('Nome')).toBe(false)
  })

  it('formats local dates safely', () => {
    const wrapper = mountDialog()

    expect(wrapper.vm.toLocalDate('2026-01-15T10:00:00.000Z')).toBe('2026-01-15')
    expect(wrapper.vm.toLocalDate('not-a-date-2026-03-04')).toBe('2026-03-04')
    expect(wrapper.vm.toLocalDate('')).toBe('')
  })
})
