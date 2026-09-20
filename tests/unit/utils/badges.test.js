import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  ACTION_REJECT,
  ACTION_VERIFY,
  statoColor,
  statoLabel,
  statoPagamentoColor,
  statoPagamentoLabel,
  statoProgettoColor,
  statoProgettoLabel,
  tipoBadgeColor
} from 'src/utils/badges'

describe('badges', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('statoColor (giustificativo)', () => {
    it('maps known states', () => {
      expect(statoColor('draft')).toBe('grey')
      expect(statoColor('verificato')).toBe('positive')
      expect(statoColor('inviato')).toBe('orange')
      expect(statoColor('rifiutato')).toBe('negative')
      expect(statoColor('pagato')).toBe('primary')
      expect(statoColor('in_pagamento')).toBe('secondary')
    })

    it('warns and falls back to grey for unknown states', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      expect(statoColor('boh')).toBe('grey')
      expect(warn).toHaveBeenCalled()
      expect(statoColor(null)).toBe('grey')
      expect(warn).toHaveBeenCalledTimes(1)
    })
  })

  describe('statoLabel (giustificativo)', () => {
    it('maps known states and defaults to Bozza', () => {
      expect(statoLabel('draft')).toBe('Bozza')
      expect(statoLabel('verificato')).toBe('Verificato')
      expect(statoLabel('inviato')).toBe('Inviato')
      expect(statoLabel('rifiutato')).toBe('Rifiutato')
      expect(statoLabel('pagato')).toBe('Pagato')
      expect(statoLabel('in_pagamento')).toBe('In pagamento')
      expect(statoLabel('unknown')).toBe('Bozza')
    })
  })

  describe('statoPagamentoColor', () => {
    it('maps known payment states', () => {
      expect(statoPagamentoColor('proposto')).toBe('grey')
      expect(statoPagamentoColor('in_pagamento')).toBe('secondary')
      expect(statoPagamentoColor('pagato')).toBe('positive')
      expect(statoPagamentoColor('fallito')).toBe('negative')
      expect(statoPagamentoColor('annullato')).toBe('grey-6')
    })

    it('falls back to grey for unknown states', () => {
      expect(statoPagamentoColor('boh')).toBe('grey')
      expect(statoPagamentoColor()).toBe('grey')
    })
  })

  describe('statoPagamentoLabel', () => {
    it('maps known payment states', () => {
      expect(statoPagamentoLabel('proposto')).toBe('Proposto')
      expect(statoPagamentoLabel('in_pagamento')).toBe('In pagamento')
      expect(statoPagamentoLabel('pagato')).toBe('Pagato')
      expect(statoPagamentoLabel('fallito')).toBe('Fallito')
      expect(statoPagamentoLabel('annullato')).toBe('Annullato')
    })

    it('returns the raw state or a dash as fallback', () => {
      expect(statoPagamentoLabel('boh')).toBe('boh')
      expect(statoPagamentoLabel()).toBe('—')
    })
  })

  describe('tipoBadgeColor', () => {
    it('maps contact types and defaults to grey', () => {
      expect(tipoBadgeColor('Volontario')).toBe('primary')
      expect(tipoBadgeColor('Genitore')).toBe('secondary')
      expect(tipoBadgeColor('Referente')).toBe('accent')
      expect(tipoBadgeColor('Contatto')).toBe('grey')
    })
  })

  describe('statoProgettoColor', () => {
    it('maps known project states and defaults to grey', () => {
      expect(statoProgettoColor('accettato')).toBe('positive')
      expect(statoProgettoColor('in_rendicontazione')).toBe('orange')
      expect(statoProgettoColor('rimborso_parziale')).toBe('warning')
      expect(statoProgettoColor('chiuso')).toBe('grey')
      expect(statoProgettoColor('valido')).toBe('info')
      expect(statoProgettoColor('proposto')).toBe('grey')
      expect(statoProgettoColor('approvato')).toBe('primary')
      expect(statoProgettoColor('boh')).toBe('grey')
    })
  })

  describe('statoProgettoLabel', () => {
    it('maps known project states and falls back', () => {
      expect(statoProgettoLabel('proposto')).toBe('Proposto')
      expect(statoProgettoLabel('validato')).toBe('Validato')
      expect(statoProgettoLabel('approvato')).toBe('Approvato')
      expect(statoProgettoLabel('accettato')).toBe('Accettato')
      expect(statoProgettoLabel('in_rendicontazione')).toBe('In rendicontazione')
      expect(statoProgettoLabel('chiuso')).toBe('Chiuso')
      expect(statoProgettoLabel('rimborso_parziale')).toBe('Rimborso parziale')
      expect(statoProgettoLabel('aperto')).toBe('Accettato')
      expect(statoProgettoLabel('boh')).toBe('boh')
      expect(statoProgettoLabel()).toBe('—')
    })
  })

  it('exposes action colors', () => {
    expect(ACTION_VERIFY).toBe('positive')
    expect(ACTION_REJECT).toBe('negative')
  })
})
