/**
 * Serviço para gerenciamento de dados de inspeção no localStorage
 */

import type { InspectionRecord, PaginatedResult, PaginationOptions } from '@/types/inspection'

// Chave do localStorage onde os registros serão armazenados
const STORAGE_KEY = 'inspection_records'

/**
 * Salva um novo registro de inspeção no localStorage
 * @param record - Registro de inspeção a ser salvo
 * @returns true se salvou com sucesso, false caso contrário
 */
export function saveInspectionRecord(record: InspectionRecord): boolean {
  try {
    const records = getAllRecords()
    records.push(record)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
    return true
  } catch (error) {
    console.error('Erro ao salvar registro de inspeção:', error)
    
    // Verifica se o erro é por falta de espaço no localStorage
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      throw new Error('Espaço de armazenamento insuficiente. Considere excluir registros antigos.')
    }
    
    return false
  }
}

/**
 * Recupera todos os registros de inspeção do localStorage
 * @returns Array de registros de inspeção
 */
export function getAllRecords(): InspectionRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) return []
    
    const records = JSON.parse(data) as InspectionRecord[]
    
    // Ordena por timestamp decrescente (mais recentes primeiro)
    return records.sort((a, b) => b.timestamp - a.timestamp)
  } catch (error) {
    console.error('Erro ao recuperar registros de inspeção:', error)
    return []
  }
}

/**
 * Recupera um registro específico por ID
 * @param id - ID do registro
 * @returns Registro encontrado ou undefined
 */
export function getRecordById(id: string): InspectionRecord | undefined {
  const records = getAllRecords()
  return records.find(record => record.id === id)
}

/**
 * Exclui um registro de inspeção por ID
 * @param id - ID do registro a ser excluído
 * @returns true se excluiu com sucesso, false caso contrário
 */
export function deleteRecord(id: string): boolean {
  try {
    const records = getAllRecords()
    const filteredRecords = records.filter(record => record.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredRecords))
    return true
  } catch (error) {
    console.error('Erro ao excluir registro de inspeção:', error)
    return false
  }
}

/**
 * Exclui múltiplos registros de inspeção por IDs
 * @param ids - Array de IDs dos registros a serem excluídos
 * @returns true se excluiu com sucesso, false caso contrário
 */
export function deleteMultipleRecords(ids: string[]): boolean {
  try {
    const records = getAllRecords()
    const filteredRecords = records.filter(record => !ids.includes(record.id))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredRecords))
    return true
  } catch (error) {
    console.error('Erro ao excluir registros de inspeção:', error)
    return false
  }
}

/**
 * Limpa todos os registros de inspeção do localStorage
 * @returns true se limpou com sucesso, false caso contrário
 */
export function clearAllRecords(): boolean {
  try {
    localStorage.removeItem(STORAGE_KEY)
    return true
  } catch (error) {
    console.error('Erro ao limpar registros de inspeção:', error)
    return false
  }
}

/**
 * Filtra registros com base em um campo e termo de busca
 * @param campo - Campo pelo qual filtrar ('todos' para buscar em todos os campos)
 * @param termo - Termo de busca
 * @returns Array de registros filtrados
 */
export function filterRecords(campo: string, termo: string): InspectionRecord[] {
  const records = getAllRecords()
  
  if (!termo.trim()) {
    return records
  }
  
  const termoLower = termo.toLowerCase().trim()
  
  return records.filter(record => {
    if (campo === 'todos') {
      // Busca em todos os campos relevantes
      return (
        record.id.toLowerCase().includes(termoLower) ||
        record.dataHora.toLowerCase().includes(termoLower) ||
        record.referenceData.op.toLowerCase().includes(termoLower) ||
        record.referenceData.lote.toLowerCase().includes(termoLower) ||
        record.referenceData.validade.toLowerCase().includes(termoLower) ||
        record.referenceData.produto.toLowerCase().includes(termoLower) ||
        record.referenceData.registroAnvisa.toLowerCase().includes(termoLower) ||
        record.referenceData.gtin.toLowerCase().includes(termoLower) ||
        (record.observacoes?.toLowerCase().includes(termoLower) ?? false) ||
        (record.usuario?.toLowerCase().includes(termoLower) ?? false)
      )
    }
    
    // Busca em campo específico
    switch (campo) {
      case 'id':
        return record.id.toLowerCase().includes(termoLower)
      case 'dataHora':
        return record.dataHora.toLowerCase().includes(termoLower)
      case 'op':
        return record.referenceData.op.toLowerCase().includes(termoLower)
      case 'lote':
        return record.referenceData.lote.toLowerCase().includes(termoLower)
      case 'validade':
        return record.referenceData.validade.toLowerCase().includes(termoLower)
      case 'produto':
        return record.referenceData.produto.toLowerCase().includes(termoLower)
      case 'registroAnvisa':
        return record.referenceData.registroAnvisa.toLowerCase().includes(termoLower)
      case 'gtin':
        return record.referenceData.gtin.toLowerCase().includes(termoLower)
      case 'observacoes':
        return record.observacoes?.toLowerCase().includes(termoLower) ?? false
      case 'usuario':
        return record.usuario?.toLowerCase().includes(termoLower) ?? false
      default:
        return false
    }
  })
}

/**
 * Recupera registros com paginação
 * @param options - Opções de paginação
 * @param filteredRecords - Registros já filtrados (opcional)
 * @returns Resultado paginado
 */
export function getPaginatedRecords(
  options: PaginationOptions,
  filteredRecords?: InspectionRecord[]
): PaginatedResult<InspectionRecord> {
  const records = filteredRecords ?? getAllRecords()
  const { page, pageSize } = options
  
  const total = records.length
  const totalPages = Math.ceil(total / pageSize)
  const startIndex = (page - 1) * pageSize
  const endIndex = startIndex + pageSize
  
  const data = records.slice(startIndex, endIndex)
  
  return {
    data,
    total,
    page,
    pageSize,
    totalPages
  }
}

/**
 * Gera um ID único para um novo registro
 * @returns ID único no formato timestamp-random
 */
export function generateRecordId(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 9)
  return `${timestamp}-${random}`
}

/**
 * Formata um timestamp em string de data/hora legível
 * @param timestamp - Timestamp em milissegundos
 * @returns String formatada (ex: "05/11/2025 14:30:45")
 */
export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp)
  
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`
}

/**
 * Verifica o espaço disponível no localStorage
 * @returns Objeto com informações sobre o uso do localStorage
 */
export function getStorageInfo(): {
  used: number
  available: number
  percentage: number
} {
  try {
    const data = localStorage.getItem(STORAGE_KEY) || ''
    const used = new Blob([data]).size
    
    // Limite típico do localStorage é ~5-10MB, vamos usar 5MB como referência
    const available = 5 * 1024 * 1024 // 5MB em bytes
    const percentage = (used / available) * 100
    
    return {
      used,
      available,
      percentage: Math.min(percentage, 100)
    }
  } catch (error) {
    console.error('Erro ao verificar espaço do localStorage:', error)
    return {
      used: 0,
      available: 0,
      percentage: 0
    }
  }
}

/**
 * Exporta todos os registros como JSON
 * @returns String JSON com todos os registros
 */
export function exportRecordsAsJSON(): string {
  const records = getAllRecords()
  return JSON.stringify(records, null, 2)
}

/**
 * Importa registros de uma string JSON
 * @param jsonString - String JSON com os registros
 * @returns true se importou com sucesso, false caso contrário
 */
export function importRecordsFromJSON(jsonString: string): boolean {
  try {
    const records = JSON.parse(jsonString) as InspectionRecord[]
    
    // Valida se é um array
    if (!Array.isArray(records)) {
      throw new Error('Formato inválido: esperado um array de registros')
    }
    
    // Mescla com registros existentes (evita duplicatas por ID)
    const existingRecords = getAllRecords()
    const existingIds = new Set(existingRecords.map(r => r.id))
    
    const newRecords = records.filter(r => !existingIds.has(r.id))
    const mergedRecords = [...existingRecords, ...newRecords]
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedRecords))
    return true
  } catch (error) {
    console.error('Erro ao importar registros:', error)
    return false
  }
}

