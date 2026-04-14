import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from '../lib/api'
import type { User } from '../types'

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<LoginResult>
  logout: () => Promise<void>
  changeInitialPassword: (tempToken: string, newPassword: string) => Promise<void>
}

export interface LoginResult {
  passwordChangeRequired: boolean
  tempToken?: string
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      setLoading(false)
      return
    }
    api.get<User>('/auth/me')
      .then((r) => setUser(r.data))
      .catch(() => localStorage.removeItem('access_token'))
      .finally(() => setLoading(false))
  }, [])

  const login = async (email: string, password: string): Promise<LoginResult> => {
    const { data } = await api.post('/auth/login', { email, password })
    if (data.passwordChangeRequired) {
      return { passwordChangeRequired: true, tempToken: data.tempToken }
    }
    localStorage.setItem('access_token', data.access_token ?? data.accessToken)
    const me = await api.get<User>('/auth/me')
    setUser(me.data)
    return { passwordChangeRequired: false }
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } finally {
      localStorage.removeItem('access_token')
      setUser(null)
    }
  }

  const changeInitialPassword = async (tempToken: string, newPassword: string) => {
    const { data } = await api.post('/auth/change-initial-password', {
      temp_token: tempToken,
      new_password: newPassword,
    })
    localStorage.setItem('access_token', data.access_token ?? data.accessToken)
    const me = await api.get<User>('/auth/me')
    setUser(me.data)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, changeInitialPassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
