import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { quasarMount } from '../quasar-mount'
import PagamentiTab from 'src/components/Verifica/PagamentiTab.vue'

const mockInit = vi.fn()
const mockCreaBatch = vi.fn()
const mockCorreggiDati = vi.fn()
const mockSegnaPagato = vi.fn()
const mockSegnaFallito = vi.fn()
const mockSegnaAnnullato = vi.fn()
const mockRipristinaProposto = vi.fn()
const mockEliminaLista = vi.fn()
const mockResiduo = vi.fn()
const mockNotifySuccess = vi.fn()
const mockNotifyError = vi.fn()
const mockDialog = vi.fn()

const pagamentiState = {
  loading: false,
  associazioni: [{ Nome: 'Assoc 1' }],
  proposti: [],
  inCorso: [],
  falliti: [],
  batches: [],
  liste: [],
  init: (...args) => mockInit(...args),
  creaBatch: (...args) => mockCreaBatch(...args),
  correggiDati: (...args) => mockCorreggiDati(...args),
  segnaPagato: (...args) => mockSegnaPagato(...args),
  segnaFallito: (...args) => mockSegnaFallito(...args),
  segnaAnnullato: (...args) => mockSegnaAnnullato(...args),
  ripristinaProposto: (...args) => mockRipristinaProposto(...args),
  eliminaLista: (...args) => mockEliminaLista(...args),
  residuoAssociazione: (...args) => mockResiduo(...args)
}

vi.mock('stores/pagamenti.store', () => ({
  usePagamentiStore: () => pagamentiState
}))

vi.mock('src/utils/notify', () => ({
  notifySuccess: (...args) => mockNotifySuccess(...args),
  notifyError: (...args) => mockNotifyError(...args)
}))

vi.mock('src/utils/assets', () => ({
  assetUrl: (file, absolute) => (absolute ? `https://files/${file}` : `/files/${file}`)
}))

vi.mock('src/utils/formatters', () => ({
  formatDate: () => '2026-06-30'
}))

vi.mock('src/utils/iban-validator', () => ({
  IBAN_RULES: [],
  sanitizeIBAN: value => value?.replaceAll(' ', '') || ''
}))

vi.mock('quasar', () => ({
  useQuasar: () => ({
    screen: { lt: { sm: false } },
    dialog: (...args) => mockDialog(...args)
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

describe('PagamentiTab', () => {
  let anchor
  let createElementSpy
  const originalCreateElement = document.createElement.bind(document)

  beforeEach(() => {
    vi.clearAllMocks()
    pagamentiState.associazioni = [{ Nome: 'Assoc 1' }, { Nome: 'Assoc 2' }]
    pagamentiState.proposti = [{ id: 1, Importo: '10.50', Famiglia: { Nome_Famiglia: 'Fam A' } }]
    pagamentiState.inCorso = [
      {
        id: 11,
        Importo: '20',
        Batch: 'b1',
        Stato: 'in_pagamento',
        Famiglia: { Nome_Famiglia: 'Fam B' },
        IBAN: 'IT1',
        Intestatario: 'Mario'
      },
      {
        id: 12,
        Importo: '30',
        Batch: 'b2',
        Stato: 'pagato',
        Famiglia: { Nome_Famiglia: 'Fam C' },
        IBAN: 'IT2',
        Intestatario: 'Anna'
      }
    ]
    pagamentiState.falliti = [
      { id: 21, Importo: '40', IBAN: 'ITX', Intestatario: 'Luca', Famiglia: { Nome_Famiglia: 'Fam D' } }
    ]
    pagamentiState.batches = [{ id: 'b1', Nome: 'Batch 1' }]
    pagamentiState.liste = []
    mockDialog.mockReturnValue(okDialog())
    mockResiduo.mockReturnValue(100)

    anchor = { click: vi.fn(), href: '', download: '' }
    createElementSpy = vi.spyOn(document, 'createElement').mockImplementation(tag => {
      if (tag === 'a') return anchor
      return originalCreateElement(tag)
    })

    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:test'),
      revokeObjectURL: vi.fn()
    })
  })

  afterEach(() => {
    createElementSpy.mockRestore()
    vi.unstubAllGlobals()
  })

  it('initializes on mount and computes helpers', () => {
    const wrapper = quasarMount(PagamentiTab)

    expect(mockInit).toHaveBeenCalled()
    expect(wrapper.vm.assocOptions).toEqual([
      { label: 'Assoc 1', value: 'Assoc 1' },
      { label: 'Assoc 2', value: 'Assoc 2' }
    ])
    expect(wrapper.vm.batchOptions).toEqual([{ label: 'Batch 1', value: 'b1' }])
    expect(wrapper.vm.formatNumber('10.5')).toBe('10.50')
    expect(wrapper.vm.residuo('Assoc 1')).toBe(100)
    expect(wrapper.vm.selectedTotal).toBe(0)
  })

  it('opens batch dialog only when rows are selected', () => {
    const wrapper = quasarMount(PagamentiTab)

    wrapper.vm.openCreaBatch()
    expect(wrapper.vm.showBatchDialog).toBe(false)

    wrapper.vm.selected = [{ id: 1 }]
    wrapper.vm.openCreaBatch()
    expect(wrapper.vm.showBatchDialog).toBe(true)
    expect(wrapper.vm.batchNome).toBe('')
  })

  it('creates a batch successfully and handles errors', async () => {
    mockCreaBatch.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('boom'))
    const wrapper = quasarMount(PagamentiTab)
    wrapper.vm.selected = [{ id: 1 }, { id: 2 }]
    wrapper.vm.batchNome = 'Batch Test'
    wrapper.vm.batchAssociazione = 'Assoc 1'
    wrapper.vm.showBatchDialog = true

    await wrapper.vm.creaBatch()
    expect(mockCreaBatch).toHaveBeenCalledWith({
      nome: 'Batch Test',
      associazione: 'Assoc 1',
      pagamentoIds: [1, 2]
    })
    expect(wrapper.vm.showBatchDialog).toBe(false)
    expect(wrapper.vm.selected).toEqual([])
    expect(mockNotifySuccess).toHaveBeenCalled()

    wrapper.vm.selected = [{ id: 3 }]
    await wrapper.vm.creaBatch()
    expect(mockNotifyError).toHaveBeenCalled()
  })

  it('handles payment status transitions', async () => {
    mockSegnaPagato.mockResolvedValue({})
    mockSegnaFallito.mockResolvedValue({})
    mockSegnaAnnullato.mockResolvedValue({})
    const wrapper = quasarMount(PagamentiTab)

    await wrapper.vm.handlePagato({ id: 11 })
    expect(mockSegnaPagato).toHaveBeenCalledWith(11)

    mockDialog.mockImplementationOnce(() => ({
      onOk(cb) {
        cb('IBAN errato')
        return this
      }
    }))
    await wrapper.vm.handleFallito({ id: 11 })
    expect(mockSegnaFallito).toHaveBeenCalledWith(11, 'IBAN errato')

    await wrapper.vm.handleAnnullato({ id: 11 })
    expect(mockSegnaAnnullato).toHaveBeenCalledWith(11)
    expect(mockNotifySuccess).toHaveBeenCalled()
  })

  it('handles ripristino proposto for falliti', async () => {
    mockCorreggiDati.mockResolvedValue({})
    mockRipristinaProposto.mockResolvedValue({})
    const wrapper = quasarMount(PagamentiTab)
    const row = { id: 21, IBAN: 'ITX', Intestatario: 'Luca' }

    wrapper.vm.editFallito(row, 'IBAN', 'IT 99')
    wrapper.vm.editFallito(row, 'Intestatario', 'Mario Rossi')
    wrapper.vm.selectedFalliti = [row]

    await wrapper.vm.handleRipristinaProposti()

    expect(mockCorreggiDati).toHaveBeenCalledWith(21, {
      iban: 'IT 99',
      intestatario: 'Mario Rossi'
    })
    expect(mockRipristinaProposto).toHaveBeenCalledWith(21)
    expect(mockNotifySuccess).toHaveBeenCalledWith(expect.anything(), '1 pagamenti ripristinati a Bonifici')
  })

})
