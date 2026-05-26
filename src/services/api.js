import axios from 'axios'
import { API_URL, STORAGE_KEYS } from 'src/utils/constants'
import { useAuthStore } from 'src/stores/auth.store'

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000
})

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
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, newToken)
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

    return Promise.reject(error)
  }
)

export default api
