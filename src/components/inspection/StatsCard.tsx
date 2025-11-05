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
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
      textColor: 'text-foreground'
    },
    success: {
      iconBg: 'bg-green-500/10',
      iconColor: 'text-green-600 dark:text-green-500',
      textColor: 'text-green-600 dark:text-green-500'
    },
    danger: {
      iconBg: 'bg-red-500/10',
      iconColor: 'text-red-600 dark:text-red-500',
      textColor: 'text-red-600 dark:text-red-500'
    }
  }

  const styles = variantStyles[variant]

  return (
    <Card className={cn('p-4 sm:p-6', className)}>
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Ícone */}
        <div className={cn(
          'flex-none rounded-full p-2 sm:p-3',
          styles.iconBg
        )}>
          <Icon className={cn('w-5 h-5 sm:w-6 sm:h-6', styles.iconColor)} />
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">
            {title}
          </p>
          <p className={cn(
            'text-2xl sm:text-3xl font-bold tabular-nums',
            styles.textColor
          )}>
            {value.toLocaleString('pt-BR')}
          </p>
        </div>
      </div>
    </Card>
  )
}

