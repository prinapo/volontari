import { defineStore } from 'pinia'
import { dashboardService } from 'src/services/dashboard.service'

const toNum = v => Number.parseFloat(v) || 0

function emptyMetric() {
  return {
    progetti: 0,
    famiglie: new Set(),
    allocato: 0,
    rendicontato: 0,
    verificato: 0,
    proposto: 0,
    inPagamento: 0,
    pagato: 0,
    residuo: 0,
    chiusi: 0,
    perAmbito: {},
    perStatoRendicontazione: {}
  }
}

function addToMetric(metric, progetto) {
  metric.progetti++
  metric.famiglie.add(progetto.Famiglia)
  metric.allocato += toNum(progetto.Allocato)
  metric.rendicontato += toNum(progetto.TotaleImporto)
  metric.verificato += toNum(progetto.TotaleVerificato)
  metric.proposto += toNum(progetto.TotaleProposto)
  metric.inPagamento += toNum(progetto.TotaleInPagamento)
  metric.pagato += toNum(progetto.TotalePagato)
  metric.residuo += toNum(progetto.ResiduoAllocato)
  if (progetto.StatoProgetto === 'chiuso') metric.chiusi++
  const ambito = progetto.Ambito || 'Senza ambito'
  metric.perAmbito[ambito] = (metric.perAmbito[ambito] || 0) + 1
  const stato = progetto.StatoRendicontazione || 'nessuno'
  metric.perStatoRendicontazione[stato] = (metric.perStatoRendicontazione[stato] || 0) + 1
}

export function buildAggregati(progetti, pagamenti) {
  const byYear = {}
  const totali = emptyMetric()

  for (const p of progetti) {
    const anno = p.AnnoBando ?? 'Senza anno'
    if (!byYear[anno]) byYear[anno] = emptyMetric()
    addToMetric(byYear[anno], p)
    addToMetric(totali, p)
  }

  const pagByStato = {}
  const pagByYear = {}
  for (const pg of pagamenti) {
    const stato = pg.Stato || 'sconosciuto'
    const importo = toNum(pg.Importo)
    pagByStato[stato] = (pagByStato[stato] || 0) + importo
    const anno = pg.DataProposta ? new Date(pg.DataProposta).getFullYear() : 'Senza anno'
    if (!pagByYear[anno]) pagByYear[anno] = {}
    pagByYear[anno][stato] = (pagByYear[anno][stato] || 0) + importo
  }

  const finalize = metric => ({
    ...metric,
    famiglie: metric.famiglie.size
  })

  const byYearFinal = {}
  for (const [anno, m] of Object.entries(byYear)) {
    byYearFinal[anno] = finalize(m)
  }

  return {
    byYear: byYearFinal,
    totali: finalize(totali),
    pagByStato,
    pagByYear
  }
}

export const useDashboardStore = defineStore('dashboard', {
  state: () => ({
    data: null,
    loading: false,
    error: null,
    selectedAnno: null
  }),

  getters: {
    anni: state => {
      if (!state.data) return []
      return Object.keys(state.data.byYear)
        .map(Number)
        .filter(Number.isFinite)
        .sort((a, b) => b - a)
    },

    metriche: state => {
      if (!state.data) return null
      const hasAnno = state.selectedAnno !== null && state.selectedAnno !== undefined
      const m = hasAnno ? state.data.byYear[state.selectedAnno] : state.data.totali
      return m || null
    },

    barProgressi: state => {
      if (!state.data) return []
      const anni = Object.keys(state.data.byYear)
        .map(Number)
        .filter(Number.isFinite)
        .sort((a, b) => a - b)
      return anni.map(anno => {
        const m = state.data.byYear[anno]
        return {
          anno,
          allocato: m.allocato,
          verificato: m.verificato,
          pagato: m.pagato,
          residuo: m.residuo
        }
      })
    },

    donutAmbito: state => {
      const m = state.metriche
      if (!m) return []
      return Object.entries(m.perAmbito)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
    },

    donutStati: state => {
      const m = state.metriche
      if (!m) return []
      return Object.entries(m.perStatoRendicontazione)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
    },

    donutPagamenti: state => {
      if (!state.data) return []
      const hasAnno = state.selectedAnno !== null && state.selectedAnno !== undefined
      const source = hasAnno ? state.data.pagByYear[state.selectedAnno] : state.data.pagByStato
      if (!source) return []
      return Object.entries(source)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
    },

    sommaPagamenti: state => {
      const m = state.metriche
      if (!m) return 0
      return m.inPagamento + m.pagato
    },

    pctTotale: state => {
      const m = state.metriche
      if (!m || !m.allocato) return 0
      return Math.round(((m.inPagamento + m.pagato) / m.allocato) * 100)
    },

    pctPagato: state => {
      const m = state.metriche
      if (!m || !m.allocato) return 0
      return Math.round((m.pagato / m.allocato) * 100)
    },

    pctRendicontato: state => {
      const m = state.metriche
      if (!m || !m.allocato) return 0
      return Math.round((m.rendicontato / m.allocato) * 100)
    },

    pctVerificato: state => {
      const m = state.metriche
      if (!m || !m.allocato) return 0
      return Math.round((m.verificato / m.allocato) * 100)
    },

    residuoLive: state => {
      const m = state.metriche
      if (!m) return 0
      return Math.max(m.allocato - (m.proposto + m.inPagamento + m.pagato), 0)
    },

    gauge() {
      return this.pctTotale
    }
  },

  actions: {
    async fetchDashboard() {
      this.loading = true
      this.error = null
      try {
        const [progRes, pagRes] = await Promise.all([dashboardService.getProgetti(), dashboardService.getPagamenti()])
        this.data = buildAggregati(progRes.data.data || [], pagRes.data.data || [])
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || error.message || 'Errore caricamento dashboard'
        this.data = null
      } finally {
        this.loading = false
      }
    }
  }
})
