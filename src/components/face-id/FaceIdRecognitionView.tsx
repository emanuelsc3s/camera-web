import { AlertCircle, BadgeCheck, ScanFace } from 'lucide-react'
import { FaceIdWebcamView } from '@/components/face-id/FaceIdWebcamView'
import {
  type DetectionBox,
  type FaceIdUser,
  type RecognitionStatus,
} from '@/types/faceId'

interface FaceIdRecognitionViewProps {
  status: RecognitionStatus
  boxes: DetectionBox[]
  recognizedUser: FaceIdUser | null
  usersCount: number
  isLoading: boolean
  onFrameProcess: (video: HTMLVideoElement) => void
  onReset: () => void
  onCameraError?: (message: string) => void
}

const statusMap: Record<RecognitionStatus, string> = {
  idle: 'Aguardando rosto...',
  detecting: 'Analisando rosto...',
  recognized: 'Usuário reconhecido',
  unknown: 'Rosto não cadastrado',
  error: 'Erro no reconhecimento',
}

export function FaceIdRecognitionView({
  status,
  boxes,
  recognizedUser,
  usersCount,
  isLoading,
  onFrameProcess,
  onReset,
  onCameraError,
}: FaceIdRecognitionViewProps) {
  const canRecognize = usersCount > 0

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <ScanFace className="h-4 w-4" />
        <span>
          {canRecognize
            ? 'Mantenha o rosto centralizado para iniciar o reconhecimento.'
            : 'Cadastre pelo menos um rosto para habilitar o login por Face ID.'}
        </span>
      </div>

      <FaceIdWebcamView
        mode="recognize"
        boxes={boxes}
        onFrameProcess={canRecognize ? onFrameProcess : undefined}
        onCameraError={onCameraError}
      />

      <div className="rounded-md border bg-muted/40 px-3 py-3 text-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {status === 'recognized' ? (
              <BadgeCheck className="h-5 w-5 text-emerald-500" />
            ) : status === 'unknown' || status === 'error' ? (
              <AlertCircle className="h-5 w-5 text-destructive" />
            ) : (
              <ScanFace className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <p className="font-medium leading-tight">{statusMap[status]}</p>
              {!canRecognize && (
                <p className="text-xs text-muted-foreground">
                  Nenhum usuário cadastrado para reconhecimento.
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onReset}
            disabled={isLoading}
            className="text-xs font-medium text-primary underline-offset-2 hover:underline disabled:text-muted-foreground"
          >
            Reiniciar
          </button>
        </div>

        {recognizedUser && (
          <div className="mt-3 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2">
            <p className="text-xs uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
              Reconhecido
            </p>
            <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
              {recognizedUser.name}
            </p>
            {recognizedUser.matricula && (
              <p className="text-xs text-emerald-800/80 dark:text-emerald-200/80">
                Matrícula: {recognizedUser.matricula}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
