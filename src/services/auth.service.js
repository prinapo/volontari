import api from './api'

export const authService = {
  login(email, password) {
    return api.post('/auth/login', { email, password })
  },

  refresh(refreshToken) {
    return api.post('/auth/refresh', { refresh_token: refreshToken })
  },

  logout(refreshToken) {
    return api.post('/auth/logout', { refresh_token: refreshToken })
  },

  getMe() {
    return api.get('/users/me', {
      params: {
        fields: 'id,email,first_name,last_name,role,role.*'
      }
    })
  },

  getRole(roleId) {
    return api.get(`/roles/${roleId}`, {
      params: {
        fields: 'id,name'
      }
    })
  },

  requestPasswordReset(email) {
    return api.post('/auth/password/request', { email })
  },

  resetPassword(resetToken, password) {
    return api.post('/auth/password/reset', {
      token: resetToken,
      password
    })
  },

  changePassword(newPassword) {
    return api.patch('/users/me', { password: newPassword })
  }
}
