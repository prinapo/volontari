import api from './api'

export const filesService = {
  upload(file, folder) {
    const formData = new FormData()
    formData.append('file', file)
    if (folder) formData.append('folder', folder)
    return api.post('/files', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },

  updateMeta(id, meta) {
    return api.patch(`/files/${id}`, meta)
  }
}
