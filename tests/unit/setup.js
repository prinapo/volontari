import { setActivePinia, createPinia } from 'pinia'

beforeEach(() => {
  const store = createPinia()
  setActivePinia(store)
})

global.localStorage = (() => {
  let store = {}
  return {
    getItem: vi.fn(key => store[key] ?? null),
    setItem: vi.fn((key, value) => { store[key] = String(value) }),
    removeItem: vi.fn(key => { delete store[key] }),
    clear: vi.fn(() => { store = {} })
  }
})()
