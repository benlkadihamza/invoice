import { useState, useEffect, createContext, useContext } from 'react'
import { getMe, login as apiLogin, logout as apiLogout } from '../api/client'

type User = { id: number; username: string; show_decimals: boolean; show_daily_totals: boolean }
type AuthCtx = { user: User | null; loading: boolean; login: (u: string, p: string) => Promise<void>; logout: () => Promise<void> }

const AuthContext = createContext<AuthCtx>({ user: null, loading: true, login: async () => {}, logout: async () => {} })

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMe().then(({ user }) => setUser(user)).catch(() => setUser(null)).finally(() => setLoading(false))
  }, [])

  const login = async (username: string, password: string) => {
    const res: any = await apiLogin(username, password)
    setUser(res.user)
  }

  const logout = async () => {
    await apiLogout()
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
