import { defineStore } from 'pinia'
import { deduplicaService } from 'src/services/deduplica.service'

export const useDeduplicaStore = defineStore('deduplica', {
  state: () => ({
    duplicateGroups: [],
    idDuplicateGroups: [],
    loading: false,
    idLoading: false,
    error: null
  }),

  getters: {
    totalDuplicates: state => state.duplicateGroups.length,
    totalContattiCoinvolti: state => state.duplicateGroups.reduce((sum, g) => sum + g.contattiIds.length, 0),
    totalIdDuplicates: state => state.idDuplicateGroups.reduce((sum, g) => sum + g.count - 1, 0)
  },

  actions: {
    async fetchDuplicates() {
      this.loading = true
      this.error = null
      try {
        const emailRes = await deduplicaService.getAllEmails()
        const emails = emailRes.data.data || []

        const emailGroups = {}
        emails.forEach(e => {
          const addr = (e.email_address || '').trim().toLowerCase()
          if (!addr) return
          if (!emailGroups[addr]) emailGroups[addr] = []
          emailGroups[addr].push(e)
        })

        const result = []
        for (const [emailLower, emailEntries] of Object.entries(emailGroups)) {
          if (emailEntries.length < 2) continue

          const byContatto = {}
          const orphanEntries = []
          emailEntries.forEach(e => {
            if (e.Contatto_Relation === null || e.Contatto_Relation === undefined) {
              orphanEntries.push(e)
            } else {
              if (!byContatto[e.Contatto_Relation]) byContatto[e.Contatto_Relation] = []
              byContatto[e.Contatto_Relation].push(e)
            }
          })

          const contattoIds = Object.keys(byContatto)
          const hasNullContatto = orphanEntries.length > 0
          const hasSameContattoDuplicates = Object.values(byContatto).some(arr => arr.length > 1)
          const hasDifferentContattoDuplicates = contattoIds.length > 1

          if (!hasNullContatto && !hasSameContattoDuplicates && !hasDifferentContattoDuplicates) continue

          const contattiData = {}
          for (const cid of contattoIds) {
            try {
              const res = await deduplicaService.getContatto(cid)
              const contatto = res.data.data
              if (contatto) {
                const fcRes = await deduplicaService.getFamiglieByContatto(cid)
                contattiData[cid] = {
                  contatto,
                  famiglieContatti: fcRes.data.data || [],
                  emailEntries: byContatto[cid]
                }
              } else {
                contattiData[cid] = {
                  contatto: null,
                  famiglieContatti: [],
                  emailEntries: byContatto[cid]
                }
              }
            } catch {
              contattiData[cid] = {
                contatto: null,
                famiglieContatti: [],
                emailEntries: byContatto[cid]
              }
            }
          }

          const types = []
          if (hasNullContatto) types.push('orphan')
          if (hasSameContattoDuplicates) types.push('same-contatto')
          if (hasDifferentContattoDuplicates) types.push('cross-contatto')

          result.push({
            email: emailEntries[0].email_address,
            emailLower,
            contattiData,
            contattoIds,
            orphanEntries,
            types
          })
        }

        this.duplicateGroups = result
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || 'Errore nel caricamento dei duplicati'
      } finally {
        this.loading = false
      }
    },

    async fetchIdDuplicates() {
      this.idLoading = true
      try {
        const tables = [
          { table: 'contatti', idField: 'id_contatto', label: 'Contatti' },
          { table: 'famiglie', idField: 'id_famiglia', label: 'Famiglie' },
          { table: 'progetti', idField: 'id_progetto', label: 'Progetti' }
        ]
        const results = []
        for (const { table, idField, label } of tables) {
          try {
            const res = await deduplicaService.getIdDuplicates(table, idField)
            const data = res.data.data || []
            for (const row of data) {
              const count = row.count?.['*'] || 0
              if (count > 1) {
                results.push({ table, idField, label, id: row[idField], count, _key: `${table}_${row[idField]}` })
              }
            }
          } catch {
            // skip tables without access
          }
        }
        this.idDuplicateGroups = results
      } catch {
        // silent
      } finally {
        this.idLoading = false
      }
    },

    async merge(contattoAId, contattoBId, fieldOverrides) {
      this.error = null
      try {
        const updateData = {}
        Object.entries(fieldOverrides).forEach(([field, value]) => {
          if (value !== undefined && value !== null) {
            updateData[field] = value
          }
        })
        if (Object.keys(updateData).length > 0) {
          await deduplicaService.updateContatto(contattoAId, updateData)
        }

        const fcRes = await deduplicaService.getFamiglieByContatto(contattoBId)
        const bFamilies = fcRes.data.data || []
        for (const fc of bFamilies) {
          await deduplicaService.updateFamigliaContatto(fc.id, { Contatto: contattoAId })
        }

        const emailRes = await deduplicaService.getAllEmails()
        const bEmails = (emailRes.data.data || []).filter(e => e.Contatto_Relation === contattoBId)
        for (const email of bEmails) {
          await deduplicaService.updateEmail(email.id, { Contatto_Relation: contattoAId })
        }

        await deduplicaService.deleteContatto(contattoBId)

        await this.fetchDuplicates()
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || "Errore nell'unione"
        throw error
      }
    },

    async deleteEmailRow(emailId) {
      this.error = null
      try {
        await deduplicaService.deleteEmail(emailId)
        await this.fetchDuplicates()
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || "Errore nell'eliminazione"
        throw error
      }
    },

    async deleteContattoIfEmpty(contattoId) {
      this.error = null
      try {
        const fcRes = await deduplicaService.getFamiglieByContatto(contattoId)
        if ((fcRes.data.data || []).length > 0) {
          throw new Error('Contatto ha ancora famiglie assegnate')
        }
        await deduplicaService.deleteContatto(contattoId)
        await this.fetchDuplicates()
      } catch (error) {
        this.error = error.response?.data?.errors?.[0]?.message || "Errore nell'eliminazione"
        throw error
      }
    }
  }
})
