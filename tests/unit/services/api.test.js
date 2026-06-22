import { describe, it, expect } from 'vitest'

describe('api.js', () => {
  it('exports a default axios instance', async () => {
    const api = (await import('src/services/api')).default
    expect(api).toBeDefined()
    expect(typeof api.get).toBe('function')
    expect(typeof api.post).toBe('function')
    expect(typeof api.patch).toBe('function')
    expect(typeof api.delete).toBe('function')
    expect(api.defaults).toBeDefined()
  })
})
