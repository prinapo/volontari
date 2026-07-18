import api from './api'

const AUTH_MODE = 'cookie'

export const authService = {
  login(email, password) {
    return api.post('/auth/login', { email, password, mode: AUTH_MODE })
  },

  logout(refreshToken) {
    const data = { mode: AUTH_MODE }
    if (AUTH_MODE === 'json' && refreshToken) {
      data.refresh_token = refreshToken
    }
    return api.post('/auth/logout', data)
  },

  getMe() {
    return api.get('/users/me', {
      params: {
        fields: 'id,email,first_name,last_name,role,role.id,role.name'
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

  requestPasswordReset(email, resetUrl) {
    const data = { email }
    if (resetUrl) data.reset_url = resetUrl
    return api.post('/auth/password/request', data)
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
