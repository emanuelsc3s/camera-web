import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatsCardProps {
  /** Título do contador */
  title: string
  /** Valor numérico a ser exibido */
  value: number
  /** Cor do tema do card (opcional) */
  variant?: 'default' | 'success' | 'danger'
  /** Classes CSS adicionais (opcional) */
  className?: string
}

/**
 * Componente de card para exibir estatísticas/métricas
 *
 * Exibe um contador com título e valor numérico
 * Segue o padrão visual do shadcn/ui
 *
 * @example
 * ```tsx
 * <StatsCard
 *   title="Aprovados"
 *   value={42}
 *   variant="success"
 * />
 * ```
 */
export default function StatsCard({
  title,
  value,
  variant = 'default',
  className
}: StatsCardProps) {
  // Define as cores baseadas na variante
  const variantStyles = {
    default: {
      cardBg: '#ceeffb', // Cor de fundo específica para o card "Inspecionados"
      textColor: '#104d69' // Cor de fonte aplicada
    },
    success: {
      cardBg: '#f7a6a6', // Cor de fundo específica para o card "Aprovados"
      textColor: '#104d69' // Cor de fonte aplicada
    },
    danger: {
      cardBg: '#9ed79e', // Cor de fundo específica para o card "Reprovados"
      textColor: '#104d69' // Cor de fonte aplicada
    }
  }

  const styles = variantStyles[variant]

  return (
    <Card
      className={cn('p-2 sm:p-2.5 md:p-3 lg:p-4', className)}
      style={styles.cardBg ? { backgroundColor: styles.cardBg } : undefined}
    >
      <div className="flex flex-col items-center">
        {/* Conteúdo centralizado com ordem invertida */}
        <p
          className="tabular-nums leading-tight"
          style={{
            color: styles.textColor,
            fontSize: '22px',
            fontWeight: 'bold'
          }}
        >
          {value.toLocaleString('pt-BR')}
        </p>
        <p
          className="mt-0 sm:mt-0.5"
          style={{
            color: styles.textColor,
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          {title}
        </p>
      </div>
    </Card>
  )
}

