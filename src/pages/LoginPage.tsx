import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useLocation, useNavigate } from 'react-router-dom'
import { Loader2, ScanFace, Shield } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { FaceIdModal } from '@/components/face-id/FaceIdModal'

// Esquema de validação do formulário de login usando Zod
const loginSchema = z.object({
  username: z
    .string()
    .min(1, 'Informe seu usuário')
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
  const { login, isAuthenticated, isLoading, loginError, token } = useAuth()
  const [faceIdModalOpen, setFaceIdModalOpen] = useState(false)
  const isFaceIdSession = Boolean(token?.startsWith('faceid:'))

  // Caminho para redirecionar após login bem-sucedido (padrão: home)
  const fromPath = (location.state as { from?: string } | null)?.from ?? '/'

  // Se o usuário já estiver autenticado, evita exibir tela de login.
  // Para sessões do Face ID, redireciona direto para a Home.
  useEffect(() => {
    if (!isAuthenticated) return

    const targetPath = isFaceIdSession ? '/' : fromPath
    navigate(targetPath, { replace: true })
  }, [isAuthenticated, isFaceIdSession, fromPath, navigate])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  })

  // Envio do formulário de login
  const onSubmit = async (data: LoginFormValues) => {
    await login({
      username: data.username,
      password: data.password,
    })
    // Se não houver erro, o AuthProvider já terá atualizado o estado
    // e o useEffect acima fará o redirecionamento
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Seção de Branding com Vídeo - Oculta em mobile, visível em lg+ */}
      <section
        className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden"
        aria-label="Vídeo institucional da linha de produção"
      >
        {/* Vídeo de fundo */}
        <video
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          loop
          muted
          playsInline
          aria-hidden="true"
        >
          <source src="/VideoLinhaE.mov" type="video/quicktime" />
          <source src="/VideoLinhaE.mov" type="video/mp4" />
        </video>

        {/* Overlay gradiente para melhor legibilidade e estética */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-primary/80 via-primary/50 to-transparent"
          aria-hidden="true"
        />

        {/* Conteúdo sobre o vídeo */}
        <div className="relative z-10 flex flex-col justify-end p-12 text-white">
          <div className="max-w-md space-y-4">
            <div className="flex items-center gap-3">
              <Shield className="h-10 w-10" aria-hidden="true" />
              <span className="text-2xl font-bold tracking-tight">SysView</span>
            </div>
            <h1 className="text-3xl xl:text-4xl font-bold leading-tight">
              Sistema de Inspeção e Controle Farmacêutico
            </h1>
            <p className="text-lg text-white/90 leading-relaxed">
              Monitoramento em tempo real da linha de produção com tecnologia de visão computacional.
            </p>
          </div>
        </div>
      </section>

      {/* Seção de Login */}
      <section
        className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-background"
        aria-label="Formulário de login"
      >
        <div className="w-full max-w-md space-y-8">
          {/* Logo/Branding para mobile - visível apenas em telas menores */}
          <div className="lg:hidden text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-primary">
              <Shield className="h-8 w-8" aria-hidden="true" />
              <span className="text-xl font-bold tracking-tight">SysView</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Sistema de Inspeção e Controle Farmacêutico
            </p>
          </div>

          {/* Card de Login */}
          <Card className="border-0 shadow-xl lg:shadow-2xl">
            <CardHeader className="space-y-3 pb-6">
              <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight">
                Acessar conta
              </CardTitle>
              <CardDescription className="text-base">
                Informe suas credenciais para entrar no sistema de inspeção.
              </CardDescription>
            </CardHeader>

            <CardContent className="px-6 pb-8 pt-2">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                {/* Campo de Usuário */}
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-medium">
                    Usuário
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    autoComplete="username"
                    placeholder="Digite seu usuário"
                    aria-invalid={!!errors.username}
                    aria-describedby={errors.username ? 'username-error' : undefined}
                    disabled={isLoading}
                    className="h-11 text-base transition-shadow focus:shadow-md"
                    {...register('username')}
                  />
                  {errors.username && (
                    <p
                      id="username-error"
                      className="text-sm text-destructive flex items-center gap-1"
                    >
                      {errors.username.message}
                    </p>
                  )}
                </div>

                {/* Campo de Senha */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Senha
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Digite sua senha"
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? 'password-error' : undefined}
                    disabled={isLoading}
                    className="h-11 text-base transition-shadow focus:shadow-md"
                    {...register('password')}
                  />
                  {errors.password && (
                    <p id="password-error" className="text-sm text-destructive flex items-center gap-1">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                {/* Mensagem de erro de login */}
                {Boolean(loginError) && (
                  <div
                    role="alert"
                    className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                  >
                    Não foi possível realizar o login. Verifique suas credenciais e tente novamente.
                  </div>
                )}

                {/* Botões de ação */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button
                    type="submit"
                    size="lg"
                    className="flex-1 h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                    disabled={isLoading}
                  >
                    {isLoading && (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
                    )}
                    <span>{isLoading ? 'Entrando...' : 'Entrar'}</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="flex-1 h-12 text-base font-semibold border-2 border-primary/30 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 hover:from-primary/10 hover:via-primary/20 hover:to-primary/10 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 group text-primary hover:text-primary"
                    onClick={() => setFaceIdModalOpen(true)}
                    disabled={isLoading}
                  >
                    <ScanFace className="mr-2 h-5 w-5 text-primary group-hover:scale-110 transition-transform duration-300" aria-hidden="true" />
                    <span className="text-primary">Face ID</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Rodapé com informações adicionais */}
          <p className="text-center text-sm text-muted-foreground">
            Acesso restrito a usuários autorizados.
          </p>
        </div>
      </section>

      {/* Modal de Face ID */}
      <FaceIdModal
        open={faceIdModalOpen}
        onOpenChange={setFaceIdModalOpen}
      />
    </div>
  )
}
