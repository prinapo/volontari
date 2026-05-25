import axios from 'axios'
import { API_URL, STORAGE_KEYS } from 'src/utils/constants'
import { useAuthStore } from 'src/stores/auth.store'

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000
})

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

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
      if (!refreshToken) {
        const authStore = useAuthStore()
        authStore.logout()
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
        const authStore = useAuthStore()
        authStore.logout()
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  }
)

export default api
