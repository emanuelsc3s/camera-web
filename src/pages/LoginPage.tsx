import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useLocation, useNavigate } from 'react-router-dom'
import { Loader2, ScanFace } from 'lucide-react'

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'

// Esquema de validação do formulário de login usando Zod
const loginSchema = z.object({
  emailOrUsername: z
    .string()
    .min(1, 'Informe seu e-mail ou usuário')
    .max(255, 'O valor informado é muito longo'),
  password: z
    .string()
    .min(6, 'A senha deve ter pelo menos 6 caracteres')
    .max(128, 'A senha informada é muito longa'),
})

export type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isAuthenticated, isLoading, loginError } = useAuth()

  // Caminho para redirecionar após login bem-sucedido (padrão: home)
  const fromPath = (location.state as { from?: string } | null)?.from ?? '/'

  // Se o usuário já estiver autenticado, evita exibir tela de login
  useEffect(() => {
    if (isAuthenticated) {
      navigate(fromPath, { replace: true })
    }
  }, [isAuthenticated, fromPath, navigate])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      emailOrUsername: '',
      password: '',
    },
  })

  // Envio do formulário de login
  const onSubmit = async (data: LoginFormValues) => {
    await login({
      emailOrUsername: data.emailOrUsername,
      password: data.password,
    })
    // Se não houver erro, o AuthProvider já terá atualizado o estado
    // e o useEffect acima fará o redirecionamento
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Acessar conta</CardTitle>
          <CardDescription>
            Informe suas credenciais para entrar no sistema de inspeção.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="emailOrUsername">E-mail ou usuário</Label>
              <Input
                id="emailOrUsername"
                type="text"
                autoComplete="username"
                placeholder="seu.email@exemplo.com"
                aria-invalid={!!errors.emailOrUsername}
                aria-describedby={errors.emailOrUsername ? 'emailOrUsername-error' : undefined}
                disabled={isLoading}
                {...register('emailOrUsername')}
              />
              {errors.emailOrUsername && (
                <p
                  id="emailOrUsername-error"
                  className="text-sm text-destructive"
                >
                  {errors.emailOrUsername.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="Digite sua senha"
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'password-error' : undefined}
                disabled={isLoading}
                {...register('password')}
              />
              {errors.password && (
                <p id="password-error" className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            {Boolean(loginError) && (
              <div
                role="alert"
                className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                Nao foi possivel realizar o login. Tente novamente.
              </div>
            )}

            <div className="flex flex-row gap-2 mt-2">
              <Button
                type="submit"
                className="flex-1"
                disabled={isLoading}
              >
                {isLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                )}
                <span>{isLoading ? 'Entrando...' : 'Entrar'}</span>
              </Button>

              <Button
                type="button"
                className="flex-1"
              >
                <ScanFace className="mr-2 h-4 w-4" aria-hidden="true" />
                <span>Face ID</span>
              </Button>
            </div>
          </form>
        </CardContent>

        <CardFooter>
          <p className="text-xs text-muted-foreground text-center w-full">
            As credenciais são validadas apenas no navegador nesta fase do
            projeto. Quando a API oficial estiver disponível, este fluxo
            passará a usar autenticação real no backend.
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
