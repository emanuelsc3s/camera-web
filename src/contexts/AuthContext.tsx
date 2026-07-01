import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { FACE_ID_AUTH_TOKEN, type FaceIdUser } from '@/types/faceId'
import {
  AuthApiError,
  type AuthSession,
  type AuthUser,
  changeExpiredPassword as changeExpiredPasswordRequest,
  clearAuthSession,
  getAuthSession,
  loginWithPassword,
  saveAuthSession,
} from '@/services/authService'

// ============================================================================
// Tipos e Context (consolidado de authContext.ts)
// ============================================================================

export interface LoginCredentials {
  username: string
  password: string
  faceIdUser?: FaceIdUser
}

export interface PasswordExpiredState {
  changeToken: string
  message: string
  user?: AuthUser
}

export interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  isChangingExpiredPassword: boolean
  loginError: string | null
  passwordExpired: PasswordExpiredState | null
  passwordChangeError: string | null
  login: (credentials: LoginCredentials) => Promise<void>
  changeExpiredPassword: (data: { newPassword: string; confirmPassword: string }) => Promise<void>
  clearPasswordExpired: () => void
  logout: () => void
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [loginError, setLoginError] = useState<string | null>(null)
  const [passwordExpired, setPasswordExpired] = useState<PasswordExpiredState | null>(null)
  const [passwordChangeError, setPasswordChangeError] = useState<string | null>(null)

  useEffect(() => {
    const session = getAuthSession()
    if (session) {
      setUser(session.user)
      setToken(session.token)
    }
    setIsInitializing(false)
  }, [])

  const loginMutation = useMutation<AuthSession, Error, LoginCredentials>({
    mutationKey: ['auth', 'login'],
    mutationFn: async ({ username, password }: LoginCredentials) =>
      loginWithPassword({ username, password }),
    onSuccess: (session) => {
      saveAuthSession(session)
      setUser(session.user)
      setToken(session.token)
      setLoginError(null)
      setPasswordExpired(null)
      setPasswordChangeError(null)
    },
    onError: (error) => {
      console.error('Erro no fluxo de login:', error)
      if (error instanceof AuthApiError && error.code === 'SENHA_EXPIRADA' && error.changeToken) {
        setPasswordExpired({
          changeToken: error.changeToken,
          message: error.message,
          user: error.user,
        })
        setLoginError(null)
        return
      }

      setLoginError(error.message || 'Não foi possível realizar o login. Tente novamente.')
    },
  })

  const login = useCallback(async (credentials: LoginCredentials) => {
    setLoginError(null)
    setPasswordChangeError(null)

    const isFaceIdLogin = credentials.password === FACE_ID_AUTH_TOKEN || Boolean(credentials.faceIdUser)
    if (isFaceIdLogin) {
      const faceUser = credentials.faceIdUser
      const sessionUser: AuthUser = faceUser
        ? {
            id: faceUser.id,
            name: faceUser.name,
            username: faceUser.matricula || faceUser.name,
            photoUrl: faceUser.photoUrl,
          }
        : {
            id: credentials.username,
            name: credentials.username,
            username: credentials.username,
          }

      const session: AuthSession = {
        token: `faceid:${Date.now()}`,
        user: sessionUser,
      }

      saveAuthSession(session)
      setUser(sessionUser)
      setToken(session.token)
      setPasswordExpired(null)
      return
    }

    try {
      await loginMutation.mutateAsync(credentials)
    } catch {
      // O estado de erro é tratado no onError da mutation para manter a UI consistente.
    }
  }, [loginMutation])

  const changeExpiredPasswordMutation = useMutation<
    void,
    Error,
    { newPassword: string; confirmPassword: string }
  >({
    mutationKey: ['auth', 'change-expired-password'],
    mutationFn: async (data) => {
      if (!passwordExpired?.changeToken) {
        throw new Error('Token de alteração de senha não encontrado. Faça login novamente.')
      }

      await changeExpiredPasswordRequest({
        changeToken: passwordExpired.changeToken,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      })
    },
    onSuccess: () => {
      setPasswordExpired(null)
      setPasswordChangeError(null)
    },
    onError: (error) => {
      console.error('Erro ao alterar senha expirada:', error)
      setPasswordChangeError(error.message || 'Não foi possível alterar a senha.')
    },
  })

  const changeExpiredPassword = useCallback(async (data: {
    newPassword: string
    confirmPassword: string
  }) => {
    setPasswordChangeError(null)
    await changeExpiredPasswordMutation.mutateAsync(data)
  }, [changeExpiredPasswordMutation])

  const clearPasswordExpired = useCallback(() => {
    setPasswordExpired(null)
    setPasswordChangeError(null)
  }, [])

  const logout = useCallback(() => {
    clearAuthSession()
    setUser(null)
    setToken(null)
    setLoginError(null)
    setPasswordExpired(null)
    setPasswordChangeError(null)
  }, [])

  const value: AuthContextValue = useMemo(() => {
    return {
      user,
      token,
      isAuthenticated: Boolean(user && token),
      isLoading: isInitializing || loginMutation.isPending,
      isChangingExpiredPassword: changeExpiredPasswordMutation.isPending,
      loginError,
      passwordExpired,
      passwordChangeError,
      login,
      changeExpiredPassword,
      clearPasswordExpired,
      logout,
    }
  }, [
    user,
    token,
    isInitializing,
    loginMutation.isPending,
    changeExpiredPasswordMutation.isPending,
    loginError,
    passwordExpired,
    passwordChangeError,
    login,
    changeExpiredPassword,
    clearPasswordExpired,
    logout,
  ])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
