import { describe, it, expect, vi } from 'vitest'
import { notifyError, notifySuccess } from 'src/utils/notify'

function mockQ() {
  return { notify: vi.fn() }
}

describe('notifyError', () => {
  it('shows error with string message', () => {
    const $q = mockQ()
    notifyError($q, 'Errore generico')
    expect($q.notify).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'negative', message: 'Errore generico' })
    )
  })

  it('extracts message from API error response', () => {
    const $q = mockQ()
    const err = {
      response: {
        data: {
          errors: [{ message: 'Email già registrata' }]
        }
      }
    }
    notifyError($q, err)
    expect($q.notify).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Email già registrata' })
    )
  })

  it('uses err.message if no response errors', () => {
    const $q = mockQ()
    const err = new Error('Network error')
    notifyError($q, err)
    expect($q.notify).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Network error' })
    )
  })

  it('falls back to default message', () => {
    const $q = mockQ()
    notifyError($q, {})
    expect($q.notify).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Errore' })
    )
  })

  it('uses custom fallback message', () => {
    const $q = mockQ()
    notifyError($q, {}, 'Operazione fallita')
    expect($q.notify).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Operazione fallita' })
    )
  })
})

describe('notifySuccess', () => {
  it('shows success notification', () => {
    const $q = mockQ()
    notifySuccess($q, 'Salvato!')
    expect($q.notify).toHaveBeenCalledWith({
      type: 'positive',
      message: 'Salvato!'
    })
  })
})
