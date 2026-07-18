import { describe, it, expect } from 'vitest'
import { assetUrl } from 'src/utils/assets'

describe('assetUrl', () => {
  it('returns URL with fileId (no token, uses cookie)', () => {
    const url = assetUrl('file-1')
    expect(url).toBe('http://localhost:9000/assets/file-1')
  })

  it('adds download param when requested', () => {
    const url = assetUrl('file-1', true)
    expect(url).toContain('download=1')
  })

  it('returns empty for null fileId', () => {
    expect(assetUrl(null)).toBe('')
  })
})
