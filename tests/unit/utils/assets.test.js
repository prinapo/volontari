import { describe, it, expect, beforeEach } from 'vitest'
import { assetUrl } from 'src/utils/assets'

describe('assetUrl', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns URL with fileId and access token', () => {
    localStorage.setItem('access_token', 'my-token')
    const url = assetUrl('file-1')
    expect(url).toContain('/assets/file-1')
    expect(url).toContain('access_token=my-token')
    expect(url).not.toContain('download=1')
  })

  it('adds download param when requested', () => {
    localStorage.setItem('access_token', 'my-token')
    const url = assetUrl('file-1', true)
    expect(url).toContain('download=1')
  })

  it('works with null token', () => {
    const url = assetUrl('file-1')
    expect(url).toContain('access_token=null')
  })
})
