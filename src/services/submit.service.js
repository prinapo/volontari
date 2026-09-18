import api from './api'

export const submitService = {
  createSubmission(data) {
    return api.post('/items/InviiGiustificativiNoLogin', data)
  }
}
