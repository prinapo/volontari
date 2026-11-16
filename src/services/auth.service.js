import api from './api'

const AUTH_MODE = 'cookie'

export const authService = {
  /**
   * Login locale. `otp` (codice TOTP a 6 cifre) va inviato solo per gli
   * account con 2FA attiva: Directus risponde `INVALID_OTP` alla prima
   * richiesta senza codice e l'OTP va ripetuto nello stesso payload.
   */
  login(email, password, otp) {
    const data = { email, password, mode: AUTH_MODE }
    if (otp) data.otp = otp
    return api.post('/auth/login', data)
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
  },

  updateMe(data) {
    return api.patch('/users/me', data)
  }
}
