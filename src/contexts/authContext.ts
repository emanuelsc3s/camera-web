import { createContext } from 'react'
import type { AuthUser } from '@/services/authService'
import type { FaceIdUser } from '@/types/faceId'

export interface LoginCredentials {
  username: string
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

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
