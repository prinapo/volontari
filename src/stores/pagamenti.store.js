import { defineStore } from 'pinia'
import { adminService } from 'src/services/admin.service'
import { associazioniService } from 'src/services/associazioni.service'
import { famiglieService } from 'src/services/famiglie.service'
import { listePagamentiService } from 'src/services/liste-pagamenti.service'
import { pagamentiService } from 'src/services/pagamenti.service'
import { progettiService } from 'src/services/progetti.service'
import { verificaService } from 'src/services/verifica.service'
import { STATO_PAGAMENTO, STATO_PROGETTO, STORAGE_KEYS } from 'src/utils/constants'

export const usePagamentiStore = defineStore('pagamenti', {
  state: () => ({
    proposti: [],
    inCorso: [],
    falliti: [],
    batches: [],
    associazioni: [],
    budgetMap: {},
    loading: false,
    error: null,
    liste: []
  }),

  getters: {
    residuoAssociazione: state => nome => {
      const budget = state.budgetMap[nome] || 0
      const getBatchId = p => (typeof p.Batch === 'object' ? p.Batch?.id : p.Batch)
      const impegnato = state.inCorso
        .filter(p => {
          const batch = state.batches.find(b => b.id === getBatchId(p))
          return batch?.Associazione === nome
        })
        .reduce((s, p) => s + (Number.parseFloat(p.Importo) || 0), 0)
      const pagato = state.proposti
        .filter(p => {
          const batch = state.batches.find(b => b.id === getBatchId(p))
          return batch?.Associazione === nome
        })
        .reduce((s, p) => s + (Number.parseFloat(p.Importo) || 0), 0)
      return budget - impegnato - pagato
    }
  },

  actions: {
    async init() {
      try {
        await Promise.all([
          this.fetchAssociazioni(),
          this.fetchProposti(),
          this.fetchInCorso(),
          this.fetchFalliti(),
          this.fetchBatches(),
          this.fetchListe()
        ])
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || error.message || 'Errore inizializzazione pagamenti'
      }
    },

    _ricalcolaPropostaSingola(row, giustByProgetto, pagByProgetto, writeOps, ricalcolaSet) {
      const pid = row.idProgetto
      const allocato = Number.parseFloat(row.allocato) || 0
      const giustificativi = giustByProgetto[pid] || []
      const pagamenti = pagByProgetto[pid] || []

      const totaleVerificato = giustificativi
        .filter(g => g.Stato === 'verificato')
        .reduce((s, g) => s + (Number.parseFloat(g.Importo) || 0), 0)

      const totaleStorico = pagamenti
        .filter(p => p.Stato === STATO_PAGAMENTO.IN_PAGAMENTO || p.Stato === STATO_PAGAMENTO.PAGATO)
        .reduce((s, p) => s + (Number.parseFloat(p.Importo) || 0), 0)

      const erogabile = Math.min(totaleVerificato, allocato)
      const nuovoProposto = erogabile - totaleStorico
      const esistente = pagamenti.find(p => p.Stato === STATO_PAGAMENTO.PROPOSTO)

      if (nuovoProposto > 0) {
        if (esistente) {
          if (Number.parseFloat(esistente.Importo) !== nuovoProposto) {
            writeOps.push(pagamentiService.updatePagamento(esistente.id, { Importo: nuovoProposto }))
            ricalcolaSet.add(pid)
          }
        } else {
          writeOps.push(
            pagamentiService.createPagamento({
              Progetto: pid,
              Famiglia: row.idFamiglia,
              Importo: nuovoProposto,
              Stato: STATO_PAGAMENTO.PROPOSTO,
              IBAN: row.iban || '',
              Intestatario: row.intestatario || '',
              DataProposta: new Date().toISOString()
            })
          )
          ricalcolaSet.add(pid)
        }
      } else if (esistente) {
        writeOps.push(pagamentiService.deletePagamento(esistente.id))
        ricalcolaSet.add(pid)
      }
    },

    async ricalcolaPropostiDaProgetti(progetti) {
      if (!progetti?.length) return
      const aperti = progetti.filter(r => r.statoProgetto !== 'chiuso')
      if (!aperti.length) return
      const ids = aperti.map(r => r.idProgetto)

      try {
        const [giustRes, pagRes] = await Promise.all([
          verificaService.getGiustificativiByProgetti(ids),
          pagamentiService.getPagamenti({ 'filter[Progetto][_in]': ids.join(','), limit: -1 })
        ])
        const giustByProgetto = {}
        for (const g of giustRes.data.data || []) {
          const pid = typeof g.Progetto === 'object' ? g.Progetto?.id_progetto : g.Progetto
          if (!giustByProgetto[pid]) giustByProgetto[pid] = []
          giustByProgetto[pid].push(g)
        }
        const pagByProgetto = {}
        for (const p of pagRes.data.data || []) {
          const pid = typeof p.Progetto === 'object' ? p.Progetto?.id_progetto : p.Progetto
          if (!pagByProgetto[pid]) pagByProgetto[pid] = []
          pagByProgetto[pid].push(p)
        }

        const writeOps = []
        const ricalcolaSet = new Set()
        for (const row of aperti) {
          this._ricalcolaPropostaSingola(row, giustByProgetto, pagByProgetto, writeOps, ricalcolaSet)
        }

        if (writeOps.length > 0) await Promise.all(writeOps)
        if (ricalcolaSet.size > 0) {
          await Promise.all([...ricalcolaSet].map(id => this.ricalcolaTotaliProgetto(id)))
        }
        await this.fetchProposti()
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || error.message || 'Errore nel ricalcolo proposte'
      }
    },

    async fetchAssociazioni() {
      try {
        const res = await associazioniService.getAll()
        this.associazioni = res.data.data || []
        this.budgetMap = {}
        for (const a of this.associazioni) {
          this.budgetMap[a.Nome] = Number.parseFloat(a.Budget) || 0
        }
      } catch (error) {
        this.error =
          error.response?.data?.errors?.[0]?.message || error.message || 'Errore nel caricamento associazioni'
        this.associazioni = []
      }
    },

    async fetchProposti() {
      try {
        const res = await pagamentiService.getPagamenti({
          'filter[Stato][_eq]': STATO_PAGAMENTO.PROPOSTO,
          fields:
            '*,Progetto.id_progetto,Progetto.Cognome_Beneficiario,Progetto.Nome_Beneficiario,Famiglia.id_famiglia,Famiglia.Nome_Famiglia',
          limit: -1,
          sort: '-DataProposta'
        })
        this.proposti = res.data.data || []
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || error.message || 'Errore nel caricamento proposti'
        this.proposti = []
      }
    },

    async fetchInCorso() {
      try {
        const res = await pagamentiService.getPagamenti({
          'filter[Stato][_in]': `${STATO_PAGAMENTO.IN_PAGAMENTO},${STATO_PAGAMENTO.PAGATO}`,
          fields:
            '*,Batch.Nome,Batch.Associazione,Progetto.id_progetto,Famiglia.id_famiglia,Famiglia.Nome_Famiglia,Famiglia.IBAN,Famiglia.Intestatario_CC',
          limit: -1,
          sort: '-DataProposta'
        })
        this.inCorso = res.data.data || []
      } catch (error) {
        this.error =
          error.response?.data?.errors?.[0]?.message || error.message || 'Errore nel caricamento pagamenti in corso'
        this.inCorso = []
      }
    },

    async fetchFalliti() {
      try {
        const res = await pagamentiService.getPagamenti({
          'filter[Stato][_eq]': STATO_PAGAMENTO.FALLITO,
          fields: '*,Progetto.id_progetto,Famiglia.id_famiglia,Famiglia.Nome_Famiglia',
          limit: -1
        })
        this.falliti = res.data.data || []
      } catch (error) {
        this.error =
          error.response?.data?.errors?.[0]?.message || error.message || 'Errore nel caricamento pagamenti falliti'
        this.falliti = []
      }
    },

    async fetchBatches() {
      try {
        const res = await pagamentiService.getBatches({
          fields: '*',
          limit: -1,
          sort: '-DataCreazione'
        })
        this.batches = res.data.data || []
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || error.message || 'Errore nel caricamento batch'
        this.batches = []
      }
    },

    async ricalcolaProposta(progettoId, { iban, intestatario } = {}) {
      try {
        const progRes = await progettiService.getById(progettoId)
        const progetto = progRes.data.data
        if (!progetto || progetto.StatoProgetto === STATO_PROGETTO.CHIUSO) return

        const giustRes = await verificaService.getGiustificativiByProgetto(progettoId)
        const giustificativi = giustRes.data.data || []
        const totaleVerificato = giustificativi
          .filter(g => g.Stato === 'verificato')
          .reduce((s, g) => s + (Number.parseFloat(g.Importo) || 0), 0)

        const pagamentiRes = await pagamentiService.getPagamenti({
          'filter[Progetto][_eq]': progettoId,
          'filter[_or][0][Stato][_eq]': STATO_PAGAMENTO.IN_PAGAMENTO,
          'filter[_or][1][Stato][_eq]': STATO_PAGAMENTO.PAGATO,
          limit: -1
        })
        const totaleStorico = (pagamentiRes.data.data || []).reduce(
          (s, p) => s + (Number.parseFloat(p.Importo) || 0),
          0
        )

        const allocato = Number.parseFloat(progetto.Allocato) || 0
        const erogabile = Math.min(totaleVerificato, allocato)
        const nuovoProposto = erogabile - totaleStorico

        const esistenteRes = await pagamentiService.getPagamenti({
          'filter[Progetto][_eq]': progettoId,
          'filter[Stato][_eq]': STATO_PAGAMENTO.PROPOSTO,
          limit: 1
        })
        const esistente = (esistenteRes.data.data || [])[0]

        if (nuovoProposto > 0) {
          await (esistente
            ? pagamentiService.updatePagamento(esistente.id, { Importo: nuovoProposto })
            : pagamentiService.createPagamento({
                Progetto: progettoId,
                Famiglia: progetto.Famiglia,
                Importo: nuovoProposto,
                Stato: STATO_PAGAMENTO.PROPOSTO,
                IBAN: iban || progetto.IBAN || '',
                Intestatario: intestatario || progetto.Intestatario_CC || '',
                DataProposta: new Date().toISOString()
              }))
        } else if (esistente) {
          await pagamentiService.deletePagamento(esistente.id)
        }

        await this.ricalcolaTotaliProgetto(progettoId)
        await this.fetchProposti()
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || error.message
      }
    },

    async ricalcolaTotaliProgetto(progettoId) {
      try {
        const progRes = await progettiService.getById(progettoId)
        const progetto = progRes.data.data
        if (!progetto) return

        const giustRes = await verificaService.getGiustificativiByProgetto(progettoId)
        const giustificativi = giustRes.data.data || []
        const totaleVerificato = giustificativi
          .filter(g => g.Stato === 'verificato')
          .reduce((s, g) => s + (Number.parseFloat(g.Importo) || 0), 0)

        const pagamentiRes = await pagamentiService.getPagamenti({
          'filter[Progetto][_eq]': progettoId,
          limit: -1
        })
        const tutti = pagamentiRes.data.data || []
        const proposto = tutti.find(p => p.Stato === STATO_PAGAMENTO.PROPOSTO)
        const inPagamento = tutti
          .filter(p => p.Stato === STATO_PAGAMENTO.IN_PAGAMENTO)
          .reduce((s, p) => s + (Number.parseFloat(p.Importo) || 0), 0)
        const pagato = tutti
          .filter(p => p.Stato === STATO_PAGAMENTO.PAGATO)
          .reduce((s, p) => s + (Number.parseFloat(p.Importo) || 0), 0)

        const allocato = Number.parseFloat(progetto.Allocato) || 0
        const totaleProposto = proposto ? Number.parseFloat(proposto.Importo) || 0 : 0
        const residuo = allocato - (totaleProposto + inPagamento + pagato)

        await progettiService.updateStats(progettoId, {
          TotaleVerificato: totaleVerificato,
          TotaleProposto: totaleProposto,
          TotaleInPagamento: inPagamento,
          TotalePagato: pagato,
          ResiduoAllocato: Math.max(0, residuo)
        })

        if (pagato >= allocato && progetto.StatoProgetto === STATO_PROGETTO.APERTO) {
          await this.chiudiProgetto(progettoId, { automatica: true })
        }
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || error.message
      }
    },

    async _aggiornaListaBatch(batchId) {
      try {
        const pagamentiRes = await pagamentiService.getPagamenti({
          'filter[Batch][_eq]': batchId,
          'filter[_or][0][Stato][_eq]': STATO_PAGAMENTO.IN_PAGAMENTO,
          'filter[_or][1][Stato][_eq]': STATO_PAGAMENTO.PAGATO,
          fields: 'id,Stato,Importo,IBAN,Intestatario,Famiglia.id_famiglia,Famiglia.Nome_Famiglia',
          limit: -1
        })
        const pagamenti = pagamentiRes.data.data || []

        const batch = this.batches.find(b => b.id === batchId)
        if (!batch) return
        const nome = batch.Nome

        const allListe = await listePagamentiService.getAll()
        const existingLista = allListe.find(l => l.Nome === `${nome} (batch)`)

        if (pagamenti.length === 0) {
          if (existingLista) {
            if (existingLista.File) await listePagamentiService.deleteFile(existingLista.File)
            await listePagamentiService.delete(existingLista.id)
          }
          await this.fetchListe()
          return
        }

        const csvHeader = 'Famiglia,Importo,IBAN,Intestatario'
        const csvRows = pagamenti.map(p => {
          const importo = (Number.parseFloat(p.Importo) || 0).toFixed(2).replace('.', ',')
          return `"${p.Famiglia?.Nome_Famiglia || ''}","${importo}","${p.IBAN || ''}","${p.Intestatario || ''}"`
        })
        const csv = [csvHeader, ...csvRows].join('\n')
        const totale = pagamenti.reduce((s, p) => s + (Number.parseFloat(p.Importo) || 0), 0)

        const fileId = await listePagamentiService.uploadCsv(csv, nome)

        if (existingLista) {
          if (existingLista.File) await listePagamentiService.deleteFile(existingLista.File)
          await listePagamentiService.update(existingLista.id, {
            File: fileId,
            Totale: totale,
            ConteggioRighe: pagamenti.length
          })
        } else {
          await listePagamentiService.create({
            Nome: `${nome} (batch)`,
            File: fileId,
            Totale: totale,
            ConteggioRighe: pagamenti.length,
            DataCreazione: new Date().toISOString()
          })
        }
        await this.fetchListe()
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || error.message || 'Errore aggiornamento lista batch'
      }
    },

    async ripristinaProposto(pagamentoId) {
      this.loading = true
      try {
        const pagamento = (await pagamentiService.getPagamenti({ 'filter[id][_eq]': pagamentoId, limit: 1 })).data
          .data?.[0]
        if (!pagamento) throw new Error('Pagamento non trovato')
        await pagamentiService.updatePagamento(pagamentoId, {
          Stato: STATO_PAGAMENTO.PROPOSTO,
          Batch: null
        })
        await this.ricalcolaTotaliProgetto(pagamento.Progetto)
        await this.fetchProposti()
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || error.message
      } finally {
        this.loading = false
      }
    },

    async creaBatch({ nome, associazione, pagamentoIds }) {
      this.loading = true
      this.error = null
      try {
        const pagamentiRes = await pagamentiService.getPagamenti({
          'filter[id][_in]': pagamentoIds.join(','),
          fields: 'id,Stato,Importo,IBAN,Intestatario,Famiglia.id_famiglia,Famiglia.Nome_Famiglia,Progetto.id_progetto',
          limit: -1
        })
        const pagamenti = pagamentiRes.data.data || []

        if (pagamenti.some(p => p.Stato !== STATO_PAGAMENTO.PROPOSTO)) {
          throw new Error('Solo pagamenti in stato proposto possono essere inclusi in un batch')
        }

        const totale = pagamenti.reduce((s, p) => s + (Number.parseFloat(p.Importo) || 0), 0)
        const residuo = this.residuoAssociazione(associazione)
        if (totale > residuo) {
          throw new Error(
            `Capienza insufficiente per ${associazione}. Disponibile: €${residuo.toFixed(2)}, richiesto: €${totale.toFixed(2)}`
          )
        }

        const userId = localStorage.getItem(STORAGE_KEYS.USER_ID)
        const batchRes = await pagamentiService.createBatch({
          Nome: nome,
          Associazione: associazione,
          DataCreazione: new Date().toISOString(),
          DataInvioTesoriere: new Date().toISOString(),
          CreatoDA: userId
        })
        const batchId = batchRes.data.data?.id

        for (const p of pagamenti) {
          await pagamentiService.updatePagamento(p.id, {
            Stato: STATO_PAGAMENTO.IN_PAGAMENTO,
            Batch: batchId
          })
          await this.ricalcolaTotaliProgetto(p.Progetto)
        }

        // Genera CSV del batch e salva in Liste esportazione
        const csvHeader = 'Famiglia,Importo,IBAN,Intestatario'
        const csvRows = pagamenti.map(p => {
          const importo = (Number.parseFloat(p.Importo) || 0).toFixed(2).replace('.', ',')
          return `"${p.Famiglia?.Nome_Famiglia || ''}","${importo}","${p.IBAN || ''}","${p.Intestatario || ''}"`
        })
        const csv = [csvHeader, ...csvRows].join('\n')
        try {
          const fileId = await listePagamentiService.uploadCsv(csv, nome)
          await listePagamentiService.create({
            Nome: `${nome} (batch)`,
            File: fileId,
            Totale: totale,
            ConteggioRighe: pagamenti.length,
            DataCreazione: new Date().toISOString()
          })
        } catch {
          // Se fallisce la generazione CSV, il batch è comunque creato
        }

        await this.init()
        return batchId
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || error.message || 'Errore creazione batch'
        throw error
      } finally {
        this.loading = false
      }
    },

    async segnaPagato(pagamentoId) {
      this.loading = true
      try {
        const pagamento = (await pagamentiService.getPagamenti({ 'filter[id][_eq]': pagamentoId, limit: 1 })).data
          .data?.[0]
        if (!pagamento || pagamento.Stato !== STATO_PAGAMENTO.IN_PAGAMENTO) {
          throw new Error('Solo pagamenti in_pagamento possono essere segnati come pagati')
        }
        await pagamentiService.updatePagamento(pagamentoId, {
          Stato: STATO_PAGAMENTO.PAGATO,
          DataPagamento: new Date().toISOString()
        })
        await this.ricalcolaTotaliProgetto(pagamento.Progetto)
        await this.inviaNotificaPagamento(pagamento)
        await this.init()
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || error.message
      } finally {
        this.loading = false
      }
    },

    async segnaFallito(pagamentoId, note) {
      this.loading = true
      try {
        const pagamento = (await pagamentiService.getPagamenti({ 'filter[id][_eq]': pagamentoId, limit: 1 })).data
          .data?.[0]
        if (!pagamento || pagamento.Stato !== STATO_PAGAMENTO.IN_PAGAMENTO) {
          throw new Error('Solo pagamenti in_pagamento possono essere segnati come falliti')
        }
        await pagamentiService.updatePagamento(pagamentoId, {
          Stato: STATO_PAGAMENTO.FALLITO,
          NoteEsito: note
        })
        await this.ricalcolaTotaliProgetto(pagamento.Progetto)
        if (pagamento.Batch) await this._aggiornaListaBatch(pagamento.Batch)
        await this.init()
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || error.message
      } finally {
        this.loading = false
      }
    },

    async segnaAnnullato(pagamentoId) {
      this.loading = true
      try {
        const pagamento = (await pagamentiService.getPagamenti({ 'filter[id][_eq]': pagamentoId, limit: 1 })).data
          .data?.[0]
        if (!pagamento || !['in_pagamento', 'fallito'].includes(pagamento.Stato)) {
          throw new Error('Solo pagamenti in_pagamento o falliti possono essere rimossi dal gruppo')
        }
        const batchId = pagamento.Batch
        await pagamentiService.updatePagamento(pagamentoId, {
          Stato: STATO_PAGAMENTO.ANNULLATO,
          Batch: null,
          NoteEsito: 'Rimosso dal gruppo'
        })
        await this.ricalcolaTotaliProgetto(pagamento.Progetto)
        if (batchId) await this._aggiornaListaBatch(batchId)
        await this.ricalcolaProposta(pagamento.Progetto, {
          iban: pagamento.IBAN,
          intestatario: pagamento.Intestatario
        })
        await this.init()
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || error.message
      } finally {
        this.loading = false
      }
    },

    async correggiDati(pagamentoId, { iban, intestatario }) {
      this.loading = true
      try {
        const pagamento = (await pagamentiService.getPagamenti({ 'filter[id][_eq]': pagamentoId, limit: 1 })).data
          .data?.[0]
        if (!pagamento || pagamento.Stato !== STATO_PAGAMENTO.FALLITO) {
          throw new Error('Solo pagamenti falliti sono modificabili')
        }
        await pagamentiService.updatePagamento(pagamentoId, { IBAN: iban, Intestatario: intestatario })
        // Propaga sulla famiglia
        const { default: famiglieService } = await import('src/services/famiglie.service')
        await famiglieService.update(pagamento.Famiglia, { IBAN: iban, Intestatario_CC: intestatario })
        await this.fetchFalliti()
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || error.message
      } finally {
        this.loading = false
      }
    },

    async chiudiProgetto(progettoId, { automatica = false, motivo = null } = {}) {
      try {
        await progettiService.updateStats(progettoId, {
          StatoProgetto: STATO_PROGETTO.CHIUSO,
          DataChiusura: new Date().toISOString(),
          MotivoChiusura: automatica ? 'Importo allocato interamente pagato' : motivo
        })
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || error.message
      }
    },

    async riapriProgetto(progettoId) {
      try {
        await progettiService.updateStats(progettoId, {
          StatoProgetto: STATO_PROGETTO.APERTO,
          DataChiusura: null,
          MotivoChiusura: null
        })
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || error.message
      }
    },

    async inviaNotificaPagamento(pagamento) {
      if (!pagamento || pagamento.NotificaInviata) return
      try {
        const progRes = await progettiService.getById(pagamento.Progetto)
        const progetto = progRes.data.data
        if (!progetto) return

        // Trova destinatario: prima volontario della famiglia, poi genitore
        const volontariRes = await famiglieService.getVolontariByFamiglia(pagamento.Famiglia)
        const volontari = volontariRes.data.data || []
        const mainVolontario = volontari.find(v => v.Contatto?.user_id)
        let destinatario = mainVolontario?.Contatto?.email?.[0]?.email_address

        if (!destinatario) {
          const genitoriRes = await famiglieService.getGenitoriByFamiglia(pagamento.Famiglia)
          const genitori = genitoriRes.data.data || []
          const mainGenitore = genitori.find(g => g.Contatto?.email?.length > 0)
          destinatario =
            mainGenitore?.Contatto?.email?.find(e => e.Primary)?.email_address ||
            mainGenitore?.Contatto?.email?.[0]?.email_address
        }

        if (!destinatario) {
          console.warn(`[Pagamento] Nessun destinatario per famiglia ${pagamento.Famiglia}`)
          return
        }

        const famigliaRes = await famiglieService.getById(pagamento.Famiglia)
        const nomeFamiglia = famigliaRes.data.data?.Nome_Famiglia || 'Famiglia'

        await adminService.sendEmail({
          to: destinatario,
          subject: 'Pagamento effettuato',
          body: `Gentile volontario, il pagamento di €${Number.parseFloat(pagamento.Importo || 0).toFixed(2)} per la famiglia "${nomeFamiglia}" è stato effettuato con successo.`
        })

        await pagamentiService.updatePagamento(pagamento.id, { NotificaInviata: true })
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || error.message || 'Errore invio notifica pagamento'
      }
    },

    async fetchListe() {
      try {
        this.liste = await listePagamentiService.getAll()
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || error.message || 'Errore nel caricamento liste'
        this.liste = []
      }
    },

    async eliminaLista(id, fileId) {
      this.loading = true
      try {
        if (fileId) {
          await listePagamentiService.deleteFile(fileId)
        }
        await listePagamentiService.delete(id)
        await this.fetchListe()
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || error.message || 'Errore eliminazione lista'
      } finally {
        this.loading = false
      }
    }
  }
})
