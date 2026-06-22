import { describe, it, expect, vi } from 'vitest'
import { enrichWithEmails } from 'src/utils/enrichment'

describe('enrichWithEmails', () => {
  it('returns empty object for empty input', async () => {
    const result = await enrichWithEmails([], vi.fn())
    expect(result).toEqual({})
  })

  it('returns empty object for null input', async () => {
    const result = await enrichWithEmails(null, vi.fn())
    expect(result).toEqual({})
  })

  it('groups emails by contatto relation', async () => {
    const mockFn = vi.fn().mockResolvedValue({
      data: {
        data: [
          { Contatto_Relation: 'c-1', email_address: 'a@r.it', Primary: true },
          { Contatto_Relation: 'c-1', email_address: 'b@r.it', Primary: false },
          { Contatto_Relation: 'c-2', email_address: 'c@r.it', Primary: true }
        ]
      }
    })
    const result = await enrichWithEmails(['c-1', 'c-2'], mockFn)
    expect(result['c-1']).toHaveLength(2)
    expect(result['c-1'][0].email_address).toBe('a@r.it')
    expect(result['c-1'][0].Primary).toBe(true)
    expect(result['c-2']).toHaveLength(1)
  })

  it('ignores entries without Contatto_Relation', async () => {
    const mockFn = vi.fn().mockResolvedValue({
      data: {
        data: [
          { Contatto_Relation: null, email_address: 'x@r.it', Primary: false }
        ]
      }
    })
    const result = await enrichWithEmails(['c-1'], mockFn)
    expect(result).toEqual({})
  })
})
