import { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatsCardProps {
  /** Título do contador */
  title: string
  /** Valor numérico a ser exibido */
  value: number
  /** Ícone do Lucide React */
  icon: LucideIcon
  /** Cor do tema do card (opcional) */
  variant?: 'default' | 'success' | 'danger'
  /** Classes CSS adicionais (opcional) */
  className?: string
}

/**
 * Componente de card para exibir estatísticas/métricas
 * 
 * Exibe um contador com ícone, título e valor numérico
 * Segue o padrão visual do shadcn/ui
 * 
 * @example
 * ```tsx
 * import { CheckCircle2 } from 'lucide-react'
 * 
 * <StatsCard
 *   title="Aprovados"
 *   value={42}
 *   icon={CheckCircle2}
 *   variant="success"
 * />
 * ```
 */
export default function StatsCard({
  title,
  value,
  icon: Icon,
  variant = 'default',
  className
}: StatsCardProps) {
  // Define as cores baseadas na variante
  const variantStyles = {
    default: {
      cardBg: '#ceeffb', // Cor de fundo específica para o card "Inspecionados"
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
      textColor: '#104d69' // Cor de fonte aplicada
    },
    success: {
      cardBg: undefined, // Mantém cor padrão do Card
      iconBg: 'bg-green-500/10',
      iconColor: 'text-green-600 dark:text-green-500',
      textColor: '#104d69' // Cor de fonte aplicada
    },
    danger: {
      cardBg: undefined, // Mantém cor padrão do Card
      iconBg: 'bg-red-500/10',
      iconColor: 'text-red-600 dark:text-red-500',
      textColor: '#104d69' // Cor de fonte aplicada
    }
  }

  const styles = variantStyles[variant]

  return (
    <Card
      className={cn('p-2 sm:p-2.5 md:p-3 lg:p-4', className)}
      style={styles.cardBg ? { backgroundColor: styles.cardBg } : undefined}
    >
      <div className="flex items-center gap-1.5 sm:gap-2 md:gap-2.5 lg:gap-3">
        {/* Ícone */}
        <div className={cn(
          'flex-none rounded-full p-1.5 sm:p-1.5 md:p-2 lg:p-2',
          styles.iconBg
        )}>
          <Icon className={cn('w-4 h-4 sm:w-4 sm:h-4 md:w-4.5 md:h-4.5 lg:w-5 lg:h-5', styles.iconColor)} />
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <p
            className="font-bold mb-0 sm:mb-0.5"
            style={{ color: styles.textColor, fontSize: '14px' }}
          >
            {title}
          </p>
          <p
            className="font-bold tabular-nums leading-tight"
            style={{ color: styles.textColor, fontSize: '22px' }}
          >
            {value.toLocaleString('pt-BR')}
          </p>
        </div>
      </div>
    </Card>
  )
}

