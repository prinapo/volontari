import { describe, it, expect } from 'vitest'
import { calcolaStatoRendicontazione } from 'src/utils/rendicontazione'

describe('calcolaStatoRendicontazione', () => {

  describe('nessuno', () => {
    it('returns nessuno when empty array', () => {
      expect(calcolaStatoRendicontazione([])).toBe('nessuno')
    })

    it('returns nessuno when all items are invalidated', () => {
      const items = [
        { Stato: 'inviato', Invalidato: true },
        { Stato: 'verificato', Invalidato: true }
      ]
      expect(calcolaStatoRendicontazione(items)).toBe('nessuno')
    })
  })

  describe('bozza', () => {
    it('returns bozza for single draft', () => {
      expect(calcolaStatoRendicontazione([{ Stato: 'draft' }])).toBe('bozza')
    })

    it('returns bozza for multiple drafts', () => {
      expect(calcolaStatoRendicontazione([{ Stato: 'draft' }, { Stato: 'draft' }])).toBe('bozza')
    })

    it('returns bozza for draft and empty string', () => {
      expect(calcolaStatoRendicontazione([{ Stato: 'draft' }, { Stato: '' }])).toBe('bozza')
    })
  })

  describe('verificato', () => {
    it('returns verificato for single verified', () => {
      expect(calcolaStatoRendicontazione([{ Stato: 'verificato' }])).toBe('verificato')
    })

    it('returns verificato for all verified', () => {
      expect(calcolaStatoRendicontazione([{ Stato: 'verificato' }, { Stato: 'verificato' }])).toBe('verificato')
    })
  })

  describe('in_attesa', () => {
    it('returns in_attesa for single inviato', () => {
      expect(calcolaStatoRendicontazione([{ Stato: 'inviato' }])).toBe('in_attesa')
    })

    it('returns in_attesa when inviato + draft', () => {
      expect(calcolaStatoRendicontazione([{ Stato: 'inviato' }, { Stato: 'draft' }])).toBe('in_attesa')
    })

    it('returns in_attesa when inviato + verificato', () => {
      expect(calcolaStatoRendicontazione([{ Stato: 'inviato' }, { Stato: 'verificato' }])).toBe('in_attesa')
    })

    it('returns in_attesa when inviato + rifiutato', () => {
      expect(calcolaStatoRendicontazione([{ Stato: 'inviato' }, { Stato: 'rifiutato' }])).toBe('in_attesa')
    })

    it('returns in_attesa when inviato + draft + verificato', () => {
      const items = [
        { Stato: 'inviato' },
        { Stato: 'draft' },
        { Stato: 'verificato' }
      ]
      expect(calcolaStatoRendicontazione(items)).toBe('in_attesa')
    })
  })

  describe('parziale', () => {
    it('returns parziale for single rifiutato', () => {
      expect(calcolaStatoRendicontazione([{ Stato: 'rifiutato' }])).toBe('parziale')
    })

    it('returns parziale for unknown stato', () => {
      expect(calcolaStatoRendicontazione([{ Stato: 'unknown' }])).toBe('parziale')
    })

    it('returns parziale for draft + verificato', () => {
      expect(calcolaStatoRendicontazione([{ Stato: 'draft' }, { Stato: 'verificato' }])).toBe('parziale')
    })

    it('returns parziale for draft + rifiutato', () => {
      expect(calcolaStatoRendicontazione([{ Stato: 'draft' }, { Stato: 'rifiutato' }])).toBe('parziale')
    })

    it('returns parziale for verificato + rifiutato', () => {
      expect(calcolaStatoRendicontazione([{ Stato: 'verificato' }, { Stato: 'rifiutato' }])).toBe('parziale')
    })

    it('returns parziale for draft + verificato + rifiutato', () => {
      const items = [
        { Stato: 'draft' },
        { Stato: 'verificato' },
        { Stato: 'rifiutato' }
      ]
      expect(calcolaStatoRendicontazione(items)).toBe('parziale')
    })
  })

  describe('case insensitivity', () => {
    it('handles uppercase INVIATO', () => {
      expect(calcolaStatoRendicontazione([{ Stato: 'INVIATO' }])).toBe('in_attesa')
    })

    it('handles mixed case Verificato', () => {
      expect(calcolaStatoRendicontazione([{ Stato: 'Verificato' }])).toBe('verificato')
    })
  })

  describe('Invalidato filter', () => {
    it('filters out invalidated items before evaluation', () => {
      const items = [
        { Stato: 'inviato', Invalidato: true },
        { Stato: 'verificato' }
      ]
      expect(calcolaStatoRendicontazione(items)).toBe('verificato')
    })

    it('ignores Invalidato false', () => {
      const items = [
        { Stato: 'inviato', Invalidato: false },
        { Stato: 'verificato' }
      ]
      expect(calcolaStatoRendicontazione(items)).toBe('in_attesa')
    })
  })
})
