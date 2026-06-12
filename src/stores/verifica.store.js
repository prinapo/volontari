import { defineStore } from 'pinia'
import { verificaService } from 'src/services/verifica.service'
import { giustificativiService } from 'src/services/giustificativi.service'
import { filesService } from 'src/services/files.service'
import { famiglieService } from 'src/services/famiglie.service'
import { contattiService } from 'src/services/contatti.service'
import { gestioneService } from 'src/services/gestione.service'
import { emailService } from 'src/services/email.service'
import { FOLDERS } from 'src/utils/constants'
import { markFileRejected, uploadAndPrefixFile } from 'src/utils/file-naming'
import { enrichWithEmails } from 'src/utils/enrichment'

function toNumber(value) {
  const parsed = parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function isCountedInTotals(item) {
  const stato = String(item.Stato || '').toLowerCase()
  return stato === 'inviato' || stato === 'verificato' || stato === 'approvato'
}

function calcolaStatoRendicontazione(giustificativi) {
  const stati = giustificativi
    .filter(g => !g.Invalidato)
    .map(g => String(g.Stato || '').toLowerCase())
  if (stati.length === 0) return 'nessuno'
  if (stati.every(s => s === 'bozza' || s === '')) return 'bozza'
  if (stati.every(s => s === 'verificato' || s === 'approvato')) return 'verificato'
  if (stati.some(s => s === 'inviato')) return 'in_attesa'
  return 'parziale'
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
    statoRendicontazione: project.StatoRendicontazione || 'nessuno',
    totaleGiustificativi: project.TotaleGiustificativi || 0,
    totaleImporto: toNumber(project.TotaleImporto),
    dataInizio: project.Data_Inizio_Progetto || '',
    dataFine: project.Data_Fine_Progetto || '',
    eta: project.Eta || '',
    descrizioneProgetto: project.Descrizione_Progetto || '',
    descrizioneCondizione: project.Descrizione_Condizione || '',
    dettaglioCosti: project.Dettaglio_Costi || '',
    relazioneRichiedente: project.Relazione_con_il_soggetto_richiedente || '',
    allegatiProgetto: project.Allegati_Progetto || [],
    allegatiISEE: project.Allegati_ISEE || [],
    allegatiGiustificativi: project.Allegati_Giustificativi || [],
    giustificativi: []
  }
}

function recalculateRowTotals(row) {
  let totaleRendicontato = 0

  row.giustificativi.forEach(item => {
    if (!isCountedInTotals(item)) return
    totaleRendicontato += toNumber(item.Importo)
  })

  const totaleRimborsabileLordo = totaleRendicontato * 0.8
  row.totaleRendicontato = totaleRendicontato
  row.totaleRimborsabile = Math.min(totaleRimborsabileLordo, row.allocato || totaleRimborsabileLordo)
  row.residuoAllocato = Math.max((row.allocato || 0) - totaleRimborsabileLordo, 0)
}

export const useVerificaStore = defineStore('verifica', {
  state: () => ({
    rows: [],
    page: 1,
    limit: 25,
    filterCount: 0,
    loading: false,
    error: null,
    submissions: [],
    submissionsLoading: false,
    submissionsTotalCount: 0,
    includeScartati: false,
    anniBandoList: []
  }),

  getters: {
    anniBando: (state) => state.anniBandoList,
    totalPages: (state) => Math.ceil(state.filterCount / state.limit)
  },

  actions: {
    async fetchPage({ page, limit, search, anno, rendicontazioneFilter } = {}) {
      if (page !== undefined) this.page = page
      if (limit !== undefined) this.limit = limit

      this.loading = true
      this.error = null
      try {
        const sort = 'Famiglia,AnnoBando,Cognome_e__Nome_Beneficiario'

        const progettiRes = await verificaService.getProgetti({
          page: this.page,
          limit: this.limit,
          sort,
          search: search !== undefined ? search : undefined,
          anno: anno !== undefined ? anno : undefined,
          rendicontazioneFilter: rendicontazioneFilter !== undefined ? rendicontazioneFilter : undefined,
          meta: 'filter_count'
        })

        const projects = progettiRes.data.data || []
        this.filterCount = progettiRes.data.meta?.filter_count || projects.length

        if (projects.length === 0) {
          this.rows = []
          return
        }

        const famIds = [...new Set(projects.map(p => p.Famiglia).filter(Boolean))]
        let famMap = new Map()
        if (famIds.length > 0) {
          const famRes = await famiglieService.getFamiglieBatch(famIds)
          famMap = new Map(
            (famRes.data.data || []).map(f => [String(f.id_famiglia), f])
          )
        }

        const progettoIds = projects.map(p => p.id_progetto)
        let allGiustificativi = []
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
                const rendMap = new Map((rendRes.data.data || []).map(r => [r.id, r]))
                allGiustificativi.forEach(g => {
                  if (g.Rendicontazione && rendMap.has(g.Rendicontazione)) {
                    g._rendicontazione = rendMap.get(g.Rendicontazione)
                  }
                })
              } catch { /* silent */ }
            }
          } else {
            throw deepErr
          }
        }

        const rowsByProject = new Map()
        projects.forEach(project => {
          const fam = famMap.get(String(project.Famiglia)) || {}
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
        this.error = err.response?.data?.errors?.[0]?.message || 'Errore nel caricamento della rendicontazione'
      } finally {
        this.loading = false
      }
    },

    async fetchAllPages({ search, anno, rendicontazioneFilter } = {}) {
      this.loading = true
      this.error = null
      this.rows = []
      try {
        const PAGE_SIZE = 100
        const sort = 'Famiglia,AnnoBando,Cognome_e__Nome_Beneficiario'
        let page = 1
        let hasMore = true
        const allProjects = []

        while (hasMore) {
          const progettiRes = await verificaService.getProgetti({
            page,
            limit: PAGE_SIZE,
            sort,
            search: search !== undefined ? search : undefined,
            anno: anno !== undefined ? anno : undefined,
            rendicontazioneFilter: rendicontazioneFilter !== undefined ? rendicontazioneFilter : undefined,
            meta: 'filter_count'
          })
          const projects = progettiRes.data.data || []
          this.filterCount = progettiRes.data.meta?.filter_count || 0
          allProjects.push(...projects)
          hasMore = projects.length === PAGE_SIZE
          page++
        }

        if (allProjects.length === 0) {
          this.rows = []
          return
        }

        const famIds = [...new Set(allProjects.map(p => p.Famiglia).filter(Boolean))]
        let famMap = new Map()
        if (famIds.length > 0) {
          const famRes = await famiglieService.getFamiglieBatch(famIds)
          famMap = new Map(
            (famRes.data.data || []).map(f => [String(f.id_famiglia), f])
          )
        }

        const progettoIds = allProjects.map(p => p.id_progetto)
        let allGiustificativi = []
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
                const rendMap = new Map((rendRes.data.data || []).map(r => [r.id, r]))
                allGiustificativi.forEach(g => {
                  if (g.Rendicontazione && rendMap.has(g.Rendicontazione)) {
                    g._rendicontazione = rendMap.get(g.Rendicontazione)
                  }
                })
              } catch { /* silent */ }
            }
          } else {
            throw deepErr
          }
        }

        const rowsByProject = new Map()
        allProjects.forEach(project => {
          const fam = famMap.get(String(project.Famiglia)) || {}
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
        this.error = err.response?.data?.errors?.[0]?.message || 'Errore nel caricamento della rendicontazione'
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
        item.Stato = 'verificato'
        recalculateRowTotals(row)
        await this.patchProgettoAggregates(progettoId)
      } catch (err) {
        this.error = err.response?.data?.errors?.[0]?.message || 'Errore nella verifica del giustificativo'
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
        await this.patchProgettoAggregates(progettoId)
      } catch (err) {
        this.error = err.response?.data?.errors?.[0]?.message || `Errore nell'aggiornamento del campo ${field}`
        throw err
      }
    },

    async patchProgettoAggregates(progettoId) {
      try {
        const row = this.rows.find(r => r.idProgetto === progettoId)
        if (!row) return
        const giustCount = row.giustificativi.filter(g => !g.Invalidato).length
        const totaleImporto = row.giustificativi
          .filter(g => !g.Invalidato)
          .reduce((sum, g) => sum + toNumber(g.Importo), 0)
        const statoRendicontazione = calcolaStatoRendicontazione(row.giustificativi)
        await verificaService.updateProgetto(progettoId, {
          TotaleGiustificativi: giustCount,
          TotaleImporto: totaleImporto,
          StatoRendicontazione: statoRendicontazione
        })
      } catch { /* silent */ }
    },

    async fetchSubmissions({ page, limit, includeScartati } = {}) {
      this.submissionsLoading = true
      try {
        const pageVal = page ?? 1
        const limitVal = limit ?? 25
        const includeScartatiVal = includeScartati ?? this.includeScartati
        let res
        try {
          res = await verificaService.getSubmissions({
            page: pageVal,
            limit: limitVal,
            includeScartati: includeScartatiVal,
            meta: 'filter_count'
          })
        } catch (metaErr) {
          if (metaErr.response?.status === 403) {
            res = await verificaService.getSubmissions({
              page: pageVal,
              limit: limitVal,
              includeScartati: includeScartatiVal
            })
          } else throw metaErr
        }
        const submissions = res.data.data || []
        await this._detectSubmissionStates(submissions)
        this.submissions = submissions
        this.submissionsTotalCount = res.data.meta?.filter_count || submissions.length
      } catch (err) {
        this.submissions = []
        this.submissionsTotalCount = 0
      } finally {
        this.submissionsLoading = false
      }
    },

    async _detectSubmissionStates(submissions) {
      const emails = [...new Set(submissions.map(s => s.email).filter(Boolean))]
      if (emails.length === 0) return

      let allContatti = []
      try {
        const cRes = await contattiService.getByEmails(emails)
        allContatti = cRes.data.data || []
      } catch {
        allContatti = []
      }

      const contattiByEmail = {}
      for (const c of allContatti) {
        if (c.email && c.email.length > 0) {
          for (const e of c.email) {
            const key = (e.email_address || '').toLowerCase()
            if (key) contattiByEmail[key] = c
          }
        }
      }

      const contattoIds = allContatti.map(c => c.id_contatto).filter(Boolean)
      const linkedMap = new Map()
      if (contattoIds.length > 0) {
        try {
          const fcRes = await gestioneService.queryFamiglieContatti(contattoIds)
          for (const fc of (fcRes.data.data || [])) {
            if (fc.Contatto) {
              const cid = typeof fc.Contatto === 'object' ? fc.Contatto.id_contatto : fc.Contatto
              const ru = String(fc.Ruolo_nella_Famiglia || '').toLowerCase()
              if (!linkedMap.has(cid)) {
                linkedMap.set(cid, {
                  famigliaId: fc.Famiglia?.id_famiglia,
                  famigliaNome: fc.Famiglia?.Nome_Famiglia,
                  isGenitore: ru === 'genitore'
                })
              } else if (ru === 'genitore') {
                linkedMap.get(cid).isGenitore = true
              }
            }
          }
        } catch { /* silent */ }
      }

      for (const submission of submissions) {
        const contatto = contattiByEmail[(submission.email || '').toLowerCase()]
        if (!contatto) {
          submission._detectState = 'not_found'
          submission._foundContatto = null
        } else if (!linkedMap.has(contatto.id_contatto)) {
          submission._detectState = 'not_linked'
          submission._foundContatto = contatto
        } else {
          const famInfo = linkedMap.get(contatto.id_contatto)
          submission._foundContatto = contatto
          submission._famigliaId = famInfo.famigliaId
          submission._famigliaNome = famInfo.famigliaNome
          if (famInfo.isGenitore) {
            submission._detectState = 'linked'
          } else {
            submission._detectState = 'not_parent'
          }
        }
      }
    },

    async reconcileSubmission({
      submissionId,
      contattoId,
      emailRecordId,
      famigliaId,
      progettoId,
      note,
      descrizione,
      importo,
      data,
      allegato,
      rightValues,
      copiedFields
    }) {
      this.error = null
      try {
        const submission = this.submissions.find(s => s.id === submissionId)
        if (!submission) throw new Error('Submission not found')

        // 1. PATCH contatto if any contatto field was copied
        if (contattoId && copiedFields && copiedFields.length > 0) {
          const contattoPatch = {}
          if (copiedFields.includes('Nome')) contattoPatch.Nome = rightValues.Nome
          if (copiedFields.includes('Cognome')) contattoPatch.Cognome = rightValues.Cognome
          if (copiedFields.includes('Telefono')) contattoPatch.Numero_di_cellulare = rightValues.Telefono
          if (Object.keys(contattoPatch).length > 0) {
            await contattiService.update(contattoId, contattoPatch)
          }

          // 2. PATCH email if Email was copied
          if (copiedFields.includes('Email') && emailRecordId) {
            await emailService.update(emailRecordId, { email_address: rightValues.Email })
          }
        }

        // 3. PATCH famiglia if IBAN/Intestatario were copied
        if (famigliaId && copiedFields && copiedFields.length > 0) {
          const famPatch = {}
          if (copiedFields.includes('IBAN')) famPatch.IBAN = rightValues.IBAN
          if (copiedFields.includes('Intestatario')) famPatch.Intestatario_CC = rightValues.Intestatario
          if (Object.keys(famPatch).length > 0) {
            await famiglieService.update(famigliaId, famPatch)
          }
        }

        // 4. Move file from public uploads to GIUSTIFICATIVI folder
        if (allegato) {
          await filesService.updateFolder(allegato, FOLDERS.GIUSTIFICATIVI).catch(() => {})
          const famRes = await famiglieService.getFamiglieBatch([famigliaId])
          const nomeFamiglia = famRes.data.data?.[0]?.Nome_Famiglia || ''
          if (nomeFamiglia) {
            const fileRes = await filesService.getFile(allegato)
            const origName = fileRes.data.data?.filename_download || 'file'
            await filesService.renameFile(allegato, `${nomeFamiglia}_${origName}`)
          }
        }

        // 5. Create giustificativo
        const giustData = {
          Descrizione: descrizione ?? submission.descrizione,
          Importo: importo ?? submission.importo,
          Data: data ?? submission.data,
          Allegato: allegato,
          Progetto: progettoId,
          Famiglia: famigliaId,
          Stato: 'inviato'
        }

        const progRes = await verificaService.findProgettoByFamiglia(famigliaId)
        const progetti = progRes.data.data || []
        const progetto = progetti.find(p => p.id_progetto === progettoId)
        if (progetto?.AnnoBando) giustData.AnnoBando = progetto.AnnoBando

        const createRes = await giustificativiService.create(giustData)
        const giustificativoId = createRes.data.data.id

        // 6. Update submission state
        await verificaService.updateSubmission(submissionId, {
          stato: 'riconciliato',
          famiglia_riconciliata: famigliaId,
          progetto_riconciliato: progettoId,
          giustificativo_creato: giustificativoId,
          note_riconciliazione: note || null
        })

        await this.fetchSubmissions({ includeScartati: this.includeScartati })
        await this.fetchPage({})
        await this.patchProgettoAggregates(progettoId)
      } catch (err) {
        this.error = err.response?.data?.errors?.[0]?.message || 'Errore nella riconciliazione'
        throw err
      }
    },

    async scartaSubmission(id, note) {
      this.error = null
      try {
        await verificaService.updateSubmission(id, {
          stato: 'scartato',
          note_riconciliazione: note
        })
        await this.fetchSubmissions({ includeScartati: this.includeScartati })
      } catch (err) {
        this.error = err.response?.data?.errors?.[0]?.message || 'Errore nello scarto'
        throw err
      }
    },

    async ripristinaSubmission(id) {
      this.error = null
      try {
        await verificaService.updateSubmission(id, {
          stato: 'in_attesa',
          note_riconciliazione: null
        })
        await this.fetchSubmissions({ includeScartati: this.includeScartati })
      } catch (err) {
        this.error = err.response?.data?.errors?.[0]?.message || 'Errore nel ripristino'
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
          await markFileRejected(item.Allegato).catch(() => {})
        }
        item.Stato = 'rifiutato'
        item.NotaRifiuto = nota
        recalculateRowTotals(row)
        await this.patchProgettoAggregates(progettoId)
      } catch (err) {
        this.error = err.response?.data?.errors?.[0]?.message || 'Errore nel rifiuto del giustificativo'
        throw err
      }
    },

    async updateBancari(famigliaId, { iban, intestatario }) {
      try {
        const data = {}
        if (iban !== undefined) data.IBAN = iban
        if (intestatario !== undefined) data.Intestatario_CC = intestatario
        if (Object.keys(data).length === 0) return true
        await famiglieService.update(famigliaId, data)
        this.rows.forEach(r => {
          if (r.idFamiglia === famigliaId) {
            if (iban !== undefined) r.iban = iban
            if (intestatario !== undefined) r.intestatario = intestatario
          }
        })
        return true
      } catch (err) {
        this.error = err.response?.data?.errors?.[0]?.message || 'Errore nell\'aggiornamento dati bancari'
        throw err
      }
    },

    async addGiustificativo(formData, file) {
      try {
        let allegatoId = null
        if (file) {
          allegatoId = await uploadAndPrefixFile(file, formData.Famiglia, FOLDERS.GIUSTIFICATIVI)
        }
        await giustificativiService.create({
          Descrizione: formData.Descrizione,
          Importo: formData.Importo,
          Data: formData.Data,
          Stato: formData.Stato || 'draft',
          NotaVolontario: formData.NotaVolontario || '',
          Progetto: formData.Progetto,
          Famiglia: formData.Famiglia,
          AnnoBando: formData.AnnoBando,
          Allegato: allegatoId
        })
        await this.fetchPage({})
        await this.patchProgettoAggregates(formData.Progetto)
        return true
      } catch (err) {
        this.error = err.response?.data?.errors?.[0]?.message || 'Errore nell\'aggiunta del giustificativo'
        throw err
      }
    },

    async loadFamigliaContacts(famigliaId) {
      if (!famigliaId) return { genitori: [], volontari: [] }
      try {
        const [genRes, volRes] = await Promise.all([
          famiglieService.getGenitoriByFamiglia(famigliaId),
          famiglieService.getVolontariByFamiglia(famigliaId)
        ])
        const genitori = genRes.data.data || []
        const volontari = volRes.data.data || []
        const allIds = [
          ...genitori.map(i => i.Contatto?.id_contatto),
          ...volontari.map(i => i.Contatto?.id_contatto)
        ].filter(Boolean)
        if (allIds.length > 0) {
          const emailMap = await enrichWithEmails(allIds, emailService.getByContatto.bind(emailService))
          for (const item of [...genitori, ...volontari]) {
            if (item.Contatto?.id_contatto) {
              item._emails = emailMap[item.Contatto.id_contatto] || []
            }
          }
        }
        return { genitori, volontari }
      } catch {
        return { genitori: [], volontari: [] }
      }
    },

    async reconcileUpdateField(contattoId, famigliaId, key, value) {
      const FIELD_MAP = {
        Nome: { service: 'contatti', field: 'Nome' },
        Cognome: { service: 'contatti', field: 'Cognome' },
        Telefono: { service: 'contatti', field: 'Numero_di_cellulare' },
        IBAN: { service: 'famiglie', field: 'IBAN' },
        Intestatario: { service: 'famiglie', field: 'Intestatario_CC' }
      }
      const mapping = FIELD_MAP[key]
      if (!mapping) throw new Error(`Campo sconosciuto: ${key}`)

      if (mapping.service === 'contatti' && contattoId) {
        await contattiService.update(contattoId, { [mapping.field]: value })
      } else if (mapping.service === 'famiglie' && famigliaId) {
        await famiglieService.update(famigliaId, { [mapping.field]: value })
      }
      return true
    },

    async resolveSubmissionContext(email) {
      const result = {
        contatto: null,
        contattoId: null,
        famigliaId: null,
        famigliaDetail: null,
        rightValues: { Nome: '', Cognome: '', Telefono: '', Email: '', IBAN: '', Intestatario: '' }
      }
      if (!email) return result

      try {
        const cRes = await contattiService.getByEmail(email)
        const contatto = cRes.data.data?.[0]
        if (!contatto) return result

        result.contatto = contatto
        result.contattoId = contatto.id_contatto
        result.rightValues.Nome = contatto.Nome || ''
        result.rightValues.Cognome = contatto.Cognome || ''
        result.rightValues.Telefono = contatto.Numero_di_cellulare || ''
        if (contatto.email?.length > 0) {
          const primary = contatto.email.find(e => e.Primary === true)
          result.rightValues.Email = primary?.email_address || contatto.email[0].email_address || ''
        }

        const fcRes = await famiglieService.getFamiglieByContatto(contatto.id_contatto)
        const fc = fcRes.data.data?.[0]

        let famigliaData = fc?.Famiglia && typeof fc.Famiglia === 'object' ? fc.Famiglia : null

        if (!famigliaData && fc?.Famiglia && typeof fc.Famiglia === 'string') {
          try {
            const famRes = await famiglieService.getById(fc.Famiglia)
            famigliaData = famRes.data.data
          } catch {
            // FK non valido
          }
        }

        if (famigliaData) {
          const fam = famigliaData
          result.famigliaId = fam.id_famiglia
          result.rightValues.IBAN = fam.IBAN || ''
          result.rightValues.Intestatario = fam.Intestatario_CC || ''

          try {
            const famRes = await famiglieService.getById(fam.id_famiglia)
            result.famigliaDetail = famRes.data.data
          } catch {
            result.famigliaDetail = fam
          }
        }
      } catch {
        // silent
      }
      return result
    }
  }
})
