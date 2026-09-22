import { describe, expect, it } from 'vitest'
import {
  assembleFamiglieIdFilter,
  buildContattiRoleFilter,
  intersectIdSets,
  relId,
  unionIdSets
} from 'src/utils/filtriComunicazioni'

describe('buildContattiRoleFilter', () => {
  it('ritorna null senza ruoli', () => {
    expect(buildContattiRoleFilter([])).toBeNull()
  })

  it('costruisce un singolo booleano', () => {
    expect(buildContattiRoleFilter(['Volontario'])).toEqual({ IsVolontario: { _eq: true } })
  })

  it('unisce più ruoli in _or', () => {
    expect(buildContattiRoleFilter(['Volontario', 'Referente'])).toEqual({
      _or: [{ IsVolontario: { _eq: true } }, { IsReferente: { _eq: true } }]
    })
  })
})

describe('intersectIdSets', () => {
  it('ritorna null senza set', () => {
    expect(intersectIdSets([])).toBeNull()
  })

  it('interseca i set', () => {
    expect([...intersectIdSets([new Set([1, 2]), new Set([2, 3])])]).toEqual([2])
  })

  it('con un set vuoto il risultato è vuoto', () => {
    expect(intersectIdSets([new Set([1, 2]), new Set()]).size).toBe(0)
  })
})

describe('unionIdSets', () => {
  it('unisce i set', () => {
    expect([...unionIdSets([new Set([1]), new Set([2, 3])])].sort((a, b) => a - b)).toEqual([1, 2, 3])
  })
})

describe('assembleFamiglieIdFilter', () => {
  it('senza insiemi ritorna oggetto vuoto', () => {
    expect(assembleFamiglieIdFilter({})).toEqual({})
  })

  it('include soli id', () => {
    expect(assembleFamiglieIdFilter({ includeIds: new Set([1, 2]) })).toEqual({ id_famiglia: { _in: [1, 2] } })
  })

  it('combina include ed exclude in _and', () => {
    expect(assembleFamiglieIdFilter({ includeIds: new Set([1]), excludeIds: new Set([2]) })).toEqual({
      _and: [{ id_famiglia: { _in: [1] } }, { id_famiglia: { _nin: [2] } }]
    })
  })

  it('un set vuoto in include produce _in vuoto', () => {
    expect(assembleFamiglieIdFilter({ includeIds: new Set() })).toEqual({ id_famiglia: { _in: [] } })
  })
})

describe('relId', () => {
  it('ritorna null su valore assente', () => {
    expect(relId(null)).toBeNull()
  })

  it('ritorna il numero se scalare', () => {
    expect(relId(5)).toBe(5)
  })

  it('estrae l id da oggetto', () => {
    expect(relId({ id: 7 })).toBe(7)
    expect(relId({ id_famiglia: 9 })).toBe(9)
  })
})
