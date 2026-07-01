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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

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

const passwordChangeSchema = z
  .object({
    newPassword: z
      .string()
      .min(6, 'A senha deve ter pelo menos 6 caracteres')
      .max(128, 'A senha informada é muito longa')
      .regex(/[A-Za-zÀ-ÿ]/u, 'Informe ao menos uma letra')
      .regex(/\d/u, 'Informe ao menos um número')
      .regex(/[^A-Za-zÀ-ÿ0-9]/u, 'Informe ao menos um caractere especial'),
    confirmPassword: z
      .string()
      .min(1, 'Confirme a nova senha')
      .max(128, 'A confirmação informada é muito longa'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas informadas não conferem',
  })

type PasswordChangeFormValues = z.infer<typeof passwordChangeSchema>

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    login,
    changeExpiredPassword,
    clearPasswordExpired,
    isAuthenticated,
    isChangingExpiredPassword,
    isLoading,
    loginError,
    passwordChangeError,
    passwordExpired,
    token,
  } = useAuth()
  const [faceIdModalOpen, setFaceIdModalOpen] = useState(false)
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState<string | null>(null)
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
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  })

  const {
    register: registerPasswordChange,
    handleSubmit: handlePasswordChangeSubmit,
    reset: resetPasswordChangeForm,
    formState: { errors: passwordChangeErrors },
  } = useForm<PasswordChangeFormValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  })

  useEffect(() => {
    if (passwordExpired) {
      resetPasswordChangeForm()
      setPasswordChangeSuccess(null)
    }
  }, [passwordExpired, resetPasswordChangeForm])

  // Envio do formulário de login
  const onSubmit = async (data: LoginFormValues) => {
    setPasswordChangeSuccess(null)
    await login({
      username: data.username,
      password: data.password,
    })
    // Se não houver erro, o AuthProvider já terá atualizado o estado
    // e o useEffect acima fará o redirecionamento
  }

  const onPasswordChangeSubmit = async (data: PasswordChangeFormValues) => {
    try {
      await changeExpiredPassword({
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      })
      resetPasswordChangeForm()
      setPasswordChangeSuccess('Senha alterada com sucesso. Entre novamente usando a nova senha.')
    } catch {
      // O AuthProvider mantém a mensagem de erro para o modal.
    }
  }

  const handlePasswordExpiredOpenChange = (open: boolean) => {
    if (!open && !isChangingExpiredPassword) {
      clearPasswordExpired()
      resetPasswordChangeForm()
    }
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
              Sistema de Inspeção e Controle de Produção Online
            </h1>
            <p className="text-lg text-white/90 leading-relaxed"> 
              Monitoramento em tempo real da linha de produção com tecnologia de <span>Visão Computacional.</span>
            </p>
          </div>
        </div>
      </section>

      {/* Seção de Login */}
      <section
        className="flex-1 flex justify-center items-start p-6 sm:p-8 lg:p-12 bg-background"
        aria-label="Formulário de login"
      >
        <div className="w-full max-w-md h-full flex flex-col">
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

          {/* Logomarca - ocupa espaço flexível e centraliza a imagem */}
          <div className="flex-1 flex items-center justify-center min-h-[120px]">
            <img
              src="/logo-farmace.png"
              alt="Logo Farmace"
              className="h-20 w-auto object-contain"
            />
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
              <form onSubmit={handleLoginSubmit(onSubmit)} className="space-y-5" noValidate>
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
                    aria-invalid={!!loginErrors.username}
                    aria-describedby={loginErrors.username ? 'username-error' : undefined}
                    disabled={isLoading}
                    className="h-11 text-base transition-shadow focus:shadow-md"
                    {...registerLogin('username')}
                  />
                  {loginErrors.username && (
                    <p
                      id="username-error"
                      className="text-sm text-destructive flex items-center gap-1"
                    >
                      {loginErrors.username.message}
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
                    aria-invalid={!!loginErrors.password}
                    aria-describedby={loginErrors.password ? 'password-error' : undefined}
                    disabled={isLoading}
                    className="h-11 text-base transition-shadow focus:shadow-md"
                    {...registerLogin('password')}
                  />
                  {loginErrors.password && (
                    <p id="password-error" className="text-sm text-destructive flex items-center gap-1">
                      {loginErrors.password.message}
                    </p>
                  )}
                </div>

                {Boolean(passwordChangeSuccess) && (
                  <div
                    role="status"
                    className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700"
                  >
                    {passwordChangeSuccess}
                  </div>
                )}

                {/* Mensagem de erro de login */}
                {Boolean(loginError) && (
                  <div
                    role="alert"
                    className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                  >
                    {loginError}
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
        </div>
      </section>

      {/* Modal de Face ID */}
      <FaceIdModal
        open={faceIdModalOpen}
        onOpenChange={setFaceIdModalOpen}
      />

      <Dialog
        open={Boolean(passwordExpired)}
        onOpenChange={handlePasswordExpiredOpenChange}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Senha expirada</DialogTitle>
            <DialogDescription>
              {passwordExpired?.message || 'Informe uma nova senha para continuar.'}
            </DialogDescription>
          </DialogHeader>

          <form
            className="space-y-4"
            onSubmit={handlePasswordChangeSubmit(onPasswordChangeSubmit)}
            noValidate
          >
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-sm font-medium">
                Nova senha
              </Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                disabled={isChangingExpiredPassword}
                aria-invalid={!!passwordChangeErrors.newPassword}
                aria-describedby={passwordChangeErrors.newPassword ? 'new-password-error' : undefined}
                className="h-11 text-base"
                {...registerPasswordChange('newPassword')}
              />
              {passwordChangeErrors.newPassword && (
                <p id="new-password-error" className="text-sm text-destructive">
                  {passwordChangeErrors.newPassword.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirmar nova senha
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                disabled={isChangingExpiredPassword}
                aria-invalid={!!passwordChangeErrors.confirmPassword}
                aria-describedby={passwordChangeErrors.confirmPassword ? 'confirm-password-error' : undefined}
                className="h-11 text-base"
                {...registerPasswordChange('confirmPassword')}
              />
              {passwordChangeErrors.confirmPassword && (
                <p id="confirm-password-error" className="text-sm text-destructive">
                  {passwordChangeErrors.confirmPassword.message}
                </p>
              )}
            </div>

            {Boolean(passwordChangeError) && (
              <div
                role="alert"
                className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                {passwordChangeError}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handlePasswordExpiredOpenChange(false)}
                disabled={isChangingExpiredPassword}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isChangingExpiredPassword}>
                {isChangingExpiredPassword && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                )}
                Alterar senha
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
