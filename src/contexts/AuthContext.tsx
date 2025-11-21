import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { FACE_ID_AUTH_TOKEN, type FaceIdUser } from '@/types/faceId'
import {
  type AuthSession,
  type AuthUser,
  clearAuthSession,
  getAuthSession,
  saveAuthSession,
} from '@/services/authService'

export interface LoginCredentials {
  emailOrUsername: string
  password: string
  faceIdUser?: FaceIdUser
}

export interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  loginError: string | null
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [loginError, setLoginError] = useState<string | null>(null)

  useEffect(() => {
    const session = getAuthSession()
    if (session) {
      setUser(session.user)
      setToken(session.token)
    }
    setIsInitializing(false)
  }, [])

  const loginMutation = useMutation<{ token: string; user: AuthUser }, Error, LoginCredentials>({
    mutationKey: ['auth', 'login'],
    mutationFn: async ({ emailOrUsername }: LoginCredentials) => {
      await new Promise((resolve) => setTimeout(resolve, 500))

      const token = btoa(`${emailOrUsername}:${Date.now()}`)

      const user: AuthUser = {
        id: emailOrUsername.toLowerCase(),
        name: emailOrUsername,
        email: emailOrUsername,
      }

      const session: AuthSession = { token, user }
      saveAuthSession(session)

      return session
    },
    onSuccess: (session) => {
      setUser(session.user)
      setToken(session.token)
      setLoginError(null)
    },
    onError: (error) => {
      console.error('Erro no fluxo de login:', error)
      setLoginError('Não foi possível realizar o login. Tente novamente.')
    },
  })

  const login = async (credentials: LoginCredentials) => {
    setLoginError(null)

    const isFaceIdLogin = credentials.password === FACE_ID_AUTH_TOKEN || Boolean(credentials.faceIdUser)
    if (isFaceIdLogin) {
      const faceUser = credentials.faceIdUser
      const sessionUser: AuthUser = faceUser
        ? {
            id: faceUser.id,
            name: faceUser.name,
            email: faceUser.matricula || faceUser.name,
            photoUrl: faceUser.photoUrl,
          }
        : {
            id: credentials.emailOrUsername,
            name: credentials.emailOrUsername,
            email: credentials.emailOrUsername,
          }

      const session: AuthSession = {
        token: `faceid:${Date.now()}`,
        user: sessionUser,
      }

      saveAuthSession(session)
      setUser(sessionUser)
      setToken(session.token)
      return
    }

    await loginMutation.mutateAsync(credentials)
  }

  const logout = () => {
    clearAuthSession()
    setUser(null)
    setToken(null)
    setLoginError(null)
  }

  const value: AuthContextValue = useMemo(() => {
    return {
      user,
      token,
      isAuthenticated: Boolean(user && token),
      isLoading: isInitializing || loginMutation.isPending,
      loginError,
      login,
      logout,
    }
  }, [user, token, isInitializing, loginMutation.isPending, loginError])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}
