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

export interface FirebirdConfiguracao {
  host: string
  port: number
  database: string
  user: string
  role: string
  charset: string
  pageSize: number
  poolMax: number
  connectTimeoutMs: number
  passwordConfigured: boolean
  passwordEncrypted: boolean
}

export interface ConfiguracaoEstacao {
  configurado: boolean
  linhaProducaoId: number | null
  estacaoNome: string
  opAtiva: ReferenceDataComOpId | null
  firebird?: FirebirdConfiguracao
}

export interface OpCadastrada {
  opId: number | null
  op: string
  status: string
  linhaProducaoId: number | null
  linhaProducao: string
  produto: string
  lote: string
  validade: string
}

export interface LinhaProducao {
  linhaProducaoId: number
  linhaProducao: string
}

export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface PaginatedOpsCadastradas {
  data: OpCadastrada[]
  pagination: PaginationInfo
}

export interface PaginatedLinhasProducao {
  data: LinhaProducao[]
  pagination: PaginationInfo
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

export async function updateConfiguracaoFirebird(data: {
  host: string
  port: number
  database: string
  user: string
  role: string
  charset: string
  pageSize: number
  poolMax: number
  connectTimeoutMs: number
  password?: string
}): Promise<ConfiguracaoEstacao> {
  return apiRequest<ConfiguracaoEstacao>('/configuracao-estacao/firebird', {
    method: 'PUT',
    auth: true,
    body: JSON.stringify(data),
  })
}

export async function getOpsCadastradas(params: {
  page: number
  limit: number
}): Promise<PaginatedOpsCadastradas> {
  const searchParams = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
  })

  return apiRequest<PaginatedOpsCadastradas>(
    `/configuracao-estacao/ops-cadastradas?${searchParams.toString()}`,
    { auth: true }
  )
}

export async function getLinhasProducao(params: {
  page: number
  limit: number
}): Promise<PaginatedLinhasProducao> {
  const searchParams = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
  })

  return apiRequest<PaginatedLinhasProducao>(
    `/configuracao-estacao/linhas-producao?${searchParams.toString()}`,
    { auth: true }
  )
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
