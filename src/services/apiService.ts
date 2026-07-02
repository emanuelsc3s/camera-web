import { API_BASE_URL, getAuthSession } from '@/services/authService'
import type { InspectionStates, ReferenceData } from '@/types/inspection'

export interface ApiErrorOptions {
  status: number
  code?: string
  details?: unknown
}

export class ApiError extends Error {
  status: number
  code?: string
  details?: unknown

  constructor(message: string, options: ApiErrorOptions) {
    super(message)
    this.name = 'ApiError'
    this.status = options.status
    this.code = options.code
    this.details = options.details
  }
}

export interface ReferenceDataComOpId extends ReferenceData {
  opId: number
  linhaProducaoId: number
}

export interface ConfiguracaoEstacao {
  configurado: boolean
  linhaProducaoId: number | null
  estacaoNome: string
  opAtiva: ReferenceDataComOpId | null
}

export interface InspectionSummary {
  total: number
  aprovados: number
  reprovados: number
}

export interface CreateInspectionPayload {
  opAtivaIdConfirmado: number
  fotoBase64: string
  inspectionStates: InspectionStates
  usuarioId?: number
  usuario?: string
  fase?: string | null
  observacoes?: string | null
}

interface RequestOptions extends RequestInit {
  auth?: boolean
}

async function parseJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const errorPayload = payload as {
      error?: string
      code?: string
      details?: unknown
    } | null

    throw new ApiError(errorPayload?.error || 'Não foi possível concluir a requisição.', {
      status: response.status,
      code: errorPayload?.code,
      details: errorPayload?.details,
    })
  }

  return payload as T
}

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers)

  if (!headers.has('content-type') && options.body) {
    headers.set('content-type', 'application/json')
  }

  if (options.auth) {
    const token = getAuthSession()?.token
    if (token) {
      headers.set('authorization', `Bearer ${token}`)
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  return parseJson<T>(response)
}

export async function getContextoEstacao(): Promise<ConfiguracaoEstacao> {
  return apiRequest<ConfiguracaoEstacao>('/estacao/contexto')
}

export async function getConfiguracaoEstacao(): Promise<ConfiguracaoEstacao> {
  return apiRequest<ConfiguracaoEstacao>('/configuracao-estacao', { auth: true })
}

export async function updateConfiguracaoEstacao(data: {
  linhaProducaoId: number
  estacaoNome: string
}): Promise<ConfiguracaoEstacao> {
  return apiRequest<ConfiguracaoEstacao>('/configuracao-estacao', {
    method: 'PUT',
    auth: true,
    body: JSON.stringify(data),
  })
}

export async function testarOpAtiva(linhaProducaoId: number): Promise<{
  linhaProducaoId: number
  opAtiva: ReferenceDataComOpId | null
}> {
  return apiRequest<{
    linhaProducaoId: number
    opAtiva: ReferenceDataComOpId | null
  }>(`/configuracao-estacao/teste-op-ativa?linhaProducaoId=${linhaProducaoId}`, {
    auth: true,
  })
}

export async function createInspection(data: CreateInspectionPayload): Promise<{
  id: number
  status: string
  message: string
}> {
  return apiRequest('/inspecoes', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function getInspectionSummary(linhaProducaoId: number): Promise<InspectionSummary> {
  return apiRequest(`/inspecoes/resumo?linhaProducaoId=${linhaProducaoId}`)
}
