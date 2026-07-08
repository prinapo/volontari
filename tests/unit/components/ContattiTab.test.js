import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { quasarMount } from '../quasar-mount'
import ContattiTab from 'src/components/Gestione/ContattiTab.vue'

const mockQuery = vi.fn()
const mockGetByIds = vi.fn()
const mockQueryFamiglieContatti = vi.fn()
const mockEnrichWithEmails = vi.fn()

vi.mock('src/services/contatti.service', () => ({
  contattiService: { query: (...args) => mockQuery(...args) }
}))

vi.mock('src/services/users.service', () => ({
  usersService: { getByIds: (...args) => mockGetByIds(...args) }
}))

vi.mock('src/services/gestione.service', () => ({
  gestioneService: { queryFamiglieContatti: (...args) => mockQueryFamiglieContatti(...args) }
}))

vi.mock('src/services/email.service', () => ({
  emailService: { getByContatto: vi.fn() }
}))

vi.mock('src/utils/enrichment', () => ({
  enrichWithEmails: (...args) => mockEnrichWithEmails(...args)
}))

async function flushAll() {
  await nextTick()
  await Promise.resolve()
  await nextTick()
}

describe('ContattiTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockQuery.mockImplementation(() =>
      Promise.resolve({
        data: {
          data: [
            {
              id_contatto: 'cont-1',
              Nome: 'Mario',
              Cognome: 'Rossi',
              Numero_di_cellulare: '+39123',
              Numero_di_telefono: '02123',
              user_id: 'user-1',
              IsVolontario: true,
              IsGenitore: false,
              IsReferente: true
            },
            {
              id_contatto: 'cont-2',
              Nome: 'Anna',
              Cognome: 'Verdi',
              user_id: null,
              IsVolontario: false,
              IsGenitore: true,
              IsReferente: false
            }
          ],
          meta: { filter_count: 2 }
        }
      })
    )

    mockGetByIds.mockResolvedValue({
      data: {
        data: [{ id: 'user-1', email: 'mario@login.it', status: 'active' }]
      }
    })

    mockQueryFamiglieContatti.mockResolvedValue({
      data: {
        data: [{ Contatto: 'cont-1' }, { Contatto: 'cont-1' }, { Contatto: 'cont-2' }]
      }
    })

    mockEnrichWithEmails.mockResolvedValue({
      'cont-1': [{ email_address: 'mario@test.it', Primary: true }],
      'cont-2': [{ email_address: 'anna@test.it', Primary: true }]
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function mountTab() {
    return quasarMount(ContattiTab, {
      global: {
        stubs: {
          ContattoDialog: { template: '<div />' },
          AssegnaFamigliaDialog: { template: '<div />' },
          AssegnaReferenteDialog: { template: '<div />' }
        }
      }
    })
  }

  it('loads and enriches rows on mount', async () => {
    const wrapper = mountTab()
    await flushAll()
    vi.clearAllMocks()

    await wrapper.vm.onRequest({
      pagination: wrapper.vm.pagination
    })
    await flushAll()

    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 25,
        offset: 0,
        sort: 'Cognome',
        stato: undefined
      })
    )
    expect(mockGetByIds).toHaveBeenCalledWith(['user-1'])
    expect(mockQueryFamiglieContatti).toHaveBeenCalledWith(['cont-1', 'cont-2'])
    expect(mockEnrichWithEmails).toHaveBeenCalledWith(['cont-1', 'cont-2'], expect.any(Function))
    expect(wrapper.vm.rows).toHaveLength(2)
    expect(wrapper.vm.rows[0].user_id.email).toBe('mario@login.it')
    expect(wrapper.vm.rows[1]._emails[0].email_address).toBe('anna@test.it')
    expect(wrapper.vm.famiglieCount).toEqual({ 'cont-1': 2, 'cont-2': 1 })
    expect(wrapper.vm.pagination.rowsNumber).toBe(2)
  })

  it('computes display labels, badge colors and filters', () => {
    const wrapper = mountTab()

    expect(wrapper.vm.displayNome({ Nome: 'Mario', Cognome: 'Rossi' })).toBe('Mario Rossi')
    expect(wrapper.vm.displayNome({})).toBe('—')
    expect(wrapper.vm.tipoBadgeColor('Volontario')).toBe('primary')
    expect(wrapper.vm.tipoBadgeColor('Genitore')).toBe('accent')
    expect(wrapper.vm.tipoBadgeColor('Referente')).toBe('teal')
    expect(wrapper.vm.tipoBadgeColor('Altro')).toBe('grey')
    expect(wrapper.vm.computedTipi({ IsVolontario: true, IsGenitore: true, IsReferente: false })).toEqual([
      'Volontario',
      'Genitore'
    ])
    expect(wrapper.vm.computedTipi({ IsVolontario: false, IsGenitore: false, IsReferente: false })).toEqual([
      'Contatto'
    ])

    wrapper.vm.tipoFilter = 'Contatto'
    expect(wrapper.vm.getQueryFilters()).toEqual({
      isVolontario: false,
      isGenitore: false,
      isReferente: false
    })
  })

  it('re-requests data on search and filter changes', async () => {
    vi.useFakeTimers()
    const wrapper = mountTab()
    await flushAll()
    vi.clearAllMocks()

    wrapper.vm.search = 'rossi'
    wrapper.vm.onSearch()
    vi.advanceTimersByTime(300)
    await flushAll()

    expect(mockQuery).toHaveBeenCalledWith(expect.objectContaining({ search: 'rossi' }))

    vi.clearAllMocks()
    wrapper.vm.tipoFilter = 'Volontario'
    wrapper.vm.statoFilter = 'Disattivati'
    wrapper.vm.onFilterChange()
    await flushAll()

    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        isVolontario: true,
        stato: 'Disattivati'
      })
    )
  })

  it('opens create, edit and relation dialogs', async () => {
    const wrapper = mountTab()
    const row = { id_contatto: 'cont-1', Nome: 'Mario', Cognome: 'Rossi', IsVolontario: true }

    wrapper.vm.openCreate()
    expect(wrapper.vm.showDialog).toBe(true)
    expect(wrapper.vm.editingItem).toBe(null)

    wrapper.vm.openEdit(row)
    expect(wrapper.vm.editingItem).toEqual(row)

    wrapper.vm.openFamiglie(row)
    expect(wrapper.vm.showFamiglie).toBe(true)
    expect(wrapper.vm.famiglieTarget).toEqual(row)

    wrapper.vm.openReferente(row)
    expect(wrapper.vm.showReferente).toBe(true)
    expect(wrapper.vm.referenteTarget).toEqual(row)

    vi.clearAllMocks()
    await wrapper.vm.onSaved()
    expect(mockQuery).toHaveBeenCalled()
  })

  it('handles request failures by clearing rows', async () => {
    mockQuery.mockRejectedValueOnce(new Error('boom'))
    const wrapper = mountTab()
    await flushAll()

    expect(wrapper.vm.rows).toEqual([])
    expect(wrapper.vm.loading).toBe(false)
  })
})
