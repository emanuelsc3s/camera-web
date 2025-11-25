import { useEffect, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAuth } from '@/hooks/useAuth'
import { User as UserIcon } from 'lucide-react'
import { getFaceIdUserById } from '@/services/faceIdStorageService'

function getInitials(fullName?: string) {
  if (!fullName) return 'US'

  const [first, second] = fullName.trim().split(/\s+/)
  const initials = `${first?.[0] ?? ''}${second?.[0] ?? ''}`

  return initials ? initials.toUpperCase() : 'US'
}

export default function Header() {
  const { user, token } = useAuth()
  const displayName = (user?.name || 'Usuário').trim()
  const initials = getInitials(user?.name)
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(user?.photoUrl)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const tokenPreview = token ? `${token.slice(0, 6)}…${token.slice(-4)}` : 'Nenhum token'

  useEffect(() => {
    let isMounted = true
    setAvatarUrl(user?.photoUrl)

    // Se o usuário tiver sido autenticado pelo Face ID, mas o avatar não estiver na sessão,
    // tenta buscar a foto no banco local do Face ID para exibir no header.
    if (!user?.photoUrl && user?.id) {
      void (async () => {
        try {
          const faceIdUser = await getFaceIdUserById(user.id)
          if (isMounted && faceIdUser?.photoUrl) {
            setAvatarUrl(faceIdUser.photoUrl)
          }
        } catch (error) {
          console.error('[Header] Não foi possível carregar foto do Face ID', error)
        }
      })()
    }

    return () => {
      isMounted = false
    }
  }, [user?.id, user?.photoUrl])

  return (
    <header className="border-b bg-primary text-primary-foreground">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center space-x-2">
          <h1 className="text-xl font-bold">
            {import.meta.env.VITE_APP_TITLE || 'Minha Aplicação'}
          </h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setIsProfileOpen(true)}
            className="group inline-flex items-center gap-2 sm:gap-3 min-w-0 rounded-full px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-foreground/80 focus-visible:ring-offset-primary"
            aria-label="Abrir perfil do usuário"
          >
            <Avatar className="h-9 w-9 bg-primary-foreground text-primary ring-2 ring-primary-foreground shadow-sm transition-transform group-active:scale-[0.97]">
              <AvatarImage src={avatarUrl} alt={`Avatar de ${displayName}`} />
              <AvatarFallback className="uppercase font-semibold">
                <UserIcon className="h-5 w-5" aria-hidden />
                <span className="sr-only">{initials}</span>
              </AvatarFallback>
            </Avatar>

            <span className="text-sm sm:text-base font-semibold leading-none truncate max-w-[200px]">
              {displayName}
            </span>
          </button>
        </div>
      </div>

      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader className="items-center text-center">
            <DialogTitle>Perfil do usuário</DialogTitle>
            <DialogDescription>Dados da sessão atual</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4">
            <Avatar className="h-32 w-32 bg-muted text-primary ring-2 ring-primary/20 shadow-md">
              <AvatarImage src={avatarUrl} alt={`Avatar de ${displayName}`} />
              <AvatarFallback className="uppercase font-semibold text-lg">
                <UserIcon className="h-8 w-8" aria-hidden />
                <span className="sr-only">{initials}</span>
              </AvatarFallback>
            </Avatar>

            <div className="text-center space-y-1">
              <p className="text-lg font-semibold leading-tight break-words">{displayName}</p>
              <p className="text-sm text-muted-foreground break-words">{user?.email || 'Sem e-mail'}</p>
              <p className="text-[11px] text-muted-foreground/80 break-words">
                ID: {user?.id || 'N/D'}
              </p>
            </div>

            <div className="w-full rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground text-center">
              <p>Token atual: {tokenPreview}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  )
}
