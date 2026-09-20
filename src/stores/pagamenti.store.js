import { defineStore } from 'pinia'
import { associazioniService } from 'src/services/associazioni.service'
import { listePagamentiService } from 'src/services/liste-pagamenti.service'
import { pagamentiService } from 'src/services/pagamenti.service'
import {
  chiudiProgetto as chiudiProgettoUseCase,
  correggiDati as correggiDatiUseCase,
  riapriProgetto as riapriProgettoUseCase,
  ricalcolaProposta as ricalcolaPropostaUseCase,
  ricalcolaPropostiDaProgetti as ricalcolaPropostiDaProgettiUseCase,
  ricalcolaTotaliProgetto as ricalcolaTotaliProgettoUseCase,
  ripristinaInPagamento as ripristinaInPagamentoUseCase,
  ripristinaProposto as ripristinaPropostoUseCase,
  segnaAnnullato as segnaAnnullatoUseCase,
  segnaFallito as segnaFallitoUseCase,
  segnaInPagamento as segnaInPagamentoUseCase,
  segnaPagato as segnaPagatoUseCase
} from 'src/usecases/pagamenti'
import { avanzaStatoProgetto as avanzaStatoProgettoUseCase } from 'src/usecases/progetti'
import { STATO_PAGAMENTO, STORAGE_KEYS } from 'src/utils/constants'

export const usePagamentiStore = defineStore('pagamenti', {
  state: () => ({
    proposti: [],
    inCorso: [],
    falliti: [],
    annullati: [],
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
          this.fetchAnnullati(),
          this.fetchBatches(),
          this.fetchListe()
        ])
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || error.message || 'Errore inizializzazione pagamenti'
      }
    },

    async ricalcolaPropostiDaProgetti(progetti) {
      this.error = null
      try {
        await ricalcolaPropostiDaProgettiUseCase(progetti)
        await this.fetchProposti()
        await this.fetchAnnullati()
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || error.message || 'Errore nel ricalcolo proposte'
      }
    },

    async fetchAssociazioni() {
      this.error = null
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

    async fetchProposti(search) {
      this.error = null
      try {
        const params = {
          'filter[Stato][_eq]': STATO_PAGAMENTO.PROPOSTO,
          fields:
            '*,Progetto.id_progetto,Progetto.Cognome_Beneficiario,Progetto.Nome_Beneficiario,Famiglia.id_famiglia,Famiglia.Nome_Famiglia',
          limit: -1,
          sort: 'DataProposta'
        }
        if (search) {
          params['filter[_and][0][Stato][_eq]'] = STATO_PAGAMENTO.PROPOSTO
          delete params['filter[Stato][_eq]']
          params['filter[_and][1][_or][0][Famiglia][Nome_Famiglia][_icontains]'] = search
          params['filter[_and][1][_or][1][IBAN][_icontains]'] = search
          params['filter[_and][1][_or][2][Intestatario][_icontains]'] = search
        }
        const res = await pagamentiService.getPagamenti(params)
        this.proposti = res.data.data || []
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || error.message || 'Errore nel caricamento proposti'
        this.proposti = []
      }
    },

    async fetchInCorso(search, batchFilter) {
      this.error = null
      try {
        const params = {
          'filter[Stato][_in]': `${STATO_PAGAMENTO.IN_PAGAMENTO},${STATO_PAGAMENTO.PAGATO}`,
          fields:
            '*,Batch.id,Batch.Nome,Batch.Associazione,Progetto.id_progetto,Famiglia.id_famiglia,Famiglia.Nome_Famiglia,Famiglia.IBAN,Famiglia.Intestatario_CC',
          limit: -1,
          sort: 'DataProposta'
        }

        const hasSearch = !!search
        const hasBatch = !!batchFilter

        if (hasSearch || hasBatch) {
          const statoVal = `${STATO_PAGAMENTO.IN_PAGAMENTO},${STATO_PAGAMENTO.PAGATO}`
          delete params['filter[Stato][_in]']
          let idx = 0
          params[`filter[_and][${idx++}][Stato][_in]`] = statoVal

          if (hasBatch) {
            params[`filter[_and][${idx++}][Batch][_eq]`] = batchFilter
          }

          if (hasSearch) {
            const searchIdx = idx
            params[`filter[_and][${searchIdx}][_or][0][Famiglia][Nome_Famiglia][_icontains]`] = search
            params[`filter[_and][${searchIdx}][_or][1][IBAN][_icontains]`] = search
            params[`filter[_and][${searchIdx}][_or][2][Intestatario][_icontains]`] = search
            params[`filter[_and][${searchIdx}][_or][3][Batch][Nome][_icontains]`] = search
          }
        }

        const res = await pagamentiService.getPagamenti(params)
        this.inCorso = res.data.data || []
      } catch (error) {
        this.error =
          error.response?.data?.errors?.[0]?.message || error.message || 'Errore nel caricamento pagamenti in corso'
        this.inCorso = []
      }
    },

    async fetchFalliti(search) {
      this.error = null
      try {
        const params = {
          'filter[Stato][_eq]': STATO_PAGAMENTO.FALLITO,
          fields: '*,Progetto.id_progetto,Famiglia.id_famiglia,Famiglia.Nome_Famiglia',
          limit: -1
        }
        if (search) {
          params['filter[_and][0][Stato][_eq]'] = STATO_PAGAMENTO.FALLITO
          delete params['filter[Stato][_eq]']
          params['filter[_and][1][_or][0][Famiglia][Nome_Famiglia][_icontains]'] = search
          params['filter[_and][1][_or][1][IBAN][_icontains]'] = search
          params['filter[_and][1][_or][2][NoteEsito][_icontains]'] = search
        }
        const res = await pagamentiService.getPagamenti(params)
        this.falliti = res.data.data || []
      } catch (error) {
        this.error =
          error.response?.data?.errors?.[0]?.message || error.message || 'Errore nel caricamento pagamenti falliti'
        this.falliti = []
      }
    },

    async fetchAnnullati(search, motivo) {
      this.error = null
      try {
        const params = {
          fields: '*,Progetto.id_progetto,Famiglia.id_famiglia,Famiglia.Nome_Famiglia',
          sort: '-DataProposta',
          limit: -1
        }
        if (search || motivo) {
          params['filter[_and][0][Stato][_eq]'] = STATO_PAGAMENTO.ANNULLATO
          let idx = 1
          if (motivo) {
            params[`filter[_and][${idx}][NoteEsito][_eq]`] = motivo
            idx++
          }
          if (search) {
            params[`filter[_and][${idx}][_or][0][Famiglia][Nome_Famiglia][_icontains]`] = search
            params[`filter[_and][${idx}][_or][1][IBAN][_icontains]`] = search
            params[`filter[_and][${idx}][_or][2][NoteEsito][_icontains]`] = search
          }
        } else {
          params['filter[Stato][_eq]'] = STATO_PAGAMENTO.ANNULLATO
        }
        const res = await pagamentiService.getPagamenti(params)
        this.annullati = res.data.data || []
      } catch (error) {
        this.error =
          error.response?.data?.errors?.[0]?.message || error.message || 'Errore nel caricamento pagamenti annullati'
        this.annullati = []
      }
    },

    async fetchBatches() {
      this.error = null
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
      this.error = null
      try {
        await ricalcolaPropostaUseCase(progettoId, { iban, intestatario })
        await this.fetchProposti()
        await this.fetchAnnullati()
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || error.message
        throw error
      }
    },

    async ricalcolaTotaliProgetto(progettoId) {
      this.error = null
      try {
        await ricalcolaTotaliProgettoUseCase(progettoId)
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || error.message
        throw error
      }
    },

    async _aggiornaListaBatch(batchId, batchNome) {
      this.error = null
      try {
        const pagamentiRes = await pagamentiService.getPagamenti({
          'filter[Batch][_eq]': batchId,
          'filter[_or][0][Stato][_eq]': STATO_PAGAMENTO.IN_PAGAMENTO,
          'filter[_or][1][Stato][_eq]': STATO_PAGAMENTO.PAGATO,
          fields: 'id,Stato,Importo,IBAN,Intestatario,Famiglia.id_famiglia,Famiglia.Nome_Famiglia',
          limit: -1
        })
        const pagamenti = pagamentiRes.data.data || []

        let nome
        if (batchNome) {
          nome = batchNome
        } else {
          const batch = this.batches.find(b => b.id === batchId)
          if (!batch) return
          nome = batch.Nome
        }

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

        // Valida nomi famiglia per CSV
        const nomiInvalidi = pagamenti.map(p => p.Famiglia?.Nome_Famiglia || '').filter(n => n && /[\n\r";]/.test(n))
        if (nomiInvalidi.length > 0) {
          throw new Error(
            `Impossibile generare CSV: ${nomiInvalidi.length} famiglia/e hanno caratteri non consentiti nel nome.\n` +
              nomiInvalidi.map(n => `"${n}"`).join(', ')
          )
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
        throw error
      }
    },

    async ripristinaProposto(pagamentoId) {
      this.loading = true
      this.error = null
      try {
        await ripristinaPropostoUseCase(pagamentoId)
        await this.fetchProposti()
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || error.message
        throw error
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

        await segnaInPagamentoUseCase({ pagamentoIds: pagamenti.map(p => p.id), batchId })

        await this._aggiornaListaBatch(batchId, nome)

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
      this.error = null
      try {
        await segnaPagatoUseCase(pagamentoId)
        await this.init()
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    async segnaFallito(pagamentoId, note) {
      this.error = null
      this.loading = true
      try {
        const pagamento = await segnaFallitoUseCase(pagamentoId, note)
        if (pagamento.Batch) await this._aggiornaListaBatch(pagamento.Batch)
        await this.init()
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    async segnaAnnullato(pagamentoId) {
      this.loading = true
      this.error = null
      try {
        const { batchId } = await segnaAnnullatoUseCase(pagamentoId)
        if (batchId) await this._aggiornaListaBatch(batchId)
        await this.init()
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    async ripristinaInPagamento(pagamentoId) {
      this.loading = true
      this.error = null
      try {
        await ripristinaInPagamentoUseCase(pagamentoId)
        await this.init()
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    async correggiDati(pagamentoId, { iban, intestatario }) {
      this.loading = true
      this.error = null
      try {
        await correggiDatiUseCase(pagamentoId, { iban, intestatario })
        await this.fetchFalliti()
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || error.message
      } finally {
        this.loading = false
      }
    },

    async chiudiProgetto(progettoId, { automatica = false, motivo = null } = {}) {
      try {
        await chiudiProgettoUseCase(progettoId, { automatica, motivo })
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || error.message
        throw error
      }
    },

    async riapriProgetto(progettoId) {
      try {
        await riapriProgettoUseCase(progettoId)
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || error.message
        throw error
      }
    },

    async avanzaStatoProgetto(progettoId) {
      try {
        return await avanzaStatoProgettoUseCase(progettoId)
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || error.message
        throw error
      }
    },

    async fetchListe(search) {
      try {
        this.liste = await listePagamentiService.getAll(search)
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
        throw error
      } finally {
        this.loading = false
      }
    }
  }
})
