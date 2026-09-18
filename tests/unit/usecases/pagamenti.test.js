import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  inviaNotificaPagamento,
  ricalcolaProposta,
  ricalcolaPropostiDaProgetti,
  ricalcolaTotaliProgetto,
  segnaAnnullato,
  segnaPagato
} from 'src/usecases/pagamenti'

const mockGetPagamenti = vi.fn()
const mockCreatePagamento = vi.fn()
const mockUpdatePagamento = vi.fn()
const mockDeletePagamento = vi.fn()
const mockGetProgettoById = vi.fn()
const mockUpdateProgettoStats = vi.fn()
const mockGetGiustificativiByProgetto = vi.fn()
const mockGetGiustificativiByProgetti = vi.fn()
const mockGetFamigliaVolontari = vi.fn()
const mockGetFamigliaGenitori = vi.fn()
const mockGetFamigliaById = vi.fn()
const mockUpdateFamiglia = vi.fn()
const mockSendEmail = vi.fn()

vi.mock('src/services/pagamenti.service', () => ({
  pagamentiService: {
    getPagamenti: (...a) => mockGetPagamenti(...a),
    createPagamento: (...a) => mockCreatePagamento(...a),
    updatePagamento: (...a) => mockUpdatePagamento(...a),
    deletePagamento: (...a) => mockDeletePagamento(...a)
  }
}))

vi.mock('src/services/progetti.service', () => ({
  progettiService: {
    getById: (...a) => mockGetProgettoById(...a),
    updateStats: (...a) => mockUpdateProgettoStats(...a)
  }
}))

vi.mock('src/services/verifica.service', () => ({
  verificaService: {
    getGiustificativiByProgetto: (...a) => mockGetGiustificativiByProgetto(...a),
    getGiustificativiByProgetti: (...a) => mockGetGiustificativiByProgetti(...a)
  }
}))

vi.mock('src/services/famiglie.service', () => ({
  famiglieService: {
    getVolontariByFamiglia: (...a) => mockGetFamigliaVolontari(...a),
    getGenitoriByFamiglia: (...a) => mockGetFamigliaGenitori(...a),
    getById: (...a) => mockGetFamigliaById(...a),
    update: (...a) => mockUpdateFamiglia(...a)
  }
}))

vi.mock('src/services/admin.service', () => ({
  adminService: {
    sendEmail: (...a) => mockSendEmail(...a)
  }
}))

const progettoBase = (extra = {}) => ({
  id_progetto: 1,
  Allocato: '1000',
  Famiglia: 'fam-1',
  IBAN: '',
  Intestatario_CC: '',
  StatoProgetto: 'aperto',
  ...extra
})

describe('ricalcolaProposta', () => {
  beforeEach(() => vi.clearAllMocks())

  it('crea la proposta mancante', async () => {
    mockGetProgettoById
      .mockResolvedValueOnce({ data: { data: progettoBase() } })
      .mockResolvedValueOnce({ data: { data: progettoBase() } })
    mockGetGiustificativiByProgetto
      .mockResolvedValueOnce({ data: { data: [{ id: 'g-1', Stato: 'verificato', Importo: '800' }] } })
      .mockResolvedValueOnce({ data: { data: [] } })
    mockGetPagamenti
      .mockResolvedValueOnce({ data: { data: [{ Importo: '200', Stato: 'in_pagamento' }] } })
      .mockResolvedValueOnce({ data: { data: [] } })
      .mockResolvedValueOnce({ data: { data: [] } })
    mockCreatePagamento.mockResolvedValue({ data: { data: {} } })
    mockUpdateProgettoStats.mockResolvedValue({})

    await ricalcolaProposta(1)
    expect(mockCreatePagamento).toHaveBeenCalled()
    const payload = mockCreatePagamento.mock.calls[0][0]
    expect(payload.Importo).toBe(440)
    expect(payload.Stato).toBe('proposto')
  })

  it('annulla la proposta esistente quando non resta importo', async () => {
    mockGetProgettoById
      .mockResolvedValueOnce({ data: { data: progettoBase({ id_progetto: 12 }) } })
      .mockResolvedValueOnce({ data: { data: progettoBase({ id_progetto: 12 }) } })
    mockGetGiustificativiByProgetto
      .mockResolvedValueOnce({ data: { data: [{ id: 'g-1', Stato: 'verificato', Importo: '100' }] } })
      .mockResolvedValueOnce({ data: { data: [] } })
    mockGetPagamenti
      .mockResolvedValueOnce({ data: { data: [{ id: 'paid-1', Stato: 'pagato', Importo: '200' }] } })
      .mockResolvedValueOnce({ data: { data: [{ id: 'prop-1', Stato: 'proposto', Importo: '50' }] } })
      .mockResolvedValueOnce({ data: { data: [] } })
    mockUpdatePagamento.mockResolvedValue({})
    mockUpdateProgettoStats.mockResolvedValue({})

    await ricalcolaProposta(12)
    expect(mockUpdatePagamento).toHaveBeenCalledWith('prop-1', {
      Stato: 'annullato',
      NoteEsito: 'Proposta annullata: importo non più dovuto',
      Batch: null
    })
    expect(mockDeletePagamento).not.toHaveBeenCalled()
  })

  it('residuo float non crea proposto a zero (398*0.8 - 318.40)', async () => {
    mockGetProgettoById
      .mockResolvedValueOnce({ data: { data: progettoBase({ id_progetto: 12, Allocato: '875' }) } })
      .mockResolvedValueOnce({ data: { data: progettoBase({ id_progetto: 12, Allocato: '875' }) } })
    mockGetGiustificativiByProgetto
      .mockResolvedValueOnce({ data: { data: [{ id: 'g-1', Stato: 'verificato', Importo: '398' }] } })
      .mockResolvedValueOnce({ data: { data: [] } })
    mockGetPagamenti
      .mockResolvedValueOnce({ data: { data: [{ id: 'paid-1', Stato: 'in_pagamento', Importo: '318.40' }] } })
      .mockResolvedValueOnce({ data: { data: [] } })
      .mockResolvedValueOnce({ data: { data: [] } })
    mockUpdateProgettoStats.mockResolvedValue({})

    await ricalcolaProposta(12)
    expect(mockCreatePagamento).not.toHaveBeenCalled()
    expect(mockDeletePagamento).not.toHaveBeenCalled()
  })

  it('residuo float annulla il proposto esistente a zero', async () => {
    mockGetProgettoById
      .mockResolvedValueOnce({ data: { data: progettoBase({ id_progetto: 12, Allocato: '875' }) } })
      .mockResolvedValueOnce({ data: { data: progettoBase({ id_progetto: 12, Allocato: '875' }) } })
    mockGetGiustificativiByProgetto
      .mockResolvedValueOnce({ data: { data: [{ id: 'g-1', Stato: 'verificato', Importo: '398' }] } })
      .mockResolvedValueOnce({ data: { data: [] } })
    mockGetPagamenti
      .mockResolvedValueOnce({ data: { data: [{ id: 'paid-1', Stato: 'in_pagamento', Importo: '318.40' }] } })
      .mockResolvedValueOnce({ data: { data: [{ id: 'prop-1', Stato: 'proposto', Importo: '0' }] } })
      .mockResolvedValueOnce({ data: { data: [] } })
    mockUpdatePagamento.mockResolvedValue({})
    mockUpdateProgettoStats.mockResolvedValue({})

    await ricalcolaProposta(12)
    expect(mockUpdatePagamento).toHaveBeenCalledWith('prop-1', {
      Stato: 'annullato',
      NoteEsito: 'Proposta annullata: importo non più dovuto',
      Batch: null
    })
    expect(mockCreatePagamento).not.toHaveBeenCalled()
  })

  it('importo legittimo arrotondato ai centesimi', async () => {
    mockGetProgettoById
      .mockResolvedValueOnce({ data: { data: progettoBase() } })
      .mockResolvedValueOnce({ data: { data: progettoBase() } })
    mockGetGiustificativiByProgetto
      .mockResolvedValueOnce({ data: { data: [{ id: 'g-1', Stato: 'verificato', Importo: '125' }] } })
      .mockResolvedValueOnce({ data: { data: [] } })
    mockGetPagamenti
      .mockResolvedValueOnce({ data: { data: [] } })
      .mockResolvedValueOnce({ data: { data: [] } })
      .mockResolvedValueOnce({ data: { data: [] } })
    mockCreatePagamento.mockResolvedValue({ data: { data: {} } })
    mockUpdateProgettoStats.mockResolvedValue({})

    await ricalcolaProposta(1)
    expect(mockCreatePagamento).toHaveBeenCalledTimes(1)
    expect(mockCreatePagamento.mock.calls[0][0].Importo).toBe(100)
  })
})

describe('ricalcolaTotaliProgetto', () => {
  beforeEach(() => vi.clearAllMocks())

  it('aggiorna le stats e chiude automaticamente il progetto pagato', async () => {
    mockGetProgettoById.mockResolvedValue({
      data: { data: { id_progetto: 21, Allocato: '100', StatoProgetto: 'aperto' } }
    })
    mockGetGiustificativiByProgetto.mockResolvedValue({
      data: { data: [{ Stato: 'verificato', Importo: '100' }] }
    })
    mockGetPagamenti.mockResolvedValue({
      data: {
        data: [
          { id: 'prop-1', Stato: 'proposto', Importo: '0' },
          { id: 'paid-1', Stato: 'pagato', Importo: '100' }
        ]
      }
    })
    mockUpdateProgettoStats.mockResolvedValue({})

    await ricalcolaTotaliProgetto(21)
    expect(mockUpdateProgettoStats).toHaveBeenCalledWith(21, {
      TotaleVerificato: 100,
      TotaleProposto: 0,
      TotaleInPagamento: 0,
      TotalePagato: 100,
      ResiduoAllocato: 0
    })
    // StatoProgetto chiuso scritto da chiudiProgetto (updateStats con StatoProgetto)
    const closeCall = mockUpdateProgettoStats.mock.calls.find(c => c[1]?.StatoProgetto === 'chiuso')
    expect(closeCall).toBeTruthy()
  })

  it('ritorna subito senza progetto e propaga gli errori', async () => {
    mockGetProgettoById.mockResolvedValueOnce({ data: { data: null } })
    await ricalcolaTotaliProgetto(99)
    expect(mockUpdateProgettoStats).not.toHaveBeenCalled()

    mockGetProgettoById.mockRejectedValueOnce(new Error('totali fail'))
    await expect(ricalcolaTotaliProgetto(100)).rejects.toThrow('totali fail')
  })
})

describe('segnaAnnullato', () => {
  beforeEach(() => vi.clearAllMocks())

  it('annulla in_pagamento e restituisce il batch', async () => {
    mockGetPagamenti.mockResolvedValueOnce({
      data: { data: [{ id: 'p-1', Stato: 'in_pagamento', Progetto: 7, Batch: 'b-1' }] }
    })
    mockUpdatePagamento.mockResolvedValue({})
    mockGetProgettoById.mockResolvedValue({ data: { data: progettoBase({ id_progetto: 7 }) } })
    mockGetGiustificativiByProgetto.mockResolvedValue({ data: { data: [] } })
    mockGetPagamenti.mockResolvedValue({ data: { data: [] } })
    mockUpdateProgettoStats.mockResolvedValue({})

    const { batchId } = await segnaAnnullato('p-1')
    expect(mockUpdatePagamento).toHaveBeenCalledWith('p-1', {
      Stato: 'annullato',
      Batch: null,
      NoteEsito: 'Rimosso dal gruppo'
    })
    expect(batchId).toBe('b-1')
  })

  it('accetta fallito e rifiuta stati non validi', async () => {
    mockGetPagamenti.mockResolvedValueOnce({
      data: { data: [{ id: 'p-2', Stato: 'fallito', Progetto: 9 }] }
    })
    mockUpdatePagamento.mockResolvedValue({})
    mockGetProgettoById.mockResolvedValue({ data: { data: progettoBase({ id_progetto: 9 }) } })
    mockGetGiustificativiByProgetto.mockResolvedValue({ data: { data: [] } })
    mockGetPagamenti.mockResolvedValue({ data: { data: [] } })
    mockUpdateProgettoStats.mockResolvedValue({})

    await expect(segnaAnnullato('p-2')).resolves.toBeTruthy()

    mockGetPagamenti.mockResolvedValueOnce({
      data: { data: [{ id: 'p-3', Stato: 'pagato', Progetto: 9 }] }
    })
    await expect(segnaAnnullato('p-3')).rejects.toThrow(
      'Solo pagamenti in_pagamento o falliti possono essere rimossi dal gruppo'
    )
  })
})

describe('inviaNotificaPagamento', () => {
  beforeEach(() => vi.clearAllMocks())

  it('invia email al volontario', async () => {
    mockGetProgettoById.mockResolvedValue({ data: { data: { id_progetto: 1 } } })
    mockGetFamigliaVolontari.mockResolvedValue({
      data: { data: [{ Contatto: { user_id: 'u-1', email: [{ email_address: 'v@r.it' }] } }] }
    })
    mockGetFamigliaById.mockResolvedValue({ data: { data: { Nome_Famiglia: 'Fam Test' } } })
    mockSendEmail.mockResolvedValue({})
    mockUpdatePagamento.mockResolvedValue({})

    await inviaNotificaPagamento({ id: 'p-1', Progetto: 1, Famiglia: 'fam-1', Importo: 100, NotificaInviata: false })
    expect(mockSendEmail).toHaveBeenCalled()
    expect(mockUpdatePagamento).toHaveBeenCalledWith('p-1', { NotificaInviata: true })
  })

  it('salta se già inviata', async () => {
    await inviaNotificaPagamento({ NotificaInviata: true })
    expect(mockGetProgettoById).not.toHaveBeenCalled()
  })

  it('fa fallback sul genitore e salta senza destinatari', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mockGetProgettoById.mockResolvedValue({ data: { data: { id_progetto: 1 } } })
    mockGetFamigliaVolontari.mockResolvedValueOnce({ data: { data: [{ Contatto: { email: [] } }] } })
    mockGetFamigliaGenitori.mockResolvedValueOnce({
      data: { data: [{ Contatto: { email: [{ email_address: 'gen@test.it', Primary: true }] } }] }
    })
    mockGetFamigliaById.mockResolvedValueOnce({ data: { data: { Nome_Famiglia: 'Famiglia Uno' } } })
    mockSendEmail.mockResolvedValueOnce({})
    mockUpdatePagamento.mockResolvedValueOnce({})

    await inviaNotificaPagamento({ id: 'p-1', Progetto: 1, Famiglia: 'fam-1', Importo: 100, NotificaInviata: false })
    expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'gen@test.it' }))

    mockGetProgettoById.mockResolvedValueOnce({ data: { data: { id_progetto: 1 } } })
    mockGetFamigliaVolontari.mockResolvedValueOnce({ data: { data: [] } })
    mockGetFamigliaGenitori.mockResolvedValueOnce({ data: { data: [] } })

    await inviaNotificaPagamento({ id: 'p-2', Progetto: 1, Famiglia: 'fam-2', Importo: 50, NotificaInviata: false })
    expect(warnSpy).toHaveBeenCalled()
    warnSpy.mockRestore()
  })
})

describe('segnaPagato', () => {
  beforeEach(() => vi.clearAllMocks())

  it('segnapagato e invia la notifica come side-effect', async () => {
    mockGetPagamenti.mockResolvedValueOnce({
      data: { data: [{ id: 'p-1', Progetto: 7, Famiglia: 'fam-1', Importo: 100, Stato: 'in_pagamento' }] }
    })
    mockUpdatePagamento.mockResolvedValue({})
    // ricalcolaTotaliProgetto
    mockGetProgettoById.mockResolvedValue({ data: { data: progettoBase({ id_progetto: 7 }) } })
    mockGetGiustificativiByProgetto.mockResolvedValue({ data: { data: [] } })
    mockGetPagamenti.mockResolvedValue({ data: { data: [] } })
    mockUpdateProgettoStats.mockResolvedValue({})
    // inviaNotificaPagamento
    mockGetFamigliaVolontari.mockResolvedValue({ data: { data: [] } })
    mockGetFamigliaGenitori.mockResolvedValue({ data: { data: [] } })

    await segnaPagato('p-1')
    expect(mockUpdatePagamento).toHaveBeenCalledWith('p-1', expect.objectContaining({ Stato: 'pagato' }))
  })

  it('rifiuta pagamenti non in_pagamento', async () => {
    mockGetPagamenti.mockResolvedValueOnce({ data: { data: [{ id: 'p-2', Stato: 'proposto' }] } })
    await expect(segnaPagato('p-2')).rejects.toThrow('Solo pagamenti in_pagamento possono essere segnati come pagati')
  })
})

describe('ricalcolaPropostiDaProgetti', () => {
  beforeEach(() => vi.clearAllMocks())

  const row = extra => ({
    idProgetto: 'X',
    idFamiglia: 'fam-1',
    allocato: 875,
    percentualeRimborso: 80,
    iban: '',
    intestatario: '',
    statoProgetto: 'accettato',
    ...extra
  })

  it('residuo float non crea proposto a zero (398*0.8 - 318.40)', async () => {
    mockGetGiustificativiByProgetti.mockResolvedValue({
      data: { data: [{ Progetto: 'X', Stato: 'verificato', Importo: '398' }] }
    })
    mockGetPagamenti.mockResolvedValue({
      data: { data: [{ id: 'paid-1', Progetto: 'X', Stato: 'in_pagamento', Importo: '318.40' }] }
    })

    await ricalcolaPropostiDaProgetti([row()])

    expect(mockCreatePagamento).not.toHaveBeenCalled()
    expect(mockUpdatePagamento).not.toHaveBeenCalled()
  })

  it('residuo float con proposto esistente lo annulla', async () => {
    mockGetGiustificativiByProgetti.mockResolvedValue({
      data: { data: [{ Progetto: 'X', Stato: 'verificato', Importo: '398' }] }
    })
    mockGetPagamenti.mockResolvedValue({
      data: {
        data: [
          { id: 'paid-1', Progetto: 'X', Stato: 'in_pagamento', Importo: '318.40' },
          { id: 'prop-1', Progetto: 'X', Stato: 'proposto', Importo: '0' }
        ]
      }
    })
    mockUpdatePagamento.mockResolvedValue({})

    await ricalcolaPropostiDaProgetti([row()])

    expect(mockUpdatePagamento).toHaveBeenCalledWith('prop-1', {
      Stato: 'annullato',
      NoteEsito: 'Proposta annullata: importo non più dovuto',
      Batch: null
    })
  })
})
