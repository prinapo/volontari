import { defineStore } from 'pinia'
import { giustificativiService } from 'src/services/giustificativi.service'
import { rendicontazioniService } from 'src/services/rendicontazioni.service'
import { FOLDERS } from 'src/utils/constants'
import { uploadAndPrefixFile, markFileObsolete } from 'src/utils/file-naming'

export const useGiustificativiStore = defineStore('giustificativi', {
  state: () => ({
    items: [],
    loading: false,
    saving: false,
    editingItem: null,
    error: null
  }),

  getters: {
    draftItems: state => state.items.filter(i => i.Stato === 'draft'),
    inviatoItems: state => state.items.filter(i => i.Stato === 'inviato'),
    canEdit: state => itemId => {
      const item = state.items.find(i => i.id === itemId)
      return item && item.Stato === 'draft'
    }
  },

  actions: {
    async fetchByProgetto(progettoId) {
      this.loading = true
      try {
        const res = await giustificativiService.getByProgetto(progettoId)
        this.items = res.data.data || []
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || 'Errore nel caricamento dei giustificativi'
      } finally {
        this.loading = false
      }
    },

    async createGiustificativo(data, file) {
      this.saving = true
      try {
        const rendicontazioneId = await this.ensureRendicontazione(data)
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
        return !(created && created.Descrizione !== data.Descrizione)
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || 'Errore nella creazione'
        return false
      } finally {
        this.saving = false
      }
    },

    async ensureRendicontazione(data) {
      if (!data.Famiglia || !data.Progetto) return null

      const existingRes = await rendicontazioniService.findByProject({
        famigliaId: data.Famiglia,
        progettoId: data.Progetto
      })
      const existing = existingRes.data.data?.[0]
      if (existing?.id) return existing.id

      const createRes = await rendicontazioniService.create({
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
      try {
        if (newFile) {
          const existingItem = this.items.find(i => i.id === id)
          if (existingItem?.Allegato) {
            await markFileObsolete(existingItem.Allegato)
          }
          const famigliaId = data.Famiglia || existingItem?.Famiglia
          data.Allegato = await uploadAndPrefixFile(newFile, famigliaId, FOLDERS.GIUSTIFICATIVI)
        }

        const patchRes = await giustificativiService.update(id, data)
        const updated = patchRes.data.data
        if (updated) {
          const idx = this.items.findIndex(i => i.id === id)
          if (idx !== -1) this.items[idx] = { ...this.items[idx], ...updated }
        }
        return true
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || 'Errore nella modifica'
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
          const idx = copy.findIndex(i => i.id === id)
          if (idx !== -1) copy[idx] = { ...copy[idx], ...updated }
          this.items = copy
        }
        return true
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || "Errore nell'invio"
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
          const idx = this.items.findIndex(i => i.id === id)
          if (idx !== -1) this.items[idx] = { ...this.items[idx], ...updated }
        }
        return true
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || "Errore nell'aggiornamento"
        return false
      }
    },

    async invalidateGiustificativo(id) {
      this.saving = true
      try {
        const item = this.items.find(i => i.id === id)
        if (item?.Allegato) {
          await markFileObsolete(item.Allegato)
        }
        await giustificativiService.invalidate(id)
        const idx = this.items.findIndex(i => i.id === id)
        if (idx !== -1) {
          this.items[idx] = { ...this.items[idx], Invalidato: true }
        }
        return true
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || "Errore nell'invalidazione"
        return false
      } finally {
        this.saving = false
      }
    }
  }
})
