import { describe, it, expect, vi, beforeEach } from 'vitest'
import { syncProgettoAggregati } from 'src/usecases/progetti'

const mockGetProgettoById = vi.fn()
const mockGetGiustificativiByProgetto = vi.fn()
const mockUpdateProgetto = vi.fn()

vi.mock('src/services/verifica.service', () => ({
  verificaService: {
    getProgettoById: (...a) => mockGetProgettoById(...a),
    getGiustificativiByProgetto: (...a) => mockGetGiustificativiByProgetto(...a),
    updateProgetto: (...a) => mockUpdateProgetto(...a)
  }
}))

describe('syncProgettoAggregati', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ricalcola e scrive solo i campi derivati', async () => {
    mockGetProgettoById.mockResolvedValue({
      data: { data: { id_progetto: 1, StatoProgetto: 'accettato', Allocato: '1000', TotalePagato: 0 } }
    })
    mockGetGiustificativiByProgetto.mockResolvedValue({
      data: { data: [{ Stato: 'inviato', Importo: '200', Invalidato: false }] }
    })
    mockUpdateProgetto.mockResolvedValue({})
    const payload = await syncProgettoAggregati(1)
    expect(mockUpdateProgetto).toHaveBeenCalledWith(1, {
      TotaleGiustificativi: 1,
      TotaleImporto: 200,
      StatoRendicontazione: 'in_attesa',
      StatoProgetto: 'in_rendicontazione'
    })
    expect(payload).toEqual({
      TotaleGiustificativi: 1,
      TotaleImporto: 200,
      StatoRendicontazione: 'in_attesa',
      statoProgetto: 'in_rendicontazione'
    })
  })

  it('è best-effort: non lancia e ritorna null su errore', async () => {
    mockGetProgettoById.mockRejectedValue(new Error('boom'))
    await expect(syncProgettoAggregati(1)).resolves.toBeNull()
  })

  it('ritorna null se il progetto non esiste o id mancante', async () => {
    mockGetProgettoById.mockResolvedValue({ data: { data: null } })
    expect(await syncProgettoAggregati(1)).toBeNull()
    expect(await syncProgettoAggregati(null)).toBeNull()
    expect(mockUpdateProgetto).not.toHaveBeenCalled()
  })
})
