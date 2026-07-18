import axios from 'axios'
import { useAuthStore } from 'src/stores/auth.store'
import { API_URL as ENV_API_URL, STORAGE_KEYS } from 'src/utils/constants'
import { errorLogService } from './error-log.service'
import { logSessionEvent } from 'src/utils/session-log'

const API_URL = ENV_API_URL

const AUTH_MODE = 'cookie'

let isRefreshing = false
let failedQueue = []

function processQueue(error, token = null) {
  for (const prom of failedQueue) {
    if (error) prom.reject(error)
    else prom.resolve(token)
  }
  failedQueue = []
}

const api = axios.create({
  baseURL: API_URL,
  timeout: 30_000,
  withCredentials: true
})

function getErrorMessage(error) {
  const errors = error?.response?.data?.errors
  if (errors && errors.length > 0) {
    return errors.map(e => e.message).join('; ')
  }
  return error.message || 'Errore sconosciuto'
}

function clearSessionAndRedirectToLogin(reason = 'Sconosciuto') {
  logSessionEvent('logout_forzato', reason)
  const authStore = useAuthStore()
  authStore.$patch({
    token: null,
    refreshToken: null,
    user: null,
    contatto: null
  })
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN)
  if (AUTH_MODE === 'json') localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)

  if (globalThis.location.pathname !== '/login') {
    globalThis.location.assign('/login')
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

async function refreshTokens() {
  if (AUTH_MODE === 'cookie') {
    const { data } = await axios.post(`${API_URL}/auth/refresh`,
      { mode: 'cookie' },
      { withCredentials: true }
    )
    const newToken = data.data.access_token
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, newToken)
    const authStore = useAuthStore()
    if (authStore.token) authStore.$patch({ token: newToken })
    return newToken
  }

  const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
  if (!refreshToken) throw new Error('No refresh token')

  const { data } = await axios.post(`${API_URL}/auth/refresh`, {
    refresh_token: refreshToken
  })
  const newToken = data.data.access_token
  const newRefreshToken = data.data.refresh_token

  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, newToken)
  localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken)

  const authStore = useAuthStore()
  if (authStore.token) {
    authStore.$patch({ token: newToken, refreshToken: newRefreshToken })
  }
  return newToken
}

function logErrorResponse(error) {
  if (!error?.response || !error?.config) return
  const status = error.response.status
  if (status < 400 || status >= 500) return
  const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
  if (!token) return

  errorLogService.log({
    level: status >= 500 ? 'error' : 'warning',
    message: getErrorMessage(error).slice(0, 1000),
    method: error.config.method?.toUpperCase() || '',
    url: (error.config.baseURL || '') + (error.config.url || ''),
    status,
    responseBody: JSON.stringify(error.response.data).slice(0, 5000),
    userAgent: navigator.userAgent?.slice(0, 255) || ''
  })
}

api.interceptors.request.use(config => {
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
  response => response,
  async error => {
    const originalRequest = error.config
    const isAuthRequest = originalRequest?.url?.includes('/auth/')

    if (isInvalidTokenError(error) && !originalRequest?._retry && !isAuthRequest) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const newToken = await refreshTokens()
        processQueue(null, newToken)
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        clearSessionAndRedirectToLogin('refresh_fallito: ' + (refreshError.message || ''))
        throw refreshError
      } finally {
        isRefreshing = false
      }
    }

    if (isInvalidTokenError(error) && !isAuthRequest) {
      clearSessionAndRedirectToLogin('token_invalido_senza_refresh: ' + getErrorMessage(error))
    }

    logErrorResponse(error)

    throw error
  }
)

export default api
