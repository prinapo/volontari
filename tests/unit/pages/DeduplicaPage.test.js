import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { quasarMount } from '../quasar-mount'
import DeduplicaPage from 'src/pages/DeduplicaPage.vue'

const mockUpdateEmail = vi.fn()
const mockUpdateFamigliaContatto = vi.fn()
const mockNotifySuccess = vi.fn()
const mockNotifyError = vi.fn()
const mockDialog = vi.fn()
const mockQNotify = vi.fn()

const deduplicaState = {
  loading: false,
  error: null,
  duplicateGroups: [],
  idDuplicateGroups: [],
  totalIdDuplicates: 0,
  fetchDuplicates: vi.fn(),
  fetchIdDuplicates: vi.fn(),
  deleteEmailRow: vi.fn(),
  merge: vi.fn(),
  deleteContattoIfEmpty: vi.fn()
}

vi.mock('src/services/deduplica.service', () => ({
  deduplicaService: {
    updateEmail: (...args) => mockUpdateEmail(...args),
    updateFamigliaContatto: (...args) => mockUpdateFamigliaContatto(...args)
  }
}))

vi.mock('src/utils/notify', () => ({
  notifySuccess: (...args) => mockNotifySuccess(...args),
  notifyError: (...args) => mockNotifyError(...args)
}))

vi.mock('stores/deduplica.store', () => ({
  useDeduplicaStore: () => deduplicaState
}))

vi.mock('quasar', () => ({
  useQuasar: () => ({
    dialog: (...args) => mockDialog(...args),
    notify: (...args) => mockQNotify(...args),
    screen: { lt: { sm: false } }
  })
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

describe('DeduplicaPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    deduplicaState.loading = false
    deduplicaState.error = null
    deduplicaState.duplicateGroups = []
    deduplicaState.idDuplicateGroups = []
    deduplicaState.totalIdDuplicates = 0
    deduplicaState.fetchDuplicates = vi.fn()
    deduplicaState.fetchIdDuplicates = vi.fn()
    deduplicaState.deleteEmailRow = vi.fn().mockResolvedValue({})
    deduplicaState.merge = vi.fn().mockResolvedValue({})
    deduplicaState.deleteContattoIfEmpty = vi.fn().mockResolvedValue({})
    mockUpdateEmail.mockResolvedValue({})
    mockUpdateFamigliaContatto.mockResolvedValue({})
    mockDialog.mockReturnValue(okDialog())
  })

  function mountPage() {
    return quasarMount(DeduplicaPage, {
      global: {
        stubs: {
          'q-radio': { template: '<div />', props: ['modelValue', 'val', 'label'] },
          'q-scroll-area': { template: '<div><slot /></div>' }
        }
      }
    })
  }

  it('fetches duplicates on mount and handles ID duplicate dialog flow', async () => {
    deduplicaState.idDuplicateGroups = []
    deduplicaState.totalIdDuplicates = 3
    deduplicaState.fetchIdDuplicates = vi.fn().mockImplementation(() => {
      deduplicaState.idDuplicateGroups = [{ id: 'abc', label: 'Email', count: 2 }]
    })

    const wrapper = mountPage()
    await flushAll()

    expect(deduplicaState.fetchDuplicates).toHaveBeenCalled()
    expect(wrapper.vm.idBadgeColor).toBe('grey')

    await wrapper.vm.showIdDuplicates()
    expect(wrapper.vm.idDialog).toBe(true)
    expect(deduplicaState.fetchIdDuplicates).toHaveBeenCalled()
    expect(mockQNotify).toHaveBeenCalledWith({
      type: 'warning',
      message: 'Trovati 3 ID duplicati in 1 gruppi'
    })
  })

  it('formats contacts and opens ID detail dialog', () => {
    const wrapper = mountPage()

    expect(wrapper.vm.formatContatto(null)).toBe('?')
    expect(wrapper.vm.formatContatto({ Nome: 'Mario', Cognome: 'Rossi' })).toBe('Mario Rossi')

    wrapper.vm.viewIdDuplicates({ id: 'dup-1', label: 'Email', count: 4 })
    expect(mockDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'ID "dup-1" in Email',
        html: true,
        persistent: true
      })
    )
  })

  it('opens cross-contact groups and computes same-contact data', async () => {
    const wrapper = mountPage()
    const crossGroup = {
      email: 'dup@test.it',
      types: ['cross-contatto'],
      contattoIds: ['a', 'b'],
      contattiData: {
        a: {
          contatto: { Nome: 'Mario', Cognome: 'Rossi', Numero_di_cellulare: '123' },
          emailEntries: [{ id: 'e1' }],
          famiglieContatti: []
        },
        b: {
          contatto: { Nome: 'Maria', Cognome: 'Rossi', Numero_di_cellulare: '999' },
          emailEntries: [{ id: 'e2' }],
          famiglieContatti: [{ id: 'fc2' }]
        }
      }
    }

    wrapper.vm.openGroup(crossGroup)
    await flushAll()

    expect(wrapper.vm.selectedGroup).toEqual(crossGroup)
    expect(wrapper.vm.comparisonDialog).toBe(true)
    expect(wrapper.vm.crossPairs).toHaveLength(1)
    expect(wrapper.vm.crossPairs[0].fieldRows.some(row => row.differs)).toBe(true)

    const sameGroup = {
      email: 'same@test.it',
      types: ['same-contatto'],
      contattiData: {
        a: { contatto: { Nome: 'Mario' }, emailEntries: [{ id: 'e1' }, { id: 'e2' }] },
        b: { contatto: { Nome: 'Anna' }, emailEntries: [{ id: 'e3' }] }
      }
    }
    wrapper.vm.openGroup(sameGroup)
    expect(Object.keys(wrapper.vm.sameContattoData)).toEqual(['a'])
  })

  it('moves emails and families from secondary contact', async () => {
    const wrapper = mountPage()
    const pair = {
      aId: 'a',
      bId: 'b',
      aData: { emailEntries: [], famiglieContatti: [] },
      bData: {
        emailEntries: [{ id: 'e1' }, { id: 'e2' }],
        famiglieContatti: [{ id: 'fc1' }, { id: 'fc2' }],
        contatto: {}
      },
      fieldChoices: {}
    }

    await wrapper.vm.moveBEmailsToA(pair)
    expect(mockUpdateEmail).toHaveBeenCalledWith('e1', { Contatto_Relation: 'a' })
    expect(mockUpdateEmail).toHaveBeenCalledWith('e2', { Contatto_Relation: 'a' })
    expect(pair.bData.emailEntries).toEqual([])

    await wrapper.vm.moveBFamiliesToA(pair)
    expect(mockUpdateFamigliaContatto).toHaveBeenCalledWith('fc1', { Contatto: 'a' })
    expect(mockUpdateFamigliaContatto).toHaveBeenCalledWith('fc2', { Contatto: 'a' })
    expect(pair.bData.famiglieContatti).toEqual([])
    expect(mockNotifySuccess).toHaveBeenCalled()
  })

  it('deletes an email row and closes comparison dialog', async () => {
    const wrapper = mountPage()
    wrapper.vm.comparisonDialog = true

    await wrapper.vm.handleDeleteEmail('mail-1')

    expect(deduplicaState.deleteEmailRow).toHaveBeenCalledWith('mail-1')
    expect(wrapper.vm.comparisonDialog).toBe(false)
    expect(mockNotifySuccess).toHaveBeenCalledWith(expect.anything(), 'Email eliminata')
  })

  it('merges pairs applying overrides and handles delete-secondary flow', async () => {
    const wrapper = mountPage()
    wrapper.vm.crossPairs = [
      {
        aId: 'a',
        bId: 'b',
        aData: { contatto: { Nome: 'Mario' } },
        bData: { contatto: { Nome: 'Maria', user_id: 'user-b' }, famiglieContatti: [] },
        fieldChoices: { Nome: 'b' },
        moveUser: true
      }
    ]

    mockDialog.mockReturnValueOnce(okDialog(callback => callback()))
    wrapper.vm.confirmMerge()
    await flushAll()

    expect(deduplicaState.merge).toHaveBeenCalledWith('a', 'b', {
      Nome: 'Maria',
      user_id: 'user-b'
    })
    expect(mockNotifySuccess).toHaveBeenCalledWith(expect.anything(), 'Unione completata')

    wrapper.vm.comparisonDialog = true
    mockDialog.mockReturnValueOnce(okDialog(callback => callback()))
    wrapper.vm.confirmDeleteB()
    await flushAll()

    expect(deduplicaState.deleteContattoIfEmpty).toHaveBeenCalledWith('b')
    expect(wrapper.vm.comparisonDialog).toBe(false)
    expect(mockNotifySuccess).toHaveBeenCalledWith(expect.anything(), 'Contatti eliminati')
  })

  it('warns instead of deleting secondaries when families are still attached', async () => {
    const wrapper = mountPage()
    wrapper.vm.crossPairs = [
      {
        bId: 'b',
        bData: { famiglieContatti: [{ id: 'fc1' }], contatto: {} },
        fieldChoices: {}
      }
    ]

    wrapper.vm.confirmDeleteB()

    expect(mockQNotify).toHaveBeenCalledWith({
      type: 'warning',
      message: 'Sposta prima tutte le famiglie nel contatto principale'
    })
    expect(mockDialog).not.toHaveBeenCalled()
  })
})
