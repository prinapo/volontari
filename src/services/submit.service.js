import api from './api'

export const submitService = {
  uploadFile(file, folder) {
    const formData = new FormData()
    if (folder) formData.append('folder', folder)
    formData.append('file', file)
    return api.post('/files', formData)
  },

  createSubmission(data) {
    return api.post('/items/InviiGiustificativiNoLogin', data)
  }
}
