import { useQuery } from '@tanstack/react-query'

import { getInspectionSummary } from '@/services/apiService'

/**
 * Estatísticas resumidas das inspeções manuais da linha configurada.
 */
export interface InspectionStats {
  /** Total geral de inspeções realizadas */
  total: number
  /** Total de inspeções aprovadas */
  aprovados: number
  /** Total de inspeções reprovadas */
  reprovados: number
}

const EMPTY_STATS: InspectionStats = {
  total: 0,
  aprovados: 0,
  reprovados: 0,
}

/**
 * Busca as estatísticas de inspeção no backend para a linha informada.
 */
export function useInspectionStats(linhaProducaoId?: number | null): InspectionStats {
  const enabled = Number.isInteger(linhaProducaoId) && Number(linhaProducaoId) > 0

  const { data } = useQuery({
    queryKey: ['inspecoes', 'resumo', linhaProducaoId],
    queryFn: () => getInspectionSummary(Number(linhaProducaoId)),
    enabled,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  })

  return data ?? EMPTY_STATS
}
