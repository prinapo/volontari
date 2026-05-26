import { defineStore } from 'pinia'
import { famiglieService } from 'src/services/famiglie.service'

export const useFamiglieStore = defineStore('famiglie', {
  state: () => ({
    famiglieContatti: [],
    famiglia: null,
    selectedProgettoId: null,
    loading: false,
    saving: false,
    contattiLoading: false,
    genitoriList: [],
    error: null
  }),

  getters: {
    progetti: (state) => state.famiglia?.Progetti || [],
    selectedProgetto: (state) => {
      if (!state.progetti || !state.selectedProgettoId) return null
      return state.progetti.find(
        (p) => p.id_progetto === state.selectedProgettoId
      )
    },
    famigliaName: (state) => state.famiglia?.Nome_Famiglia || '',
    iban: (state) => state.famiglia?.IBAN || '',
    intestatarioCC: (state) => state.famiglia?.Intestatario_CC || '',
    genitori: (state) => state.genitoriList
  },

  actions: {
    async init(contattoId) {
      this.loading = true
      this.error = null
      this.famiglia = null
      this.selectedProgettoId = null
      try {
        const fcRes = await famiglieService.getFamiglieByVolontario(contattoId)
        this.famiglieContatti = fcRes.data.data || []

        if (this.famiglieContatti.length > 0) {
          const famigliaId = this.famiglieContatti[0].Famiglia
          await this.loadFamiglia(famigliaId)
        }
      } catch (err) {
        this.error = 'Errore nel caricamento dei dati'
        console.error(err)
      } finally {
        this.loading = false
      }
    },

    async checkAccess(contattoId) {
      if (!contattoId) return false
      try {
        const fcRes = await famiglieService.getFamiglieByVolontario(contattoId)
        this.famiglieContatti = fcRes.data.data || []
        return this.famiglieContatti.length > 0
      } catch (err) {
        this.famiglieContatti = []
        console.warn('Unable to check family access:', err)
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
        await this.loadGenitori(famigliaId)
      } catch (err) {
        this.error = 'Errore nel caricamento della famiglia'
        console.error(err)
      }
    },

    async loadGenitori(famigliaId) {
      this.contattiLoading = true
      try {
        const res = await famiglieService.getGenitoriByFamiglia(famigliaId)
        const items = res.data.data || []
        this.genitoriList = items.map(r => ({
          id_contatto: r.Contatto?.id_contatto,
          Nome: r.Contatto?.Nome,
          Cognome: r.Contatto?.Cognome,
          Numero_di_cellulare: r.Contatto?.Numero_di_cellulare,
          Numero_di_telefono: r.Contatto?.Numero_di_telefono,
          Email: ''
        })).filter(c => c.id_contatto)

        const contattoIds = this.genitoriList.map(g => g.id_contatto).filter(Boolean)
        if (contattoIds.length > 0) {
          try {
            const emailRes = await famiglieService.getEmailByContatto(contattoIds)
            const emails = emailRes.data.data || []
            const emailMap = {}
            emails.forEach(e => {
              if (e.Contatto_Relation && !emailMap[e.Contatto_Relation]) {
                emailMap[e.Contatto_Relation] = e.email_address
              }
            })
            this.genitoriList.forEach(g => {
              if (emailMap[g.id_contatto]) {
                g.Email = emailMap[g.id_contatto]
              }
            })
          } catch (emailErr) {
            console.error('Errore caricamento email genitori', emailErr)
          }
        }
      } catch (err) {
        this.genitoriList = []
        console.error('Errore caricamento genitori', err)
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
        this.error = 'Errore nel salvataggio'
        return false
      } finally {
        this.saving = false
      }
    }
  }
})
