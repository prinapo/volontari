import { describe, expect, it, vi } from 'vitest'
import { EVENTI_PAGAMENTO, pagamentoMachine } from 'src/state-machines/pagamento'
import {
  calcolaStatoSuccessivo,
  eventoDichiarato,
  transita,
  TransizioneNonValidaError
} from 'src/usecases/stato/transita'

const E = EVENTI_PAGAMENTO

describe('eventoDichiarato', () => {
  it('true solo per eventi dichiarati dallo stato corrente', () => {
    expect(eventoDichiarato(pagamentoMachine, 'proposto', E.IN_PAGAMENTO)).toBe(true)
    expect(eventoDichiarato(pagamentoMachine, 'proposto', E.PAGA)).toBe(false)
    expect(eventoDichiarato(pagamentoMachine, 'inesistente', E.PAGA)).toBe(false)
  })
})

describe('transita', () => {
  it('valida e scrive il nuovo stato tramite scrivi', async () => {
    const scrivi = vi.fn()
    const target = await transita({
      machine: pagamentoMachine,
      statoCorrente: 'proposto',
      evento: E.IN_PAGAMENTO,
      scrivi
    })
    expect(target).toBe('in_pagamento')
    expect(scrivi).toHaveBeenCalledWith({ Stato: 'in_pagamento' })
  })

  it('include i campi extra ma lo stato della macchina prevale', async () => {
    const scrivi = vi.fn()
    await transita({
      machine: pagamentoMachine,
      statoCorrente: 'in_pagamento',
      evento: E.PAGA,
      extra: { DataPagamento: '2026-01-01', Stato: 'annullato' },
      scrivi
    })
    expect(scrivi).toHaveBeenCalledWith({ DataPagamento: '2026-01-01', Stato: 'pagato' })
  })

  it('supporta un campo di stato custom', async () => {
    const scrivi = vi.fn()
    await transita({
      machine: pagamentoMachine,
      campo: 'StatoProgetto',
      statoCorrente: 'in_pagamento',
      evento: E.FALLISCI,
      extra: { NoteEsito: 'IBAN errato' },
      scrivi
    })
    expect(scrivi).toHaveBeenCalledWith({ NoteEsito: 'IBAN errato', StatoProgetto: 'fallito' })
  })

  it('senza scrivi ritorna lo stato target senza I/O', async () => {
    await expect(transita({ machine: pagamentoMachine, statoCorrente: 'fallito', evento: E.ANNULLA })).resolves.toBe(
      'annullato'
    )
  })

  it('transizione non valida: throw e nessuna scrittura', async () => {
    const scrivi = vi.fn()
    await expect(
      transita({ machine: pagamentoMachine, statoCorrente: 'pagato', evento: E.PAGA, scrivi })
    ).rejects.toBeInstanceOf(TransizioneNonValidaError)
    expect(scrivi).not.toHaveBeenCalled()
  })

  it('propaga il ctx all evento (guardie)', () => {
    expect(calcolaStatoSuccessivo(pagamentoMachine, 'proposto', E.IN_PAGAMENTO, { qualcosa: 1 })).toBe('in_pagamento')
  })
})
