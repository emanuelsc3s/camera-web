import { useState, useEffect } from 'react'
import { getAllRecords } from '@/services/storageService'
import type { InspectionRecord } from '@/types/inspection'

/**
 * Interface para as estatísticas de inspeção
 */
export interface InspectionStats {
  /** Total geral de inspeções realizadas */
  total: number
  /** Total de inspeções aprovadas */
  aprovados: number
  /** Total de inspeções reprovadas */
  reprovados: number
}

/**
 * Hook customizado para calcular estatísticas de inspeção do LocalStorage
 * 
 * Calcula automaticamente:
 * - Total de inspeções realizadas
 * - Total de inspeções aprovadas (statusFinal === 'APROVADO')
 * - Total de inspeções reprovadas (statusFinal === 'REPROVADO')
 * 
 * @returns Objeto com as estatísticas calculadas
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const stats = useInspectionStats()
 *   
 *   return (
 *     <div>
 *       <p>Total: {stats.total}</p>
 *       <p>Aprovados: {stats.aprovados}</p>
 *       <p>Reprovados: {stats.reprovados}</p>
 *     </div>
 *   )
 * }
 * ```
 */
export function useInspectionStats(): InspectionStats {
  const [stats, setStats] = useState<InspectionStats>({
    total: 0,
    aprovados: 0,
    reprovados: 0
  })

  useEffect(() => {
    // Função para calcular as estatísticas
    const calculateStats = () => {
      const records: InspectionRecord[] = getAllRecords()
      
      const total = records.length
      const aprovados = records.filter(record => record.statusFinal === 'APROVADO').length
      const reprovados = records.filter(record => record.statusFinal === 'REPROVADO').length

      setStats({
        total,
        aprovados,
        reprovados
      })
    }

    // Calcula as estatísticas inicialmente
    calculateStats()

    // Listener para detectar mudanças no localStorage
    const handleStorageChange = (e: StorageEvent) => {
      // Recalcula apenas se a chave 'inspection_records' foi modificada
      if (e.key === 'inspection_records' || e.key === null) {
        calculateStats()
      }
    }

    // Adiciona listener para mudanças no localStorage
    window.addEventListener('storage', handleStorageChange)

    // Cleanup: remove listener quando o componente for desmontado
    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  return stats
}

