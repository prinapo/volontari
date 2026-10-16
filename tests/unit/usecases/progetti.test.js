import { describe, it, expect, vi, beforeEach } from 'vitest'
import { avanzaStatoProgetto, syncProgettoAggregati } from 'src/usecases/progetti'
import { TransizioneNonValidaError } from 'src/usecases/stato/transita'

const mockGetProgettoById = vi.fn()
const mockGetGiustificativiByProgetto = vi.fn()
const mockUpdateProgetto = vi.fn()
const mockUpdateStats = vi.fn()
const mockGetPagamenti = vi.fn()

vi.mock('src/services/verifica.service', () => ({
  verificaService: {
    getProgettoById: (...a) => mockGetProgettoById(...a),
    getGiustificativiByProgetto: (...a) => mockGetGiustificativiByProgetto(...a),
    updateProgetto: (...a) => mockUpdateProgetto(...a)
  }
}))

vi.mock('src/services/pagamenti.service', () => ({
  pagamentiService: {
    getPagamenti: (...a) => mockGetPagamenti(...a)
  }
}))

vi.mock('src/services/progetti.service', () => ({
  progettiService: {
    updateStats: (...a) => mockUpdateStats(...a)
  }
}))

describe('syncProgettoAggregati', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetPagamenti.mockResolvedValue({ data: { data: [] } })
  })

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
    expect(payload).toEqual(
      expect.objectContaining({
        TotaleGiustificativi: 1,
        TotaleImporto: 200,
        StatoRendicontazione: 'in_attesa',
        statoProgetto: 'in_rendicontazione'
      })
    )
  })

  it('usa i pagamenti freschi (non il TotalePagato persistito) per lo stato', async () => {
    mockGetProgettoById.mockResolvedValue({
      data: { data: { id_progetto: 1, StatoProgetto: 'in_rendicontazione', Allocato: '1000', TotalePagato: 0 } }
    })
    mockGetGiustificativiByProgetto.mockResolvedValue({
      data: { data: [{ Stato: 'verificato', Importo: '800', Invalidato: false }] }
    })
    mockGetPagamenti.mockResolvedValue({ data: { data: [{ Stato: 'pagato', Importo: '400' }] } })
    mockUpdateProgetto.mockResolvedValue({})

    await syncProgettoAggregati(1)

    expect(mockUpdateProgetto).toHaveBeenCalledWith(1, {
      TotaleGiustificativi: 1,
      TotaleImporto: 800,
      StatoRendicontazione: 'verificato',
      StatoProgetto: 'rimborso_parziale'
    })
  })

  it('è best-effort: non lancia e ritorna null su errore', async () => {
    mockGetProgettoById.mockRejectedValue(new Error('boom'))
    await expect(syncProgettoAggregati(1)).resolves.toBeNull()
  })

  it('segnala una transizione non valida (stato sconosciuto) senza lanciare', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockGetProgettoById.mockResolvedValue({
      data: { data: { id_progetto: 1, StatoProgetto: 'foo', Allocato: '1000' } }
    })
    mockGetGiustificativiByProgetto.mockResolvedValue({
      data: { data: [{ Stato: 'inviato', Importo: '100', Invalidato: false }] }
    })
    mockUpdateProgetto.mockResolvedValue({})
    await expect(syncProgettoAggregati(1)).resolves.toBeNull()
    expect(errSpy).toHaveBeenCalled()
    errSpy.mockRestore()
  })

  it('ritorna null se il progetto non esiste o id mancante', async () => {
    mockGetProgettoById.mockResolvedValue({ data: { data: null } })
    expect(await syncProgettoAggregati(1)).toBeNull()
    expect(await syncProgettoAggregati(null)).toBeNull()
    expect(mockUpdateProgetto).not.toHaveBeenCalled()
  })
})

describe('avanzaStatoProgetto', () => {
  beforeEach(() => vi.clearAllMocks())

  it.each([
    ['proposto', 'validato'],
    ['validato', 'approvato'],
    ['approvato', 'accettato']
  ])('avanza %s → %s', async (da, atteso) => {
    mockGetProgettoById.mockResolvedValue({ data: { data: { id_progetto: 1, StatoProgetto: da } } })
    mockUpdateStats.mockResolvedValue({})
    const res = await avanzaStatoProgetto(1)
    expect(res).toBe(atteso)
    expect(mockUpdateStats).toHaveBeenCalledWith(1, { StatoProgetto: atteso })
  })

  it('rifiuta uno stato non in fase manuale', async () => {
    mockGetProgettoById.mockResolvedValue({
      data: { data: { id_progetto: 1, StatoProgetto: 'in_rendicontazione' } }
    })
    await expect(avanzaStatoProgetto(1)).rejects.toBeInstanceOf(TransizioneNonValidaError)
    expect(mockUpdateStats).not.toHaveBeenCalled()
  })

  it('normalizza il legacy aperto (accettato) e rifiuta', async () => {
    mockGetProgettoById.mockResolvedValue({ data: { data: { id_progetto: 1, StatoProgetto: 'aperto' } } })
    await expect(avanzaStatoProgetto(1)).rejects.toBeInstanceOf(TransizioneNonValidaError)
  })

  it('progetto non trovato', async () => {
    mockGetProgettoById.mockResolvedValue({ data: { data: null } })
    await expect(avanzaStatoProgetto(1)).rejects.toThrow('Progetto non trovato')
  })
})
