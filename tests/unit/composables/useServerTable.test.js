import { describe, it, expect, vi } from 'vitest'
import { useServerTable } from 'src/composables/useServerTable'

describe('useServerTable — sortMap', () => {
  function setup(sortMap = {}) {
    const fetchFn = vi.fn().mockResolvedValue({ rows: [], total: 0 })
    const table = useServerTable(fetchFn, { sortMap, perPage: 25 })
    return { fetchFn, table }
  }

  it('invio di default senza sortBy non include il sort', async () => {
    const { fetchFn, table } = setup()
    await table.loadData()
    expect(fetchFn).toHaveBeenCalledWith(expect.objectContaining({ sort: undefined }))
  })

  it('mappa il nome colonna al campo Directus tramite sortMap', async () => {
    const { fetchFn, table } = setup({ nome: 'Cognome', famiglia: 'Famiglia.Nome_Famiglia' })
    table.pagination.value.sortBy = 'nome'
    await table.loadData()
    expect(fetchFn).toHaveBeenCalledWith(expect.objectContaining({ sort: 'Cognome' }))

    table.pagination.value.sortBy = 'famiglia'
    await table.loadData()
    expect(fetchFn).toHaveBeenLastCalledWith(expect.objectContaining({ sort: 'Famiglia.Nome_Famiglia' }))
  })

  it('prefissa il `-` quando il sort è discendente', async () => {
    const { fetchFn, table } = setup({ allocato: 'Allocato' })
    table.pagination.value.sortBy = 'allocato'
    table.pagination.value.descending = true
    await table.loadData()
    expect(fetchFn).toHaveBeenCalledWith(expect.objectContaining({ sort: '-Allocato' }))
  })

  it('usa il nome colonna as-is quando non è in sortMap', async () => {
    const { fetchFn, table } = setup({})
    table.pagination.value.sortBy = 'DataInvio'
    await table.loadData()
    expect(fetchFn).toHaveBeenCalledWith(expect.objectContaining({ sort: 'DataInvio' }))
  })
})
