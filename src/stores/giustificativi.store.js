import { defineStore } from 'pinia'
import { giustificativiService } from 'src/services/giustificativi.service'
import { filesService } from 'src/services/files.service'

export const useGiustificativiStore = defineStore('giustificativi', {
  state: () => ({
    items: [],
    loading: false,
    saving: false,
    editingItem: null,
    error: null
  }),

  getters: {
    draftItems: (state) => state.items.filter((i) => i.Stato === 'draft'),
    inviatoItems: (state) =>
      state.items.filter((i) => i.Stato === 'Inviato' || i.Stato === 'approvato'),
    canEdit: (state) => (itemId) => {
      const item = state.items.find((i) => i.id === itemId)
      return item && item.Stato === 'draft'
    }
  },

  actions: {
    async fetchByProgetto(progettoId) {
      this.loading = true
      try {
        const res = await giustificativiService.getByProgetto(progettoId)
        this.items = res.data.data || []
      } catch (err) {
        this.error = 'Errore nel caricamento dei giustificativi'
        console.error(err)
      } finally {
        this.loading = false
      }
    },

    async createGiustificativo(data, file) {
      this.saving = true
      try {
        let fileId = null
        if (file) {
          const uploadRes = await filesService.upload(file, '91a9c958-206f-4e1c-8143-e67f85398d0c')
          fileId = uploadRes.data.data.id
        }

        const createRes = await giustificativiService.create({
          Progetto: data.Progetto,
          Descrizione: data.Descrizione,
          Importo: data.Importo,
          Data: data.Data,
          Stato: data.Stato || 'draft',
          Allegato: fileId
        })

        const created = createRes.data.data
        if (created && created.Descrizione !== data.Descrizione) {
          console.error('[store] Create verification failed')
          return false
        }
        return true
      } catch (err) {
        this.error = 'Errore nella creazione'
        return false
      } finally {
        this.saving = false
      }
    },

    async updateGiustificativo(id, data, newFile) {
      this.saving = true
      try {
        if (newFile) {
          const existingItem = this.items.find(i => i.id === id)
          if (existingItem?.Allegato) {
            await filesService.updateMeta(existingItem.Allegato, {
              title: `OBSOLETE_${new Date().toISOString().slice(0, 10)}_${newFile.name}`
            })
          }
          const uploadRes = await filesService.upload(newFile, '91a9c958-206f-4e1c-8143-e67f85398d0c')
          data.Allegato = uploadRes.data.data.id
        }

        const patchRes = await giustificativiService.update(id, data)
        const updated = patchRes.data.data
        if (updated) {
          const idx = this.items.findIndex((i) => i.id === id)
          if (idx !== -1) this.items[idx] = { ...this.items[idx], ...updated }
        }
        return true
      } catch (err) {
        this.error = 'Errore nella modifica'
        return false
      } finally {
        this.saving = false
      }
    },

    async submitGiustificativo(id) {
      this.saving = true
      try {
        const patchRes = await giustificativiService.submit(id)
        const updated = patchRes.data.data
        if (updated) {
          const copy = [...this.items]
          const idx = copy.findIndex((i) => i.id === id)
          if (idx !== -1) copy[idx] = { ...copy[idx], ...updated }
          this.items = copy
        }
        return true
      } catch (err) {
        this.error = "Errore nell'invio"
        return false
      } finally {
        this.saving = false
      }
    },

    startInlineEdit(item) {
      this.editingItem = { ...item }
    },

    cancelInlineEdit() {
      this.editingItem = null
    },

    async saveInlineEdit(id, field, value) {
      try {
        const patchRes = await giustificativiService.update(id, { [field]: value })
        const updated = patchRes.data.data
        if (updated) {
          const idx = this.items.findIndex((i) => i.id === id)
          if (idx !== -1) this.items[idx] = { ...this.items[idx], ...updated }
        }
        return true
      } catch (err) {
        this.error = "Errore nell'aggiornamento"
        return false
      }
    },

    async invalidateGiustificativo(id) {
      this.saving = true
      try {
        await giustificativiService.invalidate(id)
        const idx = this.items.findIndex(i => i.id === id)
        if (idx !== -1) {
          this.items[idx] = { ...this.items[idx], Invalidato: true }
        }
        return true
      } catch (err) {
        this.error = "Errore nell'invalidazione"
        return false
      } finally {
        this.saving = false
      }
    }
  }
})
