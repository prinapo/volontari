import { vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('quasar', () => {
  const $q = {
    platform: { is: { mobile: false } },
    lang: { isoName: 'it' },
    screen: { width: 1024, sm: true, md: true, gt: { sm: true }, lt: { sm: false } },
    dark: { isActive: false },
    colors: () => {},
    iconSet: {},
    notify: vi.fn(),
    dialog: vi.fn()
  }
  return {
    useQuasar: () => $q,
    default: { install: () => {} },
    Quasar: { install: () => {} }
  }
})

let storageStore = {}
const mockStorage = {
  getItem: vi.fn(key => storageStore[key] ?? null),
  setItem: vi.fn((key, value) => { storageStore[key] = String(value) }),
  removeItem: vi.fn(key => { delete storageStore[key] }),
  clear: vi.fn(() => { storageStore = {} })
}
if (typeof window !== 'undefined') {
  window.localStorage = mockStorage
}
globalThis.localStorage = mockStorage

beforeEach(() => {
  const store = createPinia()
  setActivePinia(store)
})

afterEach(() => {
  storageStore = {}
})
