import { defineStore } from 'pinia'
import { pagamentiService } from 'src/services/pagamenti.service'
import { associazioniService } from 'src/services/associazioni.service'
import { progettiService } from 'src/services/progetti.service'
import { verificaService } from 'src/services/verifica.service'
import { adminService } from 'src/services/admin.service'
import { famiglieService } from 'src/services/famiglie.service'
import { contattiService } from 'src/services/contatti.service'
import { STATO_PAGAMENTO, STATO_PROGETTO } from 'src/utils/constants'

export const usePagamentiStore = defineStore('pagamenti', {
  state: () => ({
    proposti: [],
    inCorso: [],
    falliti: [],
    batches: [],
    associazioni: [],
    budgetMap: {},
    loading: false,
    error: null
  }),

  getters: {
    residuoAssociazione: state => nome => {
      const budget = state.budgetMap[nome] || 0
      const impegnato = state.inCorso
        .filter(p => {
          const batch = state.batches.find(b => b.id === p.Batch)
          return batch?.Associazione === nome
        })
        .reduce((s, p) => s + (parseFloat(p.Importo) || 0), 0)
      const pagato = state.proposti
        .filter(p => {
          const batch = state.batches.find(b => b.id === p.Batch)
          return batch?.Associazione === nome
        })
        .reduce((s, p) => s + (parseFloat(p.Importo) || 0), 0)
      return budget - impegnato - pagato
    }
  },

  actions: {
    async init() {
      await Promise.all([
        this.fetchAssociazioni(),
        this.fetchProposti(),
        this.fetchInCorso(),
        this.fetchFalliti(),
        this.fetchBatches()
      ])
    },

    async fetchAssociazioni() {
      try {
        const res = await associazioniService.getAll()
        this.associazioni = res.data.data || []
        this.budgetMap = {}
        for (const a of this.associazioni) {
          this.budgetMap[a.Nome] = parseFloat(a.Budget) || 0
        }
      } catch {
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
      } catch {
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
      } catch {
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
      } catch {
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
      } catch {
        this.batches = []
      }
    },

    async ricalcolaProposta(progettoId) {
      try {
        const progRes = await progettiService.getById(progettoId)
        const progetto = progRes.data.data
        if (!progetto || progetto.StatoProgetto === STATO_PROGETTO.CHIUSO) return

        const giustRes = await verificaService.getGiustificativiByProgetto(progettoId)
        const giustificativi = giustRes.data.data || []
        const totaleVerificato = giustificativi
          .filter(g => g.Stato === 'verificato')
          .reduce((s, g) => s + (parseFloat(g.Importo) || 0), 0)

        const pagamentiRes = await pagamentiService.getPagamenti({
          'filter[Progetto][_eq]': progettoId,
          'filter[_or][0][Stato][_eq]': STATO_PAGAMENTO.IN_PAGAMENTO,
          'filter[_or][1][Stato][_eq]': STATO_PAGAMENTO.PAGATO,
          limit: -1
        })
        const totaleStorico = (pagamentiRes.data.data || []).reduce((s, p) => s + (parseFloat(p.Importo) || 0), 0)

        const allocato = parseFloat(progetto.Allocato) || 0
        const erogabile = Math.min(totaleVerificato, allocato)
        const nuovoProposto = erogabile - totaleStorico

        const esistenteRes = await pagamentiService.getPagamenti({
          'filter[Progetto][_eq]': progettoId,
          'filter[Stato][_eq]': STATO_PAGAMENTO.PROPOSTO,
          limit: 1
        })
        const esistente = (esistenteRes.data.data || [])[0]

        if (nuovoProposto > 0) {
          if (esistente) {
            await pagamentiService.updatePagamento(esistente.id, { Importo: nuovoProposto })
          } else {
            await pagamentiService.createPagamento({
              Progetto: progettoId,
              Famiglia: progetto.Famiglia,
              Importo: nuovoProposto,
              Stato: STATO_PAGAMENTO.PROPOSTO,
              IBAN: progetto.IBAN || '',
              Intestatario: progetto.Intestatario_CC || '',
              DataProposta: new Date().toISOString()
            })
          }
        } else if (esistente) {
          await pagamentiService.deletePagamento(esistente.id)
        }

        await this.ricalcolaTotaliProgetto(progettoId)
        await this.fetchProposti()
      } catch (err) {
        this.error = err.message
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
          .reduce((s, g) => s + (parseFloat(g.Importo) || 0), 0)

        const pagamentiRes = await pagamentiService.getPagamenti({
          'filter[Progetto][_eq]': progettoId,
          limit: -1
        })
        const tutti = pagamentiRes.data.data || []
        const proposto = tutti.find(p => p.Stato === STATO_PAGAMENTO.PROPOSTO)
        const inPagamento = tutti
          .filter(p => p.Stato === STATO_PAGAMENTO.IN_PAGAMENTO)
          .reduce((s, p) => s + (parseFloat(p.Importo) || 0), 0)
        const pagato = tutti
          .filter(p => p.Stato === STATO_PAGAMENTO.PAGATO)
          .reduce((s, p) => s + (parseFloat(p.Importo) || 0), 0)

        const allocato = parseFloat(progetto.Allocato) || 0
        const totaleProposto = proposto ? parseFloat(proposto.Importo) || 0 : 0
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
      } catch (err) {
        this.error = err.message
      }
    },

    async creaBatch({ nome, associazione, pagamentoIds }) {
      this.loading = true
      this.error = null
      try {
        const pagamentiRes = await pagamentiService.getPagamenti({
          'filter[id][_in]': pagamentoIds.join(','),
          limit: -1
        })
        const pagamenti = pagamentiRes.data.data || []

        if (pagamenti.some(p => p.Stato !== STATO_PAGAMENTO.PROPOSTO)) {
          throw new Error('Solo pagamenti in stato proposto possono essere inclusi in un batch')
        }

        const totale = pagamenti.reduce((s, p) => s + (parseFloat(p.Importo) || 0), 0)
        const residuo = this.residuoAssociazione(associazione)
        if (totale > residuo) {
          throw new Error(
            `Capienza insufficiente per ${associazione}. Disponibile: €${residuo.toFixed(2)}, richiesto: €${totale.toFixed(2)}`
          )
        }

        const userId = localStorage.getItem('user_id')
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

        await this.init()
        return batchId
      } catch (err) {
        this.error = err.response?.data?.errors?.[0]?.message || err.message || 'Errore creazione batch'
        throw err
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
      } catch (err) {
        this.error = err.message
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
        await this.init()
      } catch (err) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    async segnaAnnullato(pagamentoId, motivo) {
      this.loading = true
      try {
        const pagamento = (await pagamentiService.getPagamenti({ 'filter[id][_eq]': pagamentoId, limit: 1 })).data
          .data?.[0]
        if (!pagamento || !['in_pagamento', 'fallito'].includes(pagamento.Stato)) {
          throw new Error('Solo pagamenti in_pagamento o falliti possono essere annullati')
        }
        await pagamentiService.updatePagamento(pagamentoId, {
          Stato: STATO_PAGAMENTO.ANNULLATO,
          NoteEsito: motivo
        })
        await this.ricalcolaTotaliProgetto(pagamento.Progetto)
        await this.ricalcolaProposta(pagamento.Progetto)
        await this.init()
      } catch (err) {
        this.error = err.message
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
      } catch (err) {
        this.error = err.message
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
      } catch (err) {
        this.error = err.message
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
          body: `Gentile volontario, il pagamento di €${parseFloat(pagamento.Importo || 0).toFixed(2)} per la famiglia "${nomeFamiglia}" è stato effettuato con successo.`
        })

        await pagamentiService.updatePagamento(pagamento.id, { NotificaInviata: true })
      } catch (err) {
        console.error('[Pagamento] Errore invio notifica:', err.message)
      }
    }
  }
})
