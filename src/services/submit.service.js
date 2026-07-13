import api from './api'

export const submitService = {
  createSubmission(data) {
    const payload = { ...data }
    if (payload.email) payload.email = payload.email.toLowerCase()
    return api.post('/items/InviiGiustificativiNoLogin', payload)
  }
}
