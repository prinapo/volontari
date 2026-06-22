import axios from 'axios'
import { API_URL as ENV_API_URL, STORAGE_KEYS } from 'src/utils/constants'
import { useAuthStore } from 'src/stores/auth.store'

const API_URL = (
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
) ? 'http://localhost:8055' : ENV_API_URL

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000
})

function getErrorMessage(error) {
  const errors = error?.response?.data?.errors
  if (errors && errors.length > 0) {
    return errors.map(e => e.message).join('; ')
  }
  return error.message || 'Errore sconosciuto'
}

function clearSessionAndRedirectToLogin() {
  const authStore = useAuthStore()
  authStore.$patch({
    token: null,
    refreshToken: null,
    user: null,
    contatto: null
  })
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN)
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)

  if (window.location.pathname !== '/login') {
    window.location.assign('/login')
  }
}

function isInvalidTokenError(error) {
  const status = error.response?.status
  const message = error.response?.data?.errors?.[0]?.message || ''
  const code = error.response?.data?.errors?.[0]?.extensions?.code || ''

  return (
    status === 401 ||
    String(message).toLowerCase().includes('token invalid') ||
    String(message).toLowerCase().includes('invalid token') ||
    String(message).toLowerCase().includes('refresh token is required') ||
    String(message).toLowerCase().includes('jwt') ||
    String(code).toLowerCase() === 'invalid_payload' ||
    String(code).toLowerCase().includes('token')
  )
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  if (config.method === 'get') {
    const separator = config.url.includes('?') ? '&' : '?'
    config.url = `${config.url}${separator}_t=${Date.now()}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const isAuthRequest = originalRequest?.url?.includes('/auth/')

    if (isInvalidTokenError(error) && !originalRequest?._retry && !isAuthRequest) {
      originalRequest._retry = true

      const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
      if (!refreshToken) {
        clearSessionAndRedirectToLogin()
        return Promise.reject(error)
      }

      try {
        const { data } = await axios.post(`${API_URL}/auth/refresh`, {
          refresh_token: refreshToken
        })
        const newToken = data.data.access_token
        const newRefreshToken = data.data.refresh_token
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, newToken)
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken)
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      } catch {
        clearSessionAndRedirectToLogin()
        return Promise.reject(error)
      }
    }

    if (isInvalidTokenError(error) && !isAuthRequest) {
      clearSessionAndRedirectToLogin()
    }

    // Log error to ErrorLog collection (fire & forget)
    if (error?.response && error?.config && !isAuthRequest) {
      const status = error.response.status
      if (status >= 400 && status < 500) {
        try {
          const { errorLogService } = await import('./error-log.service')
          errorLogService.log({
            level: status >= 500 ? 'error' : 'warning',
            message: getErrorMessage(error).slice(0, 1000),
            method: error.config.method?.toUpperCase() || '',
            url: (error.config.baseURL || '') + (error.config.url || ''),
            status,
            responseBody: JSON.stringify(error.response.data).slice(0, 5000),
            userAgent: navigator.userAgent?.slice(0, 255) || ''
          })
        } catch {
          // silent — non deve mai bloccare il flusso
        }
      }
    }

    return Promise.reject(error)
  }
)

export default api
