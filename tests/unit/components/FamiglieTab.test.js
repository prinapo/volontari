import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { quasarMount } from '../quasar-mount'
import FamiglieTab from 'src/components/Gestione/FamiglieTab.vue'

const mockFetchAll = vi.fn()
const mockGetContattiByFamiglia = vi.fn()
const mockEnrichWithEmails = vi.fn()

const gestioneState = {
  famiglie: [{ id_famiglia: 'fam-1', Nome_Famiglia: 'Famiglia Uno', HasVolontario: true }],
  totalFamiglie: 1,
  loading: false,
  volontarioFilter: 'tutti',
  fetchAll: (...args) => mockFetchAll(...args)
}

vi.mock('stores/gestione.store', () => ({
  useGestioneStore: () => gestioneState
}))

vi.mock('src/services/gestione.service', () => ({
  gestioneService: {
    getContattiByFamiglia: (...args) => mockGetContattiByFamiglia(...args)
  }
}))

vi.mock('src/services/email.service', () => ({
  emailService: {
    getByContatto: vi.fn()
  }
}))

vi.mock('src/utils/enrichment', () => ({
  enrichWithEmails: (...args) => mockEnrichWithEmails(...args)
}))

async function flushAll() {
  await nextTick()
  await Promise.resolve()
  await nextTick()
}

describe('FamiglieTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    gestioneState.famiglie = [{ id_famiglia: 'fam-1', Nome_Famiglia: 'Famiglia Uno', HasVolontario: true }]
    gestioneState.totalFamiglie = 1
    gestioneState.loading = false
    gestioneState.volontarioFilter = 'tutti'

    mockGetContattiByFamiglia.mockResolvedValue({
      data: {
        data: [
          {
            id: 'fc-1',
            Ruolo_nella_Famiglia: 'Genitore',
            Contatto: { id_contatto: 'cont-1', Nome: 'Anna', Cognome: 'Verdi' }
          },
          {
            id: 'fc-2',
            Ruolo_nella_Famiglia: 'Volontario',
            Contatto: { id_contatto: 'cont-2', Nome: 'Mario', Cognome: 'Rossi' }
          }
        ]
      }
    })

    mockEnrichWithEmails.mockResolvedValue({
      'cont-1': [{ email_address: 'anna@test.it', Primary: true }],
      'cont-2': [{ email_address: 'mario@test.it', Primary: true }]
    })
  })

  function mountTab() {
    return quasarMount(FamiglieTab, {
      global: {
        stubs: {
          FamigliaDialog: { template: '<div />' },
          ContattiDialog: { template: '<div />' }
        }
      }
    })
  }

  it('loads families on mount using current pagination', async () => {
    const wrapper = mountTab()
    await flushAll()

    expect(mockFetchAll).toHaveBeenCalledWith({
      page: 1,
      limit: 25,
      search: undefined,
      sort: undefined
    })
    expect(wrapper.vm.pagination.rowsNumber).toBe(1)
  })

  it('updates search, sorting and request pagination', async () => {
    const wrapper = mountTab()
    await flushAll()
    vi.clearAllMocks()

    wrapper.vm.search = 'rossi'
    wrapper.vm.onSearchChange()
    await flushAll()
    expect(mockFetchAll).toHaveBeenCalledWith({
      page: 1,
      limit: 25,
      search: 'rossi',
      sort: undefined
    })

    vi.clearAllMocks()
    await wrapper.vm.onRequest({
      pagination: { page: 2, rowsPerPage: 10, sortBy: 'nome', descending: true }
    })
    expect(mockFetchAll).toHaveBeenCalledWith({
      page: 2,
      limit: 10,
      search: 'rossi',
      sort: '-Nome_Famiglia'
    })
  })

  it('reloads when volontario filter changes', async () => {
    const wrapper = mountTab()
    await flushAll()
    vi.clearAllMocks()

    wrapper.vm.volontarioFilter = 'con'
    await flushAll()

    expect(gestioneState.volontarioFilter).toBe('con')
    expect(mockFetchAll).toHaveBeenCalled()
    expect(wrapper.vm.pagination.page).toBe(1)
  })

  it('loads expanded family contacts and caches enriched emails', async () => {
    const wrapper = mountTab()
    await flushAll()

    await wrapper.vm.loadExpanded({ id_famiglia: 'fam-1' })

    expect(mockGetContattiByFamiglia).toHaveBeenCalledWith('fam-1')
    expect(mockEnrichWithEmails).toHaveBeenCalledWith(['cont-1', 'cont-2'], expect.any(Function))
    expect(wrapper.vm.expandedCache['fam-1']).toHaveLength(2)
    expect(wrapper.vm.expandedCache['fam-1'][0]._emails[0].email_address).toBe('anna@test.it')

    vi.clearAllMocks()
    await wrapper.vm.loadExpanded({ id_famiglia: 'fam-1' })
    expect(mockGetContattiByFamiglia).not.toHaveBeenCalled()
  })

  it('handles expand failures and opens dialogs/helpers', async () => {
    mockGetContattiByFamiglia.mockRejectedValueOnce(new Error('boom'))
    const wrapper = mountTab()
    await flushAll()

    await wrapper.vm.loadExpanded({ id_famiglia: 'fam-err' })
    expect(wrapper.vm.expandedCache['fam-err']).toEqual([])
    expect(wrapper.vm.expandedLoading).toBe(false)

    wrapper.vm.openCreate()
    expect(wrapper.vm.showDialog).toBe(true)
    expect(wrapper.vm.editingItem).toBe(null)

    const row = { id_famiglia: 'fam-1', Nome_Famiglia: 'Famiglia Uno' }
    wrapper.vm.openContatti(row)
    expect(wrapper.vm.showContatti).toBe(true)
    expect(wrapper.vm.contattiTarget).toEqual(row)
  })
})
