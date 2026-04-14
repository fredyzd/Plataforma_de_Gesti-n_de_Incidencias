import axios from 'axios'

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

// Adjunta el access token en cada petición
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Manejo de 401: intenta refresh, si falla limpia sesión
let refreshing: Promise<string> | null = null

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      if (!refreshing) {
        refreshing = axios
          .post<{ access_token: string }>('/api/auth/refresh', {}, { withCredentials: true })
          .then((r) => {
            localStorage.setItem('access_token', r.data.access_token)
            return r.data.access_token
          })
          .catch(() => {
            localStorage.removeItem('access_token')
            window.location.href = '/login'
            return Promise.reject(error)
          })
          .finally(() => {
            refreshing = null
          })
      }
      const token = await refreshing
      original.headers.Authorization = `Bearer ${token}`
      return api(original)
    }
    return Promise.reject(error)
  },
)
