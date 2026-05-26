import { defineStore } from 'pinia'
import { verificaService } from 'src/services/verifica.service'

export const TRANCHE = [
  { value: 'luglio', label: 'Luglio', month: 7 },
  { value: 'settembre', label: 'Settembre', month: 9 },
  { value: 'novembre', label: 'Novembre', month: 11 },
  { value: 'febbraio', label: 'Febbraio', month: 2 }
]

const TRANCHE_BY_MONTH = TRANCHE.reduce((acc, tranche) => {
  acc[tranche.month] = tranche.value
  return acc
}, {})

function toNumber(value) {
  const parsed = parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function getMonth(dateValue) {
  if (!dateValue) return null
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return null
  return date.getMonth() + 1
}

function getTrancheKey(item) {
  const rendicontazione = item.Rendicontazione
  const tranche = typeof rendicontazione === 'object'
    ? rendicontazione?.Tranche
    : null

  if (TRANCHE.some(option => option.value === tranche)) {
    return tranche
  }

  const month = getMonth(item.Data)
  return TRANCHE_BY_MONTH[month]
}

function isSubmitted(item) {
  const stato = String(item.Stato || '').toLowerCase()
  return stato === 'inviato' || stato === 'approvato'
}

function normalizeProject(project) {
  const famiglia = project.Famiglia || {}
  return {
    id: project.id_progetto,
    idProgetto: project.id_progetto,
    idFamiglia: famiglia.id_famiglia || '',
    famiglia: famiglia.Nome_Famiglia || '',
    beneficiario: project.Cognome_e__Nome_Beneficiario || '',
    annoBando: project.AnnoBando || '',
    ambito: project.Ambito || '',
    titolo: project.Titolo_Progetto || '',
    allocato: toNumber(project.Allocato),
    iban: famiglia.IBAN || '',
    intestatario: famiglia.Intestatario_CC || '',
    giustificativi: [],
    tranche: TRANCHE.reduce((acc, tranche) => {
      acc[tranche.value] = {
        rendicontato: 0,
        rimborsabile: 0,
        count: 0,
        allegati: 0
      }
      return acc
    }, {})
  }
}

export const useVerificaStore = defineStore('verifica', {
  state: () => ({
    rows: [],
    loading: false,
    error: null
  }),

  getters: {
    anniBando: (state) => {
      const anni = state.rows.map(row => row.annoBando).filter(Boolean)
      return [...new Set(anni)].sort((a, b) => b - a)
    },
    totaleRendicontato: (state) =>
      state.rows.reduce((sum, row) => sum + row.totaleRendicontato, 0),
    totaleRimborsabile: (state) =>
      state.rows.reduce((sum, row) => sum + row.totaleRimborsabile, 0)
  },

  actions: {
    async fetchAll() {
      this.loading = true
      this.error = null
      try {
        const [progettiRes, giustificativiRes] = await Promise.all([
          verificaService.getProgetti(),
          verificaService.getGiustificativi()
        ])

        const rowsByProject = new Map()
        const projects = progettiRes.data.data || []
        projects.forEach(project => {
          const row = normalizeProject(project)
          rowsByProject.set(row.idProgetto, row)
        })

        const giustificativi = giustificativiRes.data.data || []
        giustificativi
          .filter(item => !item.Invalidato && isSubmitted(item))
          .forEach(item => {
            const projectId = typeof item.Progetto === 'object'
              ? item.Progetto?.id_progetto
              : item.Progetto
            const row = rowsByProject.get(projectId)
            if (!row) return

            const trancheKey = getTrancheKey(item)
            if (!trancheKey) return

            const importo = toNumber(item.Importo)
            row.giustificativi.push(item)
            row.tranche[trancheKey].rendicontato += importo
            row.tranche[trancheKey].rimborsabile += importo * 0.8
            row.tranche[trancheKey].count += 1
            if (item.Allegato) row.tranche[trancheKey].allegati += 1
          })

        this.rows = [...rowsByProject.values()].map(row => {
          const totaleRendicontato = TRANCHE.reduce(
            (sum, tranche) => sum + row.tranche[tranche.value].rendicontato,
            0
          )
          const totaleRimborsabileLordo = totaleRendicontato * 0.8
          return {
            ...row,
            totaleRendicontato,
            totaleRimborsabile: Math.min(totaleRimborsabileLordo, row.allocato || totaleRimborsabileLordo),
            residuoAllocato: Math.max((row.allocato || 0) - totaleRimborsabileLordo, 0)
          }
        })
      } catch (err) {
        this.error = 'Errore nel caricamento della rendicontazione'
        console.error(err)
      } finally {
        this.loading = false
      }
    }
  }
})
