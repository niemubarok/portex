import { api } from './api'

export interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  active: boolean
  createdAt: string
}

export interface TokenPair {
  access_token: string
  refresh_token: string
}

const TOKEN_KEY = 'portex_access_token'
const REFRESH_KEY = 'portex_refresh_token'
const USER_KEY = 'portex_user'

export const auth = {
  getToken: () => typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null,
  getRefreshToken: () => typeof window !== 'undefined' ? localStorage.getItem(REFRESH_KEY) : null,
  getUser: (): User | null => {
    if (typeof window === 'undefined') return null
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  },

  setSession: (user: User, tokens: TokenPair) => {
    if (typeof window === 'undefined') return
    localStorage.setItem(TOKEN_KEY, tokens.access_token)
    localStorage.setItem(REFRESH_KEY, tokens.refresh_token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  },

  clearSession: () => {
    if (typeof window === 'undefined') return
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_KEY)
    localStorage.removeItem(USER_KEY)
  },

  isAuthenticated: () => typeof window !== 'undefined' ? !!localStorage.getItem(TOKEN_KEY) : false,

  login: async (email: string, password: string) => {
    const res = await api.post('/api/auth/login', { email, password })
    const { user, tokens } = res.data.data
    auth.setSession(user, tokens)
    return user as User
  },

  register: async (data: { firstName: string; lastName: string; email: string; password: string }) => {
    const { firstName, lastName, email, password } = data
    const res = await api.post('/api/auth/register', { 
      first_name: firstName, 
      last_name: lastName, 
      email, 
      password 
    })
    const { user, tokens } = res.data.data
    auth.setSession(user, tokens)
    return user as User
  },

  logout: () => {
    auth.clearSession()
  },
}
