import { describe, it, expect } from 'vitest'
import { apiErrorMessage, errorCode } from 'src/utils/errors'

function directusError(message, code) {
  return {
    response: {
      data: {
        errors: [{ message, extensions: code ? { code } : {} }]
      }
    }
  }
}

describe('errors utils', () => {
  describe('apiErrorMessage', () => {
    it('prefers errors[0].message', () => {
      expect(apiErrorMessage(directusError('Invalid user OTP.', 'INVALID_OTP'))).toBe('Invalid user OTP.')
    })

    it('falls back to data.error (endpoint estensione)', () => {
      expect(apiErrorMessage({ response: { data: { error: 'Brevo non configurato' } } })).toBe('Brevo non configurato')
    })

    it('falls back to error.message', () => {
      expect(apiErrorMessage(new Error('Network failure'))).toBe('Network failure')
    })

    it('uses the provided fallback', () => {
      expect(apiErrorMessage(null, 'Errore di login')).toBe('Errore di login')
      expect(apiErrorMessage()).toBe('Errore generico')
    })
  })

  describe('errorCode', () => {
    it('extracts extensions.code', () => {
      expect(errorCode(directusError('codice errato', 'INVALID_OTP'))).toBe('INVALID_OTP')
    })

    it('returns empty string when code is missing', () => {
      expect(errorCode(directusError('errore'))).toBe('')
      expect(errorCode(new Error('Network failure'))).toBe('')
      expect(errorCode(null)).toBe('')
    })
  })
})
