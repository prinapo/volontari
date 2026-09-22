import { defineStore } from 'pinia'
import { comunicazioniService } from 'src/services/comunicazioni.service'
import { contaDestinatari, inviaComunicazione } from 'src/usecases/comunicazioni'

const FILTERS_DEFAULT = () => ({
  ruoli: [],
  cognome: '',
  statoProgetto: [],
  annoBando: null,
  giustificativi: null,
  pagamenti: [],
  senzaVolontario: false,
  referenteId: null,
  contattoId: null
})

export const useComunicazioniStore = defineStore('comunicazioni', {
  state: () => ({
    audience: 'contatti',
    filters: FILTERS_DEFAULT(),
    oggetto: '',
    corpo: '',
    link: '',
    preview: { count: 0, sample: [] },
    esito: null,
    loading: false,
    sending: false,
    error: null,
    storico: { data: [], loading: false, error: null }
  }),

  getters: {
    payloadFilters: state => ({ audience: state.audience, ...state.filters })
  },

  actions: {
    reset() {
      this.audience = 'contatti'
      this.filters = FILTERS_DEFAULT()
      this.oggetto = ''
      this.corpo = ''
      this.link = ''
      this.preview = { count: 0, sample: [] }
      this.esito = null
      this.error = null
    },

    setAudience(audience) {
      this.audience = audience
      this.filters = FILTERS_DEFAULT()
      this.preview = { count: 0, sample: [] }
      this.esito = null
    },

    async anteprimaDestinatari() {
      this.loading = true
      this.error = null
      this.esito = null
      try {
        this.preview = await contaDestinatari(this.payloadFilters)
        return this.preview
      } catch (error) {
        this.error =
          error.response?.data?.error ||
          error.response?.data?.errors?.[0]?.message ||
          error.message ||
          'Errore nel calcolo dei destinatari'
        throw error
      } finally {
        this.loading = false
      }
    },

    async invia() {
      this.sending = true
      this.error = null
      try {
        this.esito = await inviaComunicazione({
          ...this.payloadFilters,
          subject: this.oggetto,
          body: this.corpo,
          link: this.link || null,
          tipo: this.audience
        })
        return this.esito
      } catch (error) {
        this.error =
          error.response?.data?.error ||
          error.response?.data?.errors?.[0]?.message ||
          error.message ||
          "Errore nell'invio"
        throw error
      } finally {
        this.sending = false
      }
    },

    async fetchStoricoContatto(contattoId) {
      return this._fetchStorico(() => comunicazioniService.getStoricoByContatto(contattoId))
    },

    async fetchStoricoFamiglia(famigliaId) {
      return this._fetchStorico(() => comunicazioniService.getStoricoByFamiglia(famigliaId))
    },

    async _fetchStorico(fetchFn) {
      this.storico.loading = true
      this.storico.error = null
      try {
        const res = await fetchFn()
        this.storico.data = res.data.data || []
        return this.storico.data
      } catch (error) {
        this.storico.error =
          error.response?.data?.errors?.[0]?.message || error.message || 'Errore nel caricamento dello storico'
        throw error
      } finally {
        this.storico.loading = false
      }
    }
  }
})
