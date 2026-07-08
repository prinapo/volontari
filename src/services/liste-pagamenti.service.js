import api from './api'
import { filesService } from './files.service'

export const listePagamentiService = {
  async getAll() {
    const res = await api.get('/items/ListePagamenti', {
      params: { sort: '-DataCreazione' }
    })
    return res.data.data || []
  },

  async create(data) {
    const res = await api.post('/items/ListePagamenti', data)
    return res.data.data
  },

  async update(id, data) {
    const res = await api.patch(`/items/ListePagamenti/${id}`, data)
    return res.data.data
  },

  async delete(id) {
    await api.delete(`/items/ListePagamenti/${id}`)
  },

  async uploadCsv(csvContent, nome) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const file = new File([blob], `${nome.replaceAll(/[^\w-]/g, '_')}.csv`, {
      type: 'text/csv;charset=utf-8;'
    })
    const uploadRes = await filesService.upload(file, import.meta.env.VITE_LISTE_PAGAMENTI_FOLDER)
    return uploadRes.data.data?.id
  },

  async deleteFile(fileId) {
    await filesService.delete(fileId)
  }
}
