import { SYNC } from 'src/utils/constants'
import api from './api'

export const syncService = {
  async download() {
    const { data } = await api.post(`${SYNC.ENDPOINT}/download`)
    return data
  },
  async importSnapshot(dir) {
    const { data } = await api.post(`${SYNC.ENDPOINT}/import`, { dir })
    return data
  },
  async snapshots() {
    const { data } = await api.get(`${SYNC.ENDPOINT}/snapshots`)
    return data.data
  }
}
