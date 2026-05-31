import { defineStore } from 'pinia'
import { verificaService } from 'src/services/verifica.service'
import { giustificativiService } from 'src/services/giustificativi.service'
import { filesService } from 'src/services/files.service'
import { famiglieService } from 'src/services/famiglie.service'

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
  // 1. Tranche via relazione Rendicontazione (deep field o batch fetch)
  const rendicontazione = item.Rendicontazione
  const relTranche = rendicontazione && typeof rendicontazione === 'object'
    ? String(rendicontazione.Tranche || '').toLowerCase()
    : item._rendicontazione
      ? String(item._rendicontazione.Tranche || '').toLowerCase()
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

function normalizeProject(project, famiglia = {}) {
  return {
    id: project.id_progetto,
    idProgetto: project.id_progetto,
    idFamiglia: famiglia.id_famiglia || project.Famiglia || '',
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
    error: null,
    submissions: [],
    submissionsLoading: false,
    totalCount: 0,
    pagination: { page: 1, limit: 25, sortBy: null, descending: false },
    anniBandoList: []
  }),

  getters: {
    anniBando: (state) => state.anniBandoList,
    totaleRendicontato: (state) =>
      state.rows.reduce((sum, row) => sum + row.totaleRendicontato, 0),
    totaleRimborsabile: (state) =>
      state.rows.reduce((sum, row) => sum + row.totaleRimborsabile, 0)
  },

  actions: {
    async fetchAll(params = {}) {
      this.loading = true
      this.error = null
      try {
        if (params.page !== undefined) this.pagination.page = params.page
        if (params.limit !== undefined) this.pagination.limit = params.limit
        if (params.sortBy !== undefined) this.pagination.sortBy = params.sortBy
        if (params.descending !== undefined) this.pagination.descending = params.descending

        const SORT_MAP = {
          'annoBando': 'AnnoBando',
          'famiglia': 'Famiglia',
          'allocato': 'Allocato'
        }
        const sortField = SORT_MAP[this.pagination.sortBy]
        const sort = sortField
          ? (this.pagination.descending ? `-${sortField}` : sortField)
          : 'Famiglia,AnnoBando,Cognome_e__Nome_Beneficiario'

        let progettiRes
        try {
          progettiRes = await verificaService.getProgetti({
            page: this.pagination.page,
            limit: this.pagination.limit,
            sort,
            search: params.search,
            anno: params.anno,
            meta: 'filter_count'
          })
        } catch (metaErr) {
          if (metaErr.response?.status === 403) {
            progettiRes = await verificaService.getProgetti({
              page: this.pagination.page,
              limit: this.pagination.limit,
              sort,
              search: params.search,
              anno: params.anno
            })
          } else {
            throw metaErr
          }
        }

        this.totalCount = progettiRes.data.meta?.filter_count || 0
        const projects = progettiRes.data.data || []

        const famIds = [...new Set(projects.map(p => p.Famiglia).filter(Boolean))]
        let famMap = new Map()
        if (famIds.length > 0) {
          const famRes = await famiglieService.getFamiglieBatch(famIds)
          famMap = new Map(
            (famRes.data.data || []).map(f => [f.id_famiglia, f])
          )
        }

        let allGiustificativi = []
        const progettoIds = projects.map(p => p.id_progetto)
        if (progettoIds.length > 0) {
          try {
            const giustRes = await verificaService.getGiustificativiByProgetti(progettoIds)
            allGiustificativi = giustRes.data.data || []
          } catch (deepErr) {
            if (deepErr.response?.status === 403) {
              const giustRes = await verificaService.getGiustificativiByProgettiLight(progettoIds)
              allGiustificativi = giustRes.data.data || []

              const rendIds = [...new Set(allGiustificativi.map(g => g.Rendicontazione).filter(Boolean))]
              if (rendIds.length > 0) {
                try {
                  const rendRes = await verificaService.getRendicontazioniBatch(rendIds)
                  const rendMap = new Map(
                    (rendRes.data.data || []).map(r => [r.id, r])
                  )
                  allGiustificativi.forEach(g => {
                    if (g.Rendicontazione && rendMap.has(g.Rendicontazione)) {
                      g._rendicontazione = rendMap.get(g.Rendicontazione)
                    }
                  })
                } catch {
                  // rendicontazioni non accessibili
                }
              }
            } else {
              throw deepErr
            }
          }
        }

        const rowsByProject = new Map()
        projects.forEach(project => {
          const fam = famMap.get(project.Famiglia) || {}
          const row = normalizeProject(project, fam)
          rowsByProject.set(row.idProgetto, row)
        })

        allGiustificativi
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

    async fetchAnni() {
      try {
        const res = await verificaService.getAnniBando()
        const anni = (res.data.data || []).map(p => p.AnnoBando).filter(Boolean)
        this.anniBandoList = [...new Set(anni)].sort((a, b) => b - a)
      } catch {
        this.anniBandoList = []
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

    async updateGiustificativoField(progettoId, giustId, field, value) {
      try {
        await giustificativiService.update(giustId, { [field]: value })
        const row = this.rows.find(r => r.idProgetto === progettoId)
        if (!row) return
        const item = row.giustificativi.find(g => g.id === giustId)
        if (!item) return
        item[field] = value
        recalculateRowTotals(row)
      } catch (err) {
        console.error(`Errore nell'aggiornamento del campo ${field}`, err)
        throw err
      }
    },

    async fetchSubmissions() {
      this.submissionsLoading = true
      try {
        const res = await verificaService.getSubmissionsInAttesa()
        this.submissions = res.data.data || []
      } catch (err) {
        console.error('Errore caricamento submission', err)
        this.submissions = []
      } finally {
        this.submissionsLoading = false
      }
    },

    async reconcileSubmission(id, famigliaId, progettoId, note) {
      const submission = this.submissions.find(s => s.id === id)
      if (!submission) throw new Error('Submission not found')

      const giustData = {
        Descrizione: submission.descrizione,
        Importo: submission.importo,
        Data: submission.data,
        Allegato: submission.allegato,
        Progetto: progettoId,
        Famiglia: famigliaId
      }

      const progRes = await verificaService.findProgettoByFamiglia(famigliaId, submission.cognome_beneficiario)
      const progetti = progRes.data.data || []
      const progetto = progetti.find(p => p.id_progetto === progettoId)
      if (progetto?.AnnoBando) giustData.AnnoBando = progetto.AnnoBando

      const createRes = await giustificativiService.create(giustData)
      const giustificativoId = createRes.data.data.id

      await verificaService.updateSubmission(id, {
        stato: 'riconciliato',
        famiglia_riconciliata: famigliaId,
        progetto_riconciliato: progettoId,
        giustificativo_creato: giustificativoId,
        note_riconciliazione: note || null
      })

      this.submissions = this.submissions.filter(s => s.id !== id)
    },

    async scartaSubmission(id, note) {
      await verificaService.updateSubmission(id, {
        stato: 'scartato',
        note_riconciliazione: note
      })
      this.submissions = this.submissions.filter(s => s.id !== id)
    },

    async tryAutoReconcile(submissionId) {
      const submission = this.submissions.find(s => s.id === submissionId)
      if (!submission) return false

      try {
        const famRes = await verificaService.findFamigliaByIBAN(
          submission.iban,
          submission.intestatario
        )
        const famiglie = famRes.data.data || []
        if (famiglie.length !== 1) return false
        const famiglia = famiglie[0]

        const progRes = await verificaService.findProgettoByFamiglia(
          famiglia.id_famiglia,
          submission.cognome_beneficiario
        )
        const progetti = progRes.data.data || []
        if (progetti.length !== 1) return false
        const progetto = progetti[0]

        await this.reconcileSubmission(
          submissionId,
          famiglia.id_famiglia,
          progetto.id_progetto,
          'Riconciliazione automatica'
        )
        return true
      } catch (err) {
        console.error('Auto-reconciliation failed', err)
        return false
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
