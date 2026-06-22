import { defineStore } from 'pinia'
import { famiglieService } from 'src/services/famiglie.service'
import { emailService } from 'src/services/email.service'
import { referentiService } from 'src/services/referenti.service'
import { useAuthStore } from 'stores/auth.store'
import { enrichWithEmails } from 'src/utils/enrichment'

export const useFamiglieStore = defineStore('famiglie', {
  state: () => ({
    famiglieContatti: [],
    famiglia: null,
    selectedFamigliaId: null,
    selectedProgettoId: null,
    loading: false,
    saving: false,
    contattiLoading: false,
    genitori: [],
    altriVolontari: [],
    error: null
  }),

  getters: {
    hasMultipleFamiglie: state => state.famiglieContatti.length > 1,
    famigliaOptions: state =>
      state.famiglieContatti
        .map(fc => ({
          label: fc.Famiglia?.Nome_Famiglia || 'Famiglia senza nome',
          value: fc.Famiglia?.id_famiglia
        }))
        .filter(o => o.value),
    progetti: state => state.famiglia?.Progetti || [],
    selectedProgetto: state => {
      if (!state.progetti || !state.selectedProgettoId) return null
      return state.progetti.find(p => p.id_progetto === state.selectedProgettoId)
    },
    famigliaName: state => state.famiglia?.Nome_Famiglia || '',
    iban: state => state.famiglia?.IBAN || '',
    intestatarioCC: state => state.famiglia?.Intestatario_CC || ''
  },

  actions: {
    async init(contattoId) {
      this.loading = true
      this.error = null
      this.famiglia = null
      this.selectedFamigliaId = null
      this.selectedProgettoId = null
      try {
        const fcRes = await famiglieService.getFamiglieByVolontario(contattoId)
        this.famiglieContatti = fcRes.data.data || []

        if (this.famiglieContatti.length === 1) {
          const famigliaId = this.famiglieContatti[0].Famiglia?.id_famiglia
          if (famigliaId) await this.loadFamiglia(famigliaId)
        }
        // Se 0 o >1 famiglie, nessun auto-caricamento — l'utente sceglie
      } catch (err) {
        this.error = err.response?.data?.errors?.[0]?.message || 'Errore nel caricamento dei dati'
      } finally {
        this.loading = false
      }
    },

    async selectFamiglia(famigliaId) {
      if (!famigliaId) return
      this.selectedFamigliaId = famigliaId
      await this.loadFamiglia(famigliaId)
    },

    async checkAccess(contattoId) {
      if (!contattoId) return false
      try {
        const fcRes = await famiglieService.getFamiglieByVolontario(contattoId)
        this.famiglieContatti = fcRes.data.data || []
        return this.famiglieContatti.length > 0
      } catch (err) {
        this.famiglieContatti = []
        return false
      }
    },

    async loadFamiglia(famigliaId) {
      try {
        const res = await famiglieService.getById(famigliaId)
        this.famiglia = res.data.data
        if (this.progetti.length > 0) {
          this.selectedProgettoId = this.progetti[0].id_progetto
        }
        await Promise.all([this.loadGenitori(famigliaId), this.loadVolontari(famigliaId)])
      } catch (err) {
        this.error = err.response?.data?.errors?.[0]?.message || 'Errore nel caricamento della famiglia'
      }
    },

    async loadGenitori(famigliaId) {
      this.contattiLoading = true
      try {
        const res = await famiglieService.getGenitoriByFamiglia(famigliaId)
        const items = res.data.data || []
        this.genitori = items
          .map(r => ({
            id_contatto: r.Contatto?.id_contatto,
            Nome: r.Contatto?.Nome,
            Cognome: r.Contatto?.Cognome,
            Numero_di_cellulare: r.Contatto?.Numero_di_cellulare,
            Numero_di_telefono: r.Contatto?.Numero_di_telefono,
            _emails: []
          }))
          .filter(c => c.id_contatto)

        const contattoIds = this.genitori.map(g => g.id_contatto).filter(Boolean)
        if (contattoIds.length > 0) {
          try {
            const emailMap = await enrichWithEmails(contattoIds, emailService.getByContatto.bind(emailService))
            this.genitori.forEach(g => {
              g._emails = emailMap[g.id_contatto] || []
            })
          } catch {
            // silent
          }
        }
      } catch (err) {
        this.genitori = []
      } finally {
        this.contattiLoading = false
      }
    },

    async loadVolontari(famigliaId) {
      this.contattiLoading = true
      try {
        const res = await famiglieService.getVolontariByFamiglia(famigliaId)
        const items = res.data.data || []
        const authStore = useAuthStore()
        const currentContattoId = authStore.contattoId

        const filtered = items
          .filter(r => r.Contatto?.id_contatto !== currentContattoId)
          .map(r => ({
            id_contatto: r.Contatto?.id_contatto,
            Nome: r.Contatto?.Nome,
            Cognome: r.Contatto?.Cognome,
            Numero_di_cellulare: r.Contatto?.Numero_di_cellulare,
            Numero_di_telefono: r.Contatto?.Numero_di_telefono,
            _emails: [],
            _referenti: []
          }))
          .filter(c => c.id_contatto)

        const contattoIds = filtered.map(v => v.id_contatto).filter(Boolean)
        if (contattoIds.length > 0) {
          try {
            const emailMap = await enrichWithEmails(contattoIds, emailService.getByContatto.bind(emailService))
            filtered.forEach(v => {
              v._emails = emailMap[v.id_contatto] || []
            })
          } catch {
            // silent
          }
          try {
            const refRes = await referentiService.getByVolontari(contattoIds)
            const refItems = refRes.data.data || []
            const refMap = new Map()
            refItems.forEach(r => {
              const volId = r.Volontario
              if (!refMap.has(volId)) refMap.set(volId, [])
              refMap.get(volId).push({
                id_relazione: r.id,
                id_contatto: r.Referente?.id_contatto,
                Nome: r.Referente?.Nome,
                Cognome: r.Referente?.Cognome
              })
            })
            filtered.forEach(v => {
              v._referenti = refMap.get(v.id_contatto) || []
            })
          } catch {
            // silent
          }
        }
        this.altriVolontari = filtered
      } catch (err) {
        this.altriVolontari = []
      } finally {
        this.contattiLoading = false
      }
    },

    selectProgetto(progettoId) {
      this.selectedProgettoId = progettoId
    },

    async updateIBAN(iban, intestatario) {
      if (!this.famiglia) return false
      this.saving = true
      try {
        const patchRes = await famiglieService.update(this.famiglia.id_famiglia, {
          IBAN: iban,
          Intestatario_CC: intestatario
        })

        const updated = patchRes.data.data

        // merge selettivo: aggiorno solo i campi inviati, preservo relazioni (Progetti, Relazioni)
        this.famiglia.IBAN = updated.IBAN
        this.famiglia.Intestatario_CC = updated.Intestatario_CC
        return true
      } catch (err) {
        this.error = err.response?.data?.errors?.[0]?.message || 'Errore nel salvataggio'
        return false
      } finally {
        this.saving = false
      }
    }
  }
})
