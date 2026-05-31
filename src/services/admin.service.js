import api from './api'

export const adminService = {
  getRoles() {
    return api.get('/roles', {
      params: {
        fields: ['id', 'name', 'description', 'icon', 'policies.policy_id.id', 'policies.policy_id.name', 'users'].join(','),
        limit: -1
      }
    })
  },

  getPolicies() {
    return api.get('/policies', {
      params: {
        fields: ['id', 'name', 'description', 'icon'].join(','),
        limit: -1
      }
    })
  },

  setRolePolicies(roleId, policyIds) {
    return api.patch(`/roles/${roleId}`, {
      policies: policyIds
    })
  }
}
