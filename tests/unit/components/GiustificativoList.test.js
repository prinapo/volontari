import { describe, it, expect, vi, beforeEach } from 'vitest'
import { quasarMount } from '../quasar-mount'
import GiustificativoList from 'src/components/Giustificativi/GiustificativoList.vue'

const mockFetchByProgetto = vi.fn()
const mockCreateGiustificativo = vi.fn()
const mockSaveInlineEdit = vi.fn()
const mockSubmitGiustificativo = vi.fn()
const mockUpdateGiustificativo = vi.fn()
const mockInvalidateGiustificativo = vi.fn()
const mockNotifySuccess = vi.fn()
const mockNotifyError = vi.fn()

const giustificativiState = {
  items: [],
  loading: false,
  saving: false,
  error: null,
  fetchByProgetto: (...a) => mockFetchByProgetto(...a),
  createGiustificativo: (...a) => mockCreateGiustificativo(...a),
  saveInlineEdit: (...a) => mockSaveInlineEdit(...a),
  submitGiustificativo: (...a) => mockSubmitGiustificativo(...a),
  updateGiustificativo: (...a) => mockUpdateGiustificativo(...a),
  invalidateGiustificativo: (...a) => mockInvalidateGiustificativo(...a)
}

vi.mock('stores/giustificativi.store', () => ({
  useGiustificativiStore: () => giustificativiState
}))

vi.mock('src/utils/notify', () => ({
  notifySuccess: (...a) => mockNotifySuccess(...a),
  notifyError: (...a) => mockNotifyError(...a)
}))

vi.mock('quasar', () => ({
  useQuasar: () => ({ notify: vi.fn() })
}))

describe('GiustificativoList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    giustificativiState.items = []
    giustificativiState.loading = false
    giustificativiState.saving = false
    giustificativiState.error = null
  })

  it('renders empty state', () => {
    const wrapper = quasarMount(GiustificativoList, {
      props: { progettoId: 'p-1', famigliaId: 'fam-1' },
      global: {
        stubs: {
          GiustificativoCard: { template: '<div />' },
          GiustificativoForm: { template: '<div />' }
        }
      }
    })
    expect(wrapper.text()).toContain('Giustificativi')
    expect(wrapper.text()).toContain('Nessun giustificativo presente')
  })

  it('fetches items on mount with progettoId and filters/sorts visible items', () => {
    giustificativiState.items = [
      { id: 1, Data: '2025-01-01', Stato: 'draft', Invalidato: false },
      { id: 2, Data: '2026-01-01', Stato: 'draft', Invalidato: false },
      { id: 3, Data: '2024-01-01', Stato: 'draft', Invalidato: true }
    ]

    const wrapper = quasarMount(GiustificativoList, {
      props: { progettoId: 'p-1', famigliaId: 'fam-1' },
      global: {
        stubs: {
          GiustificativoCard: { template: '<div />' },
          GiustificativoForm: { template: '<div />' }
        }
      }
    })
    expect(mockFetchByProgetto).toHaveBeenCalledWith('p-1')
    expect(wrapper.vm.items.map(item => item.id)).toEqual([2, 1])
  })

  it('creates a giustificativo successfully and refreshes the list', async () => {
    mockCreateGiustificativo.mockResolvedValue(true)
    const wrapper = quasarMount(GiustificativoList, {
      props: { progettoId: 'p-1', famigliaId: 'fam-1' },
      global: {
        stubs: {
          GiustificativoCard: { template: '<div />' },
          GiustificativoForm: { template: '<div />' }
        }
      }
    })
    wrapper.vm.showForm = true
    const file = new File(['a'], 'doc.pdf')

    await wrapper.vm.handleCreate({ Descrizione: 'Spesa', File: file })

    expect(mockCreateGiustificativo).toHaveBeenCalledWith({ Descrizione: 'Spesa', File: file }, file)
    expect(mockFetchByProgetto).toHaveBeenCalledWith('p-1')
    expect(wrapper.vm.showForm).toBe(false)
    expect(mockNotifySuccess).toHaveBeenCalled()
  })

  it('handles create/edit/submit/file invalidate errors', async () => {
    giustificativiState.error = 'Errore store'
    mockCreateGiustificativo.mockResolvedValue(false)
    mockSaveInlineEdit.mockResolvedValue(false)
    mockSubmitGiustificativo.mockResolvedValue(false)
    mockUpdateGiustificativo.mockResolvedValue(false)
    mockInvalidateGiustificativo.mockResolvedValue(false)

    const wrapper = quasarMount(GiustificativoList, {
      props: { progettoId: 'p-1', famigliaId: 'fam-1' },
      global: {
        stubs: {
          GiustificativoCard: { template: '<div />' },
          GiustificativoForm: { template: '<div />' }
        }
      }
    })

    await wrapper.vm.handleCreate({ File: null })
    await wrapper.vm.handleSaveField({ id: 1, field: 'Descrizione', value: 'x' })
    await wrapper.vm.handleSubmit({ id: 1 })
    await wrapper.vm.handleFileChange({ id: 1, file: new File(['a'], 'x.pdf') })
    await wrapper.vm.handleInvalida(1)

    expect(mockNotifyError).toHaveBeenCalledTimes(5)
  })

  it('handles save, submit, file change and invalidate success flows', async () => {
    mockSaveInlineEdit.mockResolvedValue(true)
    mockSubmitGiustificativo.mockResolvedValue(true)
    mockUpdateGiustificativo.mockResolvedValue(true)
    mockInvalidateGiustificativo.mockResolvedValue(true)

    const wrapper = quasarMount(GiustificativoList, {
      props: { progettoId: 'p-1', famigliaId: 'fam-1' },
      global: {
        stubs: {
          GiustificativoCard: { template: '<div />' },
          GiustificativoForm: { template: '<div />' }
        }
      }
    })

    await wrapper.vm.handleSaveField({ id: 1, field: 'Descrizione', value: 'ok' })
    await wrapper.vm.handleSubmit({ id: 1 })
    await wrapper.vm.handleFileChange({ id: 1, file: new File(['a'], 'x.pdf') })
    await wrapper.vm.handleInvalida(1)

    expect(mockSaveInlineEdit).toHaveBeenCalledWith(1, 'Descrizione', 'ok')
    expect(mockSubmitGiustificativo).toHaveBeenCalledWith(1)
    expect(mockUpdateGiustificativo).toHaveBeenCalled()
    expect(mockInvalidateGiustificativo).toHaveBeenCalledWith(1)
    expect(mockNotifySuccess).toHaveBeenCalled()
    expect(mockFetchByProgetto).toHaveBeenCalledWith('p-1')
  })
})
