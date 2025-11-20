import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, ShieldCheck, UserPlus, Users } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useFaceId } from '@/hooks/useFaceId'
import { FaceIdRecognitionView } from '@/components/face-id/FaceIdRecognitionView'
import { FaceIdRegisterForm } from '@/components/face-id/FaceIdRegisterForm'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FACE_ID_AUTH_TOKEN } from '@/types/faceId'

interface FaceIdModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FaceIdModal({ open, onOpenChange }: FaceIdModalProps) {
  const { login } = useAuth()
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login')
  const {
    isInitialized,
    isLoading,
    mode,
    status,
    users,
    detectedBoxes,
    recognizedUser,
    switchMode,
    resetRecognition,
    processRecognitionFrame,
    registerUser,
    wipeUsers,
  } = useFaceId()

  const loggingRef = useRef(false)
  const hasRequestedCameraRef = useRef(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isRequestingCamera, setIsRequestingCamera] = useState(false)

  const requestCameraOnce = useCallback(async () => {
    if (hasRequestedCameraRef.current) return
    await requestCameraPermission()
    hasRequestedCameraRef.current = true
  }, [])

  const requestCameraPermission = useCallback(async () => {
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setCameraError('Navegador não suporta acesso à câmera.')
        return
      }
      setIsRequestingCamera(true)
      setCameraError(null)
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      stream.getTracks().forEach((track) => track.stop())
      setCameraError(null)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Não foi possível acessar a câmera.'
      setCameraError(message)
      return
    } finally {
      setIsRequestingCamera(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab !== mode) {
      switchMode(activeTab)
    }
  }, [activeTab, mode, switchMode])

  useEffect(() => {
    if (!open) {
      loggingRef.current = false
      resetRecognition()
      setCameraError(null)
      }
  }, [open, resetRecognition])

  useEffect(() => {
    if (open) {
      void requestCameraOnce()
    }
  }, [open, requestCameraOnce])

  useEffect(() => {
    const tryLogin = async () => {
      if (!open) return
      if (loggingRef.current) return
      if (status !== 'recognized' || !recognizedUser) return

      loggingRef.current = true
      try {
        await login({
          emailOrUsername: recognizedUser.matricula || recognizedUser.name,
          password: FACE_ID_AUTH_TOKEN,
          faceIdUser: recognizedUser,
        })
        onOpenChange(false)
      } catch (error) {
        console.error('[FaceID] Erro ao autenticar via Face ID', error)
        loggingRef.current = false
      }
    }

    void tryLogin()
  }, [open, status, recognizedUser, login, onOpenChange])

  const handleRegister = useCallback(
    async (payload: { name: string; matricula?: string; photoUrl: string; descriptor: Float32Array }) => {
      await registerUser(payload)
      setActiveTab('login')
      resetRecognition()
    },
    [registerUser, resetRecognition]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader className="space-y-2">
          <DialogTitle className="flex items-center gap-2 text-2xl font-semibold">
            <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
            Face ID
          </DialogTitle>
          <DialogDescription>
            Use reconhecimento facial para entrar rapidamente ou cadastre um novo rosto.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Button
            variant={activeTab === 'login' ? 'default' : 'outline'}
            className="flex-1"
            onClick={() => setActiveTab('login')}
          >
            Login com Face ID
          </Button>
          <Button
            variant={activeTab === 'register' ? 'default' : 'outline'}
            className="flex-1"
            onClick={() => setActiveTab('register')}
          >
            <UserPlus className="mr-2 h-4 w-4" aria-hidden="true" />
            Cadastrar rosto
          </Button>
        </div>

        {!isInitialized && (
          <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            Preparando ambiente para reconhecimento facial...
          </div>
        )}

    {activeTab === 'login' ? (
      <FaceIdRecognitionView
        status={status}
        boxes={detectedBoxes}
        recognizedUser={recognizedUser}
        isLoading={isLoading}
        usersCount={users.length}
        onFrameProcess={processRecognitionFrame}
        onReset={resetRecognition}
        onCameraError={setCameraError}
      />
    ) : (
      <FaceIdRegisterForm onRegister={handleRegister} />
    )}

    <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4" aria-hidden="true" />
        <span>{users.length} cadastro(s) local</span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => void requestCameraPermission()}
          disabled={isRequestingCamera}
        >
          {isRequestingCamera ? 'Solicitando câmera...' : 'Liberar câmera'}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => void wipeUsers()}>
          Limpar dados do Face ID
        </Button>
      </div>
    </div>

    {cameraError && (
      <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
        <AlertCircle className="mt-[2px] h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          {cameraError}. Verifique se o navegador não bloqueou a câmera para este site e tente
          novamente.
        </span>
      </div>
    )}
  </DialogContent>
</Dialog>
  )
}
