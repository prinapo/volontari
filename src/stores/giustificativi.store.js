import { defineStore } from 'pinia'
import { giustificativiService } from 'src/services/giustificativi.service'
import { FOLDERS } from 'src/utils/constants'
import { uploadAndPrefixFile, markFileObsolete } from 'src/utils/file-naming'

export const useGiustificativiStore = defineStore('giustificativi', {
  state: () => ({
    data: [],
    loading: false,
    saving: false,
    editingItem: null,
    error: null
  }),

  getters: {
    draftItems: state => state.data.filter(i => i.Stato === 'draft'),
    inviatoItems: state => state.data.filter(i => i.Stato === 'inviato'),
    canEdit: state => itemId => {
      const item = state.data.find(i => i.id === itemId)
      return item && item.Stato === 'draft'
    }
  },

  actions: {
    async fetchByProgetto(progettoId) {
      this.loading = true
      this.error = null
      try {
        const res = await giustificativiService.getByProgetto(progettoId)
        this.data = res.data.data || []
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || 'Errore nel caricamento dei giustificativi'
      } finally {
        this.loading = false
      }
    },

    async createGiustificativo(data, file) {
      this.saving = true
      this.error = null
      try {
        const rendicontazioneId = await this._ensureRendicontazione(data)
        let fileId = null
        if (file) {
          fileId = await uploadAndPrefixFile(file, data.Famiglia, FOLDERS.GIUSTIFICATIVI)
        }

        const createRes = await giustificativiService.create({
          Progetto: data.Progetto,
          Descrizione: data.Descrizione,
          Importo: data.Importo,
          Data: data.Data,
          Stato: data.Stato || 'draft',
          Rendicontazione: rendicontazioneId,
          NotaVolontario: data.NotaVolontario || '',
          Allegato: fileId
        })

        const created = createRes.data.data
        if (!created || created.Descrizione !== data.Descrizione) {
          throw new Error('Creazione giustificativo fallita')
        }
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || 'Errore nella creazione'
        throw error
      } finally {
        this.saving = false
      }
    },

    async _ensureRendicontazione(data) {
      if (!data.Famiglia || !data.Progetto) return null

      const existingRes = await giustificativiService.findByProject({
        famigliaId: data.Famiglia,
        progettoId: data.Progetto
      })
      const existing = existingRes.data.data?.[0]
      if (existing?.id) return existing.id

      const createRes = await giustificativiService.createRendicontazione({
        Famiglia: data.Famiglia,
        Progetto: data.Progetto,
        AnnoBando: data.AnnoBando || null,
        Stato: 'ricevuta',
        Data_Ricezione: new Date().toISOString()
      })
      return createRes.data.data?.id || null
    },

    async updateGiustificativo(id, data, newFile) {
      this.saving = true
      this.error = null
      try {
        if (newFile) {
          const existingItem = this.data.find(i => i.id === id)
          if (existingItem?.Allegato) {
            await markFileObsolete(existingItem.Allegato)
          }
          const famigliaId = data.Famiglia || existingItem?.Famiglia
          data.Allegato = await uploadAndPrefixFile(newFile, famigliaId, FOLDERS.GIUSTIFICATIVI)
        }

        const patchRes = await giustificativiService.update(id, data)
        const updated = patchRes.data.data
        if (updated) {
          const idx = this.data.findIndex(i => i.id === id)
          if (idx !== -1)           this.data[idx] = { ...this.data[idx], ...updated }
        }
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || 'Errore nella modifica'
        throw error
      } finally {
        this.saving = false
      }
    },

    async submitGiustificativo(id) {
      this.saving = true
      this.error = null
      try {
        const patchRes = await giustificativiService.submit(id)
        const updated = patchRes.data.data
        if (updated) {
          const copy = [...this.data]
          const idx = copy.findIndex(i => i.id === id)
          if (idx !== -1) copy[idx] = { ...copy[idx], ...updated }
          this.data = copy
        }
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || "Errore nell'invio"
        throw error
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
      this.error = null
      try {
        const patchRes = await giustificativiService.update(id, { [field]: value })
        const updated = patchRes.data.data
        if (updated) {
          const idx = this.data.findIndex(i => i.id === id)
          if (idx !== -1) this.data[idx] = { ...this.data[idx], ...updated }
        }
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || "Errore nell'aggiornamento"
        throw error
      }
    },

    async invalidateGiustificativo(id) {
      this.saving = true
      this.error = null
      try {
        const item = this.data.find(i => i.id === id)
        if (item?.Allegato) {
          await markFileObsolete(item.Allegato)
        }
        await giustificativiService.invalidate(id)
        const idx = this.data.findIndex(i => i.id === id)
        if (idx !== -1) {
          this.data[idx] = { ...this.data[idx], Invalidato: true }
        }
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || "Errore nell'invalidazione"
        throw error
      } finally {
        this.saving = false
      }
    }
  }
})
