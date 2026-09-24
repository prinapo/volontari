import { assetUrl } from 'src/utils/assets'
import api from './api'
import { filesService } from './files.service'

export const listePagamentiService = {
  async getAll(search) {
    const params = { sort: '-DataCreazione' }
    if (search) {
      params['filter[Nome][_icontains]'] = search
    }
    const res = await api.get('/items/ListePagamenti', { params })
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

  async uploadExcel(buffer, nome) {
    const mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    const blob = new Blob([buffer], { type: mime })
    const file = new File([blob], `${nome.replaceAll(/[^\w-]/g, '_')}.xlsx`, { type: mime })
    const uploadRes = await filesService.upload(file, import.meta.env.VITE_LISTE_PAGAMENTI_FOLDER)
    return uploadRes.data.data?.id
  },

  async deleteFile(fileId) {
    await filesService.delete(fileId)
  },

  /**
   * Stato HTTP del file lista. Usa fetch diretto (non axios) per non far
   * scattare interceptor/log su ErrorLog: un file mancante risponde 403.
   */
  async fileStatus(fileId) {
    if (!fileId) return 0
    try {
      const res = await fetch(assetUrl(fileId), { headers: { Range: 'bytes=0-1' } })
      return res.status
    } catch {
      return 0
    }
  }
}
