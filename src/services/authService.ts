/**
 * Serviço de autenticação responsável por gerenciar a sessão do usuário
 * no navegador (armazenamento de token e dados básicos do usuário).
 *
 * IMPORTANTE: em um ambiente de produção real, a forma mais segura de
 * armazenar tokens de sessão costuma ser via cookies HTTP-only no backend.
 * Como este projeto é 100% frontend por enquanto, usamos localStorage
 * apenas para persistência básica entre recarregamentos da página.
 */

export const AUTH_STORAGE_KEY = 'auth_session_v1'
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

/**
 * Estrutura básica dos dados de sessão de autenticação
 */
export interface AuthUser {
  /** Identificador do usuário na sessão */
  id: string
  /** Identificador numérico do usuário no Firebird */
  usuarioId?: number
  /** Nome do usuário para exibição na interface */
  name: string
  /** Nome de usuário para login */
  username: string
  /** Perfil operacional retornado por TBUSUARIO.PERFIL */
  perfil?: string | null
  /** E-mail do usuário, quando cadastrado */
  email?: string | null
  /** Matrícula operacional do usuário, quando cadastrada */
  matricula?: string | null
  /** URL da foto do usuário, quando disponível */
  photoUrl?: string
}

export interface AuthSession {
  /** Token de autenticação (JWT ou similar, quando houver backend) */
  token: string
  /** Dados básicos do usuário autenticado */
  user: AuthUser
}

export interface LoginPayload {
  username: string
  password: string
}

export interface PasswordExpiredPayload {
  changeToken: string
  newPassword: string
  confirmPassword: string
}

export interface PasswordExpiredResponse {
  success: boolean
  message: string
  data?: {
    user?: AuthUser
    expiresAt?: string
  }
}

interface ApiErrorOptions {
  status: number
  code?: string
  details?: unknown
  changeToken?: string
  user?: AuthUser
}

export class AuthApiError extends Error {
  status: number
  code?: string
  details?: unknown
  changeToken?: string
  user?: AuthUser

  constructor(message: string, options: ApiErrorOptions) {
    super(message)
    this.name = 'AuthApiError'
    this.status = options.status
    this.code = options.code
    this.details = options.details
    this.changeToken = options.changeToken
    this.user = options.user
  }
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const errorPayload = payload as {
      error?: string
      code?: string
      details?: unknown
      changeToken?: string
      user?: AuthUser
    } | null

    throw new AuthApiError(
      errorPayload?.error || 'Não foi possível concluir a autenticação.',
      {
        status: response.status,
        code: errorPayload?.code,
        details: errorPayload?.details,
        changeToken: errorPayload?.changeToken,
        user: errorPayload?.user,
      }
    )
  }

  return payload as T
}

/**
 * Autentica o usuário no backend usando a mesma regra de senha do Delphi.
 */
export async function loginWithPassword(payload: LoginPayload): Promise<AuthSession> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = await parseJsonResponse<{ success: boolean; token: string; user: AuthUser }>(response)
  return {
    token: data.token,
    user: data.user,
  }
}

/**
 * Altera senha expirada usando token temporário emitido pelo backend.
 */
export async function changeExpiredPassword(
  payload: PasswordExpiredPayload
): Promise<PasswordExpiredResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/change-expired-password`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  return parseJsonResponse<PasswordExpiredResponse>(response)
}

/**
 * Salva a sessão de autenticação no localStorage.
 *
 * @param session Sessão de autenticação a ser persistida
 */
export function saveAuthSession(session: AuthSession): void {
  try {
    const serialized = JSON.stringify(session)
    localStorage.setItem(AUTH_STORAGE_KEY, serialized)
  } catch (error) {
    // Em produção, poderíamos enviar esse erro para um serviço de monitoramento
    console.error('Erro ao salvar sessão de autenticação:', error)
  }
}

/**
 * Recupera a sessão de autenticação do localStorage.
 *
 * @returns AuthSession ou null caso não exista/ocorra erro
 */
export function getAuthSession(): AuthSession | null {
  try {
    const data = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!data) return null

    const parsed = JSON.parse(data) as AuthSession

    // Validação mínima de estrutura para evitar erros em caso de dados corrompidos
    if (!parsed || typeof parsed !== 'object') return null
    if (!parsed.token || !parsed.user) return null

    return parsed
  } catch (error) {
    console.error('Erro ao recuperar sessão de autenticação:', error)
    return null
  }
}

/**
 * Remove a sessão de autenticação do armazenamento local.
 */
export function clearAuthSession(): void {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY)
  } catch (error) {
    console.error('Erro ao limpar sessão de autenticação:', error)
  }
}

/**
 * Indica rapidamente se existe uma sessão de autenticação válida
 * armazenada no navegador.
 */
export function hasActiveAuthSession(): boolean {
  return getAuthSession() !== null
}
