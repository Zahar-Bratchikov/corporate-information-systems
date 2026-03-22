import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { endpoints } from './api/endpoints'

export interface UserInfo {
  token: string
  userId: number
  login: string
  fullName: string
  roleName: string
  roleId: number
}

const STORAGE_KEY = 'upzit_user'

function loadStored(): UserInfo | null {
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    if (!s) return null
    return JSON.parse(s) as UserInfo
  } catch {
    return null
  }
}

interface AuthContextValue {
  user: UserInfo | null
  login: (login: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => void
  isAdmin: boolean
  isManager: boolean
  isObserver: boolean
  canEdit: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(loadStored)

  const login = useCallback(async (loginName: string, password: string) => {
    const res = await fetch(endpoints.authentication.signIn, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: loginName, password }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return { ok: false, error: data.error || 'Ошибка входа' }
    }
    const u: UserInfo = {
      token: data.token,
      userId: data.userId,
      login: data.login,
      fullName: data.fullName,
      roleName: data.roleName,
      roleId: data.roleId,
    }
    setUser(u)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u))
    return { ok: true }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const isAdmin = user?.roleName === 'Администратор'
  const isManager = user?.roleName === 'Руководитель проекта / Тимлид'
  const isObserver = user?.roleName === 'Наблюдатель'
  const canEdit = !isObserver

  const value: AuthContextValue = {
    user,
    login,
    logout,
    isAdmin,
    isManager,
    isObserver,
    canEdit,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
