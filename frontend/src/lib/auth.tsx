import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import api, {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  getUser,
  setOnAuthFailure,
  setTokens,
} from "@/lib/api"
import type { AuthPayload, User } from "@/lib/types"

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getUser())
  const [authed, setAuthed] = useState(() => !!getAccessToken())

  useEffect(() => {
    setOnAuthFailure(() => {
      setAuthed(false)
      setUser(null)
    })
  }, [])

  const applyAuthPayload = (payload: AuthPayload) => {
    setTokens(payload)
    setUser(payload.user)
    setAuthed(true)
  }

  const login = async (email: string, password: string) => {
    const { data } = await api.post("/auth/login", { email, password })
    applyAuthPayload(data.data as AuthPayload)
  }

  const register = async (email: string, password: string) => {
    const { data } = await api.post("/auth/register", { email, password })
    applyAuthPayload(data.data as AuthPayload)
  }

  const logout = async () => {
    const refreshToken = getRefreshToken()
    try {
      if (refreshToken) await api.post("/auth/logout", { refreshToken })
    } catch {
      // best-effort revoke; local state is cleared regardless
    } finally {
      clearTokens()
      setAuthed(false)
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: authed, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider")
  return ctx
}
