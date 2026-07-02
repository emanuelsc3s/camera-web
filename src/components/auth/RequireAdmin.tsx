import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import { useAuth } from '@/hooks/useAuth'

interface RequireAdminProps {
  children: ReactNode
}

function isAdministrador(perfil?: string | null): boolean {
  return String(perfil || '').trim().toUpperCase() === 'ADMINISTRADOR'
}

export function RequireAdmin({ children }: RequireAdminProps) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-foreground">
        <p className="text-sm text-muted-foreground">Validando sessão...</p>
      </div>
    )
  }

  if (!isAdministrador(user?.perfil)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
