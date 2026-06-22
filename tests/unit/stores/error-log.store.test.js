import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useErrorLogStore } from 'src/stores/error-log.store'

const mockGetAll = vi.fn()
const mockMarkAsRead = vi.fn()
const mockDelete = vi.fn()

vi.mock('src/services/error-log.service', () => ({
  errorLogService: {
    getAll: (...args) => mockGetAll(...args),
    markAsRead: (...args) => mockMarkAsRead(...args),
    delete: (...args) => mockDelete(...args)
  }
}))

describe('errorLog store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function createLogs() {
    return [
      { id: 1, message: 'Errore 1', read: false },
      { id: 2, message: 'Errore 2', read: true },
      { id: 3, message: 'Errore 3', read: false }
    ]
  }

  describe('fetchAll', () => {
    it('loads logs from service', async () => {
      mockGetAll.mockResolvedValue({ data: { data: createLogs() } })
      const store = useErrorLogStore()

      await store.fetchAll()

      expect(mockGetAll).toHaveBeenCalledOnce()
      expect(store.items).toEqual(createLogs())
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('handles API error', async () => {
      const apiError = { response: { data: { errors: [{ message: 'Forbidden' }] } } }
      mockGetAll.mockRejectedValue(apiError)
      const store = useErrorLogStore()

      await store.fetchAll()

      expect(store.items).toEqual([])
      expect(store.error).toBe('Forbidden')
      expect(store.loading).toBe(false)
    })

    it('handles generic error', async () => {
      mockGetAll.mockRejectedValue(new Error('Network failure'))
      const store = useErrorLogStore()

      await store.fetchAll()

      expect(store.error).toBe('Errore caricamento log')
    })
  })

  describe('markAsRead', () => {
    it('marks a log item as read', async () => {
      mockMarkAsRead.mockResolvedValue({})
      const store = useErrorLogStore()
      store.items = createLogs()

      await store.markAsRead(1)

      expect(mockMarkAsRead).toHaveBeenCalledWith(1)
      expect(store.items.find(i => i.id === 1).read).toBe(true)
    })
  })

  describe('delete', () => {
    it('removes a log item', async () => {
      mockDelete.mockResolvedValue({})
      const store = useErrorLogStore()
      store.items = createLogs()

      await store.delete(2)

      expect(mockDelete).toHaveBeenCalledWith(2)
      expect(store.items).toHaveLength(2)
      expect(store.items.find(i => i.id === 2)).toBeUndefined()
    })
  })

  describe('unreadCount getter', () => {
    it('counts unread items', () => {
      const store = useErrorLogStore()
      store.$state.items = createLogs()

      const unread = store.$state.items.filter(i => !i.read).length
      expect(unread).toBe(2)
      expect(store.unreadCount).toBe(2)
    })

    it('returns 0 for empty list', () => {
      const store = useErrorLogStore()

      expect(store.unreadCount).toBe(0)
    })
  })
})
