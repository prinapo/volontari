import { defineStore } from 'pinia'
import { adminService } from 'src/services/admin.service'

export const useAdminStore = defineStore('admin', {
  state: () => ({
    roles: [],
    policies: [],
    loading: false,
    saving: false,
    error: null
  }),

  getters: {
    rolesWithPolicyNames: (state) => {
      return state.roles.map(r => ({
        ...r,
        policyNames: (r.policies || [])
          .map(p => p.policy_id?.name)
          .filter(Boolean)
          .join(', '),
        userCount: r.users || 0
      }))
    }
  },

  actions: {
    async fetchRoles() {
      this.loading = true
      this.error = null
      try {
        const res = await adminService.getRoles()
        this.roles = res.data.data || []
      } catch (err) {
        this.error = "Errore nel caricamento dei ruoli"
        console.error(err)
      } finally {
        this.loading = false
      }
    },

    async fetchPolicies() {
      try {
        const res = await adminService.getPolicies()
        this.policies = res.data.data || []
      } catch (err) {
        console.error(err)
      }
    },

    async fetchAll() {
      await Promise.all([this.fetchRoles(), this.fetchPolicies()])
    },

    async setRolePolicies(roleId, policyIds) {
      this.saving = true
      this.error = null
      try {
        await adminService.setRolePolicies(roleId, policyIds)
        await this.fetchAll()
        return true
      } catch (err) {
        this.error = "Errore nel salvare le policy del ruolo"
        console.error(err)
        return false
      } finally {
        this.saving = false
      }
    }
  }
})
