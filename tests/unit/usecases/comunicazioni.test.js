import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildPayload, contaDestinatari, inviaComunicazione } from 'src/usecases/comunicazioni'

const mockGetProgetti = vi.fn()
const mockGetGiustificativi = vi.fn()
const mockGetPagamenti = vi.fn()
const mockGetFamiglieContatti = vi.fn()
const mockCountRecipients = vi.fn()
const mockSend = vi.fn()

vi.mock('src/services/comunicazioni.service', () => ({
  comunicazioniService: {
    getProgetti: (...args) => mockGetProgetti(...args),
    getGiustificativi: (...args) => mockGetGiustificativi(...args),
    getPagamenti: (...args) => mockGetPagamenti(...args),
    getFamiglieContatti: (...args) => mockGetFamiglieContatti(...args),
    countRecipients: (...args) => mockCountRecipients(...args),
    send: (...args) => mockSend(...args)
  }
}))

function response(rows) {
  return { data: { data: rows } }
}

describe('comunicazioni usecase', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetProgetti.mockResolvedValue(response([]))
    mockGetGiustificativi.mockResolvedValue(response([]))
    mockGetPagamenti.mockResolvedValue(response([]))
    mockGetFamiglieContatti.mockResolvedValue(response([]))
  })

  it('audience contatti: filtro ruoli', async () => {
    const payload = await buildPayload({ audience: 'contatti', ruoli: ['Volontario'] })
    expect(payload).toEqual({ audience: 'contatti', filter: { IsVolontario: { _eq: true } } })
  })

  it('audience contatto: passa il contatto scelto', async () => {
    const payload = await buildPayload({ audience: 'contatto', contattoId: 42 })
    expect(payload).toEqual({ audience: 'contatto', contattoId: 42 })
  })

  it('include il filtro cognome quando valorizzato', async () => {
    const payload = await buildPayload({ audience: 'contatti', ruoli: ['Volontario'], cognome: ' Prin ' })
    expect(payload.cognome).toBe('Prin')
  })

  it('non include cognome se vuoto', async () => {
    const payload = await buildPayload({ audience: 'contatti', ruoli: ['Volontario'], cognome: '  ' })
    expect(payload.cognome).toBeUndefined()
  })

  it('audience famiglie: interseca stato progetto ed esclude chi ha un volontario', async () => {
    mockGetProgetti.mockResolvedValue(response([{ Famiglia: 1 }, { Famiglia: 2 }]))
    mockGetFamiglieContatti.mockResolvedValue(response([{ Famiglia: 1 }]))

    const payload = await buildPayload({
      audience: 'famiglie',
      statoProgetto: ['accettato'],
      senzaVolontario: true
    })

    expect(payload.audience).toBe('famiglie')
    expect(payload.filterFamiglia).toEqual({
      _and: [{ id_famiglia: { _in: [1, 2] } }, { id_famiglia: { _nin: [1] } }]
    })
  })

  it('giustificativi "nessuno": esclude le famiglie con giustificativi', async () => {
    mockGetGiustificativi.mockResolvedValue(response([{ Famiglia: 7, Stato: 'draft', Invalidato: false }]))

    const payload = await buildPayload({ audience: 'famiglie', giustificativi: 'nessuno' })
    expect(payload.filterFamiglia).toEqual({ id_famiglia: { _nin: [7] } })
  })

  it('giustificativi "almeno_inviato": include solo chi ha uno stato valido', async () => {
    mockGetGiustificativi.mockResolvedValue(
      response([
        { Famiglia: 7, Stato: 'draft', Invalidato: false },
        { Famiglia: 8, Stato: 'inviato', Invalidato: false },
        { Famiglia: 9, Stato: 'verificato', Invalidato: true }
      ])
    )

    const payload = await buildPayload({ audience: 'famiglie', giustificativi: 'almeno_inviato' })
    expect(payload.filterFamiglia).toEqual({ id_famiglia: { _in: [8] } })
  })

  it('contaDestinatari delega al service e ritorna i dati', async () => {
    mockCountRecipients.mockResolvedValue({ data: { count: 3, sample: [] } })
    const result = await contaDestinatari({ audience: 'contatti', ruoli: ['Volontario'] })
    expect(result).toEqual({ count: 3, sample: [] })
    expect(mockCountRecipients).toHaveBeenCalledWith({ audience: 'contatti', filter: { IsVolontario: { _eq: true } } })
  })

  it('inviaComunicazione inoltra oggetto e corpo', async () => {
    mockSend.mockResolvedValue({ data: { comunicazioneId: 1, inviati: 2, falliti: 0 } })
    const result = await inviaComunicazione({
      audience: 'contatti',
      ruoli: ['Volontario'],
      subject: 'Ciao',
      body: 'Testo'
    })
    expect(result).toEqual({ comunicazioneId: 1, inviati: 2, falliti: 0 })
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ audience: 'contatti', subject: 'Ciao', body: 'Testo' })
    )
  })
})
