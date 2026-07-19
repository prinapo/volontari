import { describe, it, expect } from 'vitest'
import { assetUrl } from 'src/utils/assets'

describe('assetUrl', () => {
  it('returns URL with fileId and cache-busting param', () => {
    const url = assetUrl('file-1')
    expect(url).toMatch(/^http:\/\/localhost:9000\/assets\/file-1\?_t=\d+$/)
  })

  it('adds download param when requested', () => {
    const url = assetUrl('file-1', true)
    expect(url).toContain('download=1')
    expect(url).toMatch(/_t=\d+/)
  })

  it('returns empty for null fileId', () => {
    expect(assetUrl(null)).toBe('')
  })
})
