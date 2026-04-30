/// <reference types="vite/client" />
import { api } from './api'

export interface User {
  id: string
  first_name: string
  last_name: string
  email: string
  role: string
  active: boolean
  created_at: string
}

export interface TokenPair {
  access_token: string
  refresh_token: string
}

const TOKEN_KEY = 'portex_access_token'
const REFRESH_KEY = 'portex_refresh_token'
const USER_KEY = 'portex_user'

export const auth = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_KEY),
  getUser: (): User | null => {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  },

  setSession: (user: User, tokens: TokenPair) => {
    localStorage.setItem(TOKEN_KEY, tokens.access_token)
    localStorage.setItem(REFRESH_KEY, tokens.refresh_token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  },

  clearSession: () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_KEY)
    localStorage.removeItem(USER_KEY)
  },

  isAuthenticated: () => !!localStorage.getItem(TOKEN_KEY),

  login: async (email: string, password: string) => {
    const res = await api.post('/api/auth/login', { email, password })
    const { user, tokens } = res.data.data
    auth.setSession(user, tokens)
    return user as User
  },

  register: async (data: { first_name: string; last_name: string; email: string; password: string }) => {
    const res = await api.post('/api/auth/register', data)
    const { user, tokens } = res.data.data
    auth.setSession(user, tokens)
    return user as User
  },

  logout: () => {
    auth.clearSession()
  },
}
