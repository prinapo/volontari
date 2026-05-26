import { defineStore } from 'pinia'
import { verificaService } from 'src/services/verifica.service'
import { giustificativiService } from 'src/services/giustificativi.service'
import { filesService } from 'src/services/files.service'

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
  // 1. Tranche via relazione Rendicontazione
  const rendicontazione = item.Rendicontazione
  const relTranche = rendicontazione && typeof rendicontazione === 'object'
    ? String(rendicontazione.Tranche || '').toLowerCase()
    : ''
  if (TRANCHE.some(option => option.value === relTranche)) return relTranche

  // 2. Tranche diretto sul giustificativo (compilato dal volontario)
  const directTranche = (item.Tranche || '').toLowerCase()
  if (TRANCHE.some(option => option.value === directTranche)) return directTranche

  // 3. Fallback: deriva dalla Data
  const month = getMonth(item.Data)
  return TRANCHE_BY_MONTH[month]
}

function isCountedInTotals(item) {
  const stato = String(item.Stato || '').toLowerCase()
  return stato === 'inviato' || stato === 'verificato' || stato === 'approvato'
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

function recalculateRowTotals(row) {
  const tranche = row.tranche
  TRANCHE.forEach(t => {
    tranche[t.value].rendicontato = 0
    tranche[t.value].rimborsabile = 0
    tranche[t.value].count = 0
    tranche[t.value].allegati = 0
  })

  row.giustificativi.forEach(item => {
    if (!isCountedInTotals(item)) return
    const trancheKey = getTrancheKey(item)
    if (!trancheKey) return

    const importo = toNumber(item.Importo)
    tranche[trancheKey].rendicontato += importo
    tranche[trancheKey].rimborsabile += importo * 0.8
    tranche[trancheKey].count += 1
    if (item.Allegato) tranche[trancheKey].allegati += 1
  })

  const totaleRendicontato = TRANCHE.reduce(
    (sum, t) => sum + tranche[t.value].rendicontato,
    0
  )
  const totaleRimborsabileLordo = totaleRendicontato * 0.8
  row.totaleRendicontato = totaleRendicontato
  row.totaleRimborsabile = Math.min(totaleRimborsabileLordo, row.allocato || totaleRimborsabileLordo)
  row.residuoAllocato = Math.max((row.allocato || 0) - totaleRimborsabileLordo, 0)
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
          .filter(item => !item.Invalidato)
          .forEach(item => {
            const projectId = typeof item.Progetto === 'object'
              ? item.Progetto?.id_progetto
              : item.Progetto
            const row = rowsByProject.get(projectId)
            if (!row) return

            row.giustificativi.push(item)
          })

        this.rows = [...rowsByProject.values()]
        this.rows.forEach(rec => recalculateRowTotals(rec))
      } catch (err) {
        this.error = 'Errore nel caricamento della rendicontazione'
        console.error(err)
      } finally {
        this.loading = false
      }
    },

    async verifyGiustificativo(progettoId, giustId) {
      try {
        await giustificativiService.verify(giustId)
        const row = this.rows.find(r => r.idProgetto === progettoId)
        if (!row) return
        const item = row.giustificativi.find(g => g.id === giustId)
        if (!item) return
        item.Stato = 'Verificato'
        recalculateRowTotals(row)
      } catch (err) {
        console.error('Errore nella verifica del giustificativo', err)
        throw err
      }
    },

    async rejectGiustificativo(progettoId, giustId, nota) {
      try {
        await giustificativiService.reject(giustId, nota)
        const row = this.rows.find(r => r.idProgetto === progettoId)
        if (!row) return
        const item = row.giustificativi.find(g => g.id === giustId)
        if (!item) return
        if (item.Allegato) {
          await filesService.updateMeta(item.Allegato, {
            title: `RIFIUTATO_${new Date().toISOString().slice(0, 10)}`
          }).catch(() => {})
        }
        item.Stato = 'Rifiutato'
        item.NotaRifiuto = nota
        recalculateRowTotals(row)
      } catch (err) {
        console.error("Errore nel rifiuto del giustificativo", err)
        throw err
      }
    }
  }
})
