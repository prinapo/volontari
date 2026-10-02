import { setActivePinia, createPinia } from 'pinia'
import { afterEach, beforeEach, vi } from 'vitest'

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
  setItem: vi.fn((key, value) => {
    storageStore[key] = String(value)
  }),
  removeItem: vi.fn(key => {
    delete storageStore[key]
  }),
  clear: vi.fn(() => {
    storageStore = {}
  })
}
// vitest 5 propaga gli assignment a globalThis/window sull'implementazione
// DOM (localStorage è getter read-only): defineProperty contorna il getter
Object.defineProperty(globalThis, 'localStorage', {
  value: mockStorage,
  configurable: true,
  writable: true
})

beforeEach(() => {
  const store = createPinia()
  setActivePinia(store)
})

afterEach(() => {
  storageStore = {}
})
