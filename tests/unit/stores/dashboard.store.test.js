import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useDashboardStore, buildAggregati } from 'src/stores/dashboard.store'

const mockGetProgetti = vi.fn()
const mockGetPagamenti = vi.fn()

vi.mock('src/services/dashboard.service', () => ({
  dashboardService: {
    getProgetti: (...a) => mockGetProgetti(...a),
    getPagamenti: (...a) => mockGetPagamenti(...a)
  }
}))

const progetti = [
  {
    id_progetto: 'P1',
    AnnoBando: 2025,
    Allocato: '1000',
    TotaleImporto: '800',
    TotaleVerificato: '700',
    TotaleProposto: '100',
    TotaleInPagamento: '200',
    TotalePagato: '300',
    ResiduoAllocato: '400',
    StatoProgetto: 'aperto',
    StatoRendicontazione: 'verificato',
    Ambito: 'Scolastico',
    Famiglia: 'F1',
    Indice_Gravita_Disabilita: 3,
    ISEE: 12_000
  },
  {
    id_progetto: 'P2',
    AnnoBando: 2025,
    Allocato: '500',
    TotaleImporto: '400',
    TotaleVerificato: '300',
    TotaleProposto: '0',
    TotaleInPagamento: '0',
    TotalePagato: '200',
    ResiduoAllocato: '300',
    StatoProgetto: 'chiuso',
    StatoRendicontazione: 'verificato',
    Ambito: 'Sociale',
    Famiglia: 'F1',
    Indice_Gravita_Disabilita: 2,
    ISEE: 60_000
  },
  {
    id_progetto: 'P3',
    AnnoBando: 2026,
    Allocato: '2000',
    TotaleImporto: '500',
    TotaleVerificato: '0',
    TotaleProposto: '0',
    TotaleInPagamento: '0',
    TotalePagato: '0',
    ResiduoAllocato: '2000',
    StatoProgetto: 'aperto',
    StatoRendicontazione: 'bozza',
    Ambito: 'Sociale',
    Famiglia: 'F2',
    Indice_Gravita_Disabilita: 3,
    ISEE: 4500
  }
]

const pagamenti = [
  { Stato: 'pagato', Importo: '500', DataProposta: '2025-06-01T10:00:00.000Z' },
  { Stato: 'in_pagamento', Importo: '200', DataProposta: '2025-07-01T10:00:00.000Z' },
  { Stato: 'fallito', Importo: '50', DataProposta: '2026-01-15T10:00:00.000Z' }
]

describe('buildAggregati', () => {
  it('aggrega per anno e totali', () => {
    const d = buildAggregati(progetti, pagamenti)

    expect(d.byYear[2025].progetti).toBe(2)
    expect(d.byYear[2025].famiglie).toBe(1)
    expect(d.byYear[2025].allocato).toBe(1500)
    expect(d.byYear[2025].pagato).toBe(500)
    expect(d.byYear[2025].chiusi).toBe(1)
    expect(d.byYear[2025].perAmbito.Scolastico).toBe(1)
    expect(d.byYear[2025].perAmbito.Sociale).toBe(1)
    expect(d.byYear[2025].perStatoRendicontazione.verificato).toBe(1)
    expect(d.byYear[2025].perStatoRendicontazione.chiuso).toBe(1)

    expect(d.byYear[2026].progetti).toBe(1)
    expect(d.byYear[2026].famiglie).toBe(1)

    expect(d.totali.progetti).toBe(3)
    expect(d.totali.famiglie).toBe(2)
    expect(d.totali.allocato).toBe(3500)

    expect(d.pagByStato.pagato).toBe(500)
    expect(d.pagByYear[2026].fallito).toBe(50)
  })
})

describe('dashboard store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetchDashboard carica e calcola le metriche', async () => {
    mockGetProgetti.mockResolvedValue({ data: { data: progetti } })
    mockGetPagamenti.mockResolvedValue({ data: { data: pagamenti } })
    const store = useDashboardStore()
    await store.fetchDashboard()

    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.anni).toEqual([2026, 2025])

    const m = store.metriche
    expect(m.progetti).toBe(3)
    expect(m.allocato).toBe(3500)
    expect(store.gauge).toBe(20)
    expect(store.sommaPagamenti).toBe(700)
    expect(store.pctTotale).toBe(20)
    expect(store.pctPagato).toBe(14)
    expect(store.pctInPagamento).toBe(6)
    expect(store.pctRendicontato).toBe(49)
    expect(store.pctVerificato).toBe(29)
    expect(store.residuoLive).toBe(2700)

    expect(store.barProgressi).toHaveLength(2)
    expect(store.serieProgettiStati).toEqual([
      { anno: 2025, stati: { verificato: 1, chiuso: 1 } },
      { anno: 2026, stati: { bozza: 1 } }
    ])
    expect(store.donutAmbito.length).toBeGreaterThanOrEqual(2)
    expect(store.donutStati.find(x => x.name === 'verificato').value).toBe(1)
    expect(store.donutStati.find(x => x.name === 'chiuso').value).toBe(1)
    expect(store.donutGravita).toEqual([
      { name: '2', value: 1 },
      { name: '3', value: 2 }
    ])
    expect(store.iseeSerie).toEqual([
      { bucket: '0-5000', count: 1, allocato: 2000 },
      { bucket: '10000-15000', count: 1, allocato: 1000 },
      { bucket: 'oltre 50000', count: 1, allocato: 500 }
    ])
    expect(store.donutPagamenti.find(x => x.name === 'pagato').value).toBe(500)
  })

  it('metriche rispetta selectedAnno', async () => {
    mockGetProgetti.mockResolvedValue({ data: { data: progetti } })
    mockGetPagamenti.mockResolvedValue({ data: { data: pagamenti } })
    const store = useDashboardStore()
    await store.fetchDashboard()
    store.selectedAnno = 2025

    expect(store.metriche.progetti).toBe(2)
    expect(store.donutPagamenti.find(x => x.name === 'in_pagamento').value).toBe(200)
  })

  it('fetchDashboard gestisce l errore', async () => {
    mockGetProgetti.mockRejectedValue(new Error('dashboard fail'))
    const store = useDashboardStore()
    await store.fetchDashboard()

    expect(store.error).toBe('dashboard fail')
    expect(store.data).toBeNull()
  })
})
