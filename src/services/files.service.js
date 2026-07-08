import api from './api'

export const filesService = {
  upload(file, folder) {
    // Directus richiede che i campi non-file (es. folder) siano appesi PRIMA
    // del campo file, altrimenti il folder viene ignorato (folder: null).
    // Vedi: https://github.com/directus/directus/discussions/10130
    const formData = new FormData()
    if (folder) formData.append('folder', folder)
    formData.append('file', file)
    return api.post('/files', formData)
  },

  updateMeta(id, meta) {
    return api.patch(`/files/${id}`, meta)
  },

  updateFolder(fileId, folderId) {
    return api.patch(`/files/${fileId}`, { folder: folderId })
  },

  renameFile(fileId, newFilename) {
    return api.patch(`/files/${fileId}`, { filename_download: newFilename })
  },

  getFile(fileId) {
    return api.get(`/files/${fileId}`)
  },

  delete(fileId) {
    return api.delete(`/files/${fileId}`)
  }
}
