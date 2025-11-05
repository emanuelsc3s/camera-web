/**
 * Tipos TypeScript para o sistema de inspeção
 */

// Estado de conformidade de um item de inspeção
export type ConformityState = boolean | null

// Tipos de itens de inspeção
export type InspectionItem = 'gtin' | 'datamatrix' | 'lote' | 'validade'

// Dados de referência do produto
export interface ReferenceData {
  op: string
  lote: string
  validade: string
  produto: string
  registroAnvisa: string
  gtin: string
}

// Estados de conformidade de todos os itens de inspeção
export interface InspectionStates {
  gtin: ConformityState
  datamatrix: ConformityState
  lote: ConformityState
  validade: ConformityState
}

// Registro completo de inspeção salvo no localStorage
export interface InspectionRecord {
  // Identificador único do registro
  id: string
  
  // Timestamp de criação do registro
  timestamp: number
  
  // Data/hora formatada para exibição
  dataHora: string
  
  // Foto capturada (base64 data URL)
  foto: string
  
  // Dados de referência do produto
  referenceData: ReferenceData
  
  // Estados de conformidade dos itens inspecionados
  inspectionStates: InspectionStates
  
  // Campos adicionais que podem ser adicionados no futuro
  observacoes?: string
  usuario?: string
  localizacao?: string
}

// Filtros para busca de registros
export interface InspectionFilters {
  campo: keyof InspectionRecord | 'todos'
  termo: string
}

// Opções de paginação
export interface PaginationOptions {
  page: number
  pageSize: number
}

// Resultado paginado
export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

