import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sincronizzaStatiPagamento } from 'src/usecases/sincronizzazione'

const mockGetList = vi.fn()
const mockGetGiustificativiByProgetti = vi.fn()
const mockGetPagamenti = vi.fn()
const mockUpdateGiustificativo = vi.fn()

vi.mock('src/services/progetti.service', () => ({
  progettiService: { getList: (...a) => mockGetList(...a) }
}))
vi.mock('src/services/verifica.service', () => ({
  verificaService: { getGiustificativiByProgetti: (...a) => mockGetGiustificativiByProgetti(...a) }
}))
vi.mock('src/services/pagamenti.service', () => ({
  pagamentiService: { getPagamenti: (...a) => mockGetPagamenti(...a) }
}))
vi.mock('src/services/giustificativi.service', () => ({
  giustificativiService: { update: (...a) => mockUpdateGiustificativo(...a) }
}))

function setup({ allocato, pagato, giustificativi, pagamenti }) {
  mockGetList.mockResolvedValue({
    data: {
      data: [
        { id_progetto: 'P1', Allocato: String(allocato), MassimaPercentualeErogabile: 80, TotalePagato: String(pagato) }
      ]
    }
  })
  mockGetGiustificativiByProgetti.mockResolvedValue({ data: { data: giustificativi } })
  mockGetPagamenti.mockResolvedValue({ data: { data: pagamenti } })
  mockUpdateGiustificativo.mockResolvedValue({})
}

describe('sincronizzaStatiPagamento', () => {
  beforeEach(() => vi.clearAllMocks())

  it('allocazione FIFO per id: i vecchi pagato, i nuovi verificato', async () => {
    setup({
      allocato: 2400,
      pagato: 1255.2,
      giustificativi: [
        { id: 1, Progetto: 'P1', Importo: '640', Stato: 'verificato', Invalidato: false, Pagamento: null },
        { id: 2, Progetto: 'P1', Importo: '387', Stato: 'verificato', Invalidato: false, Pagamento: null },
        { id: 3, Progetto: 'P1', Importo: '542', Stato: 'verificato', Invalidato: false, Pagamento: null },
        { id: 4, Progetto: 'P1', Importo: '762', Stato: 'verificato', Invalidato: false, Pagamento: null }
      ],
      pagamenti: [{ id: 5, Progetto: 'P1', Importo: '1255.20', Stato: 'pagato', DataProposta: '2026-08-01' }]
    })

    const res = await sincronizzaStatiPagamento()

    const perId = Object.fromEntries(res.voci.map(v => [v.id, v.data]))
    expect(perId[1].Stato).toBe('pagato')
    expect(perId[2].Stato).toBe('pagato')
    expect(perId[3].Stato).toBe('pagato')
    expect(perId[1].Pagamento).toBe(5)
    // il quarto è già verificato e non collegato: nessuna scrittura
    expect(perId[4]).toBeUndefined()
    expect(mockUpdateGiustificativo).not.toHaveBeenCalledWith(4, expect.anything())
  })

  it('allocato raggiunto → tutti pagato (anche eccedenti)', async () => {
    setup({
      allocato: 680,
      pagato: 680,
      giustificativi: [
        { id: 10, Progetto: 'P1', Importo: '400', Stato: 'verificato', Invalidato: false, Pagamento: null },
        { id: 11, Progetto: 'P1', Importo: '679', Stato: 'verificato', Invalidato: false, Pagamento: null }
      ],
      pagamenti: [{ id: 7, Progetto: 'P1', Importo: '680', Stato: 'pagato', DataProposta: '2026-08-01' }]
    })

    const res = await sincronizzaStatiPagamento()

    expect(res.voci).toHaveLength(2)
    expect(res.voci.every(v => v.data.Stato === 'pagato')).toBe(true)
  })

  it('in_pagamento marca i coperti come in_pagamento', async () => {
    setup({
      allocato: 5000,
      pagato: 0,
      giustificativi: [
        { id: 20, Progetto: 'P1', Importo: '500', Stato: 'verificato', Invalidato: false, Pagamento: null },
        { id: 21, Progetto: 'P1', Importo: '500', Stato: 'verificato', Invalidato: false, Pagamento: null }
      ],
      pagamenti: [{ id: 8, Progetto: 'P1', Importo: '400', Stato: 'in_pagamento', DataProposta: '2026-08-01' }]
    })

    const res = await sincronizzaStatiPagamento()

    const perId = Object.fromEntries(res.voci.map(v => [v.id, v.data]))
    expect(perId[20].Stato).toBe('in_pagamento')
    expect(perId[21]).toBeUndefined()
  })

  it('dryRun non scrive ma ritorna il piano', async () => {
    setup({
      allocato: 2400,
      pagato: 1255.2,
      giustificativi: [
        { id: 1, Progetto: 'P1', Importo: '640', Stato: 'verificato', Invalidato: false, Pagamento: null }
      ],
      pagamenti: [{ id: 5, Progetto: 'P1', Importo: '1255.20', Stato: 'pagato', DataProposta: '2026-08-01' }]
    })

    const res = await sincronizzaStatiPagamento({ dryRun: true })

    expect(res.totale).toBe(1)
    expect(res.aggiornati).toBe(0)
    expect(mockUpdateGiustificativo).not.toHaveBeenCalled()
  })
})
