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

/**
 * Estrutura básica dos dados de sessão de autenticação
 */
export interface AuthUser {
  /** Identificador do usuário (pode vir do backend futuramente) */
  id: string
  /** Nome do usuário para exibição na interface */
  name: string
  /** Nome de usuário para login */
  username: string
  /** URL da foto do usuário, quando disponível */
  photoUrl?: string
}

export interface AuthSession {
  /** Token de autenticação (JWT ou similar, quando houver backend) */
  token: string
  /** Dados básicos do usuário autenticado */
  user: AuthUser
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
