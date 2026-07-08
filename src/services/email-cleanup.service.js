import api from './api'

function isUppercase(val) {
  if (!val) return false
  return val !== val.toLowerCase()
}

export const emailCleanupService = {
  async scan() {
    const [emailTable, submissions, users] = await Promise.all([
      api.get('/items/email', {
        params: { fields: 'id,email_address,Contatto_Relation', limit: -1 }
      }).then(r => (r.data.data || []).filter(e => isUppercase(e.email_address))),

      api.get('/items/InviiGiustificativiNoLogin', {
        params: { fields: 'id,email', limit: -1 }
      }).then(r => (r.data.data || []).filter(e => isUppercase(e.email))),

      api.get('/users', {
        params: { fields: 'id,email', limit: -1 }
      }).then(r => (r.data.data || []).filter(u => isUppercase(u.email)))
    ])

    return { emailTable, submissions, users }
  },

  async convert(table, id, currentEmail) {
    const newEmail = currentEmail.toLowerCase()
    if (table === 'email') {
      return api.patch(`/items/email/${id}`, { email_address: newEmail })
    }
    if (table === 'InviiGiustificativiNoLogin') {
      return api.patch(`/items/InviiGiustificativiNoLogin/${id}`, { email: newEmail })
    }
    if (table === 'directus_users') {
      return api.patch(`/users/${id}`, { email: newEmail })
    }
    throw new Error(`Unknown table: ${table}`)
  }
}
