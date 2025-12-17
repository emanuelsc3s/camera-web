import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, ShieldCheck, UserPlus, Users } from 'lucide-react'
import { useFaceId } from '@/hooks/useFaceId'
import { useAuth } from '@/hooks/useAuth'
import { FaceIdRecognitionView } from '@/components/face-id/FaceIdRecognitionView'
import { FaceIdRegisterForm } from '@/components/face-id/FaceIdRegisterForm'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
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

  const requestCameraOnce = useCallback(async () => {
    if (hasRequestedCameraRef.current) return
    await requestCameraPermission()
    hasRequestedCameraRef.current = true
  }, [requestCameraPermission])

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
          username: recognizedUser.matricula || recognizedUser.name,
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
      <DialogContent className="max-w-3xl h-[90vh] p-4 gap-3 flex flex-col overflow-hidden">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
            Face ID
            <span className="text-xs font-normal text-muted-foreground ml-auto">
              Reconhecimento facial
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-1.5">
          <Button
            variant={activeTab === 'login' ? 'default' : 'outline'}
            size="sm"
            className="flex-1 h-8 text-sm"
            onClick={() => setActiveTab('login')}
          >
            Login com Face ID
          </Button>
          <Button
            variant={activeTab === 'register' ? 'default' : 'outline'}
            size="sm"
            className="flex-1 h-8 text-sm"
            onClick={() => setActiveTab('register')}
          >
            <UserPlus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
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

    <div className="flex items-center justify-between rounded border bg-muted/40 px-2 py-1.5 text-xs text-muted-foreground">
      <div className="flex items-center gap-1.5">
        <Users className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{users.length} cadastro(s)</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => void requestCameraPermission()}
          disabled={isRequestingCamera}
        >
          {isRequestingCamera ? 'Aguarde...' : 'Liberar câmera'}
        </Button>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => void wipeUsers()}>
          Limpar dados
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
