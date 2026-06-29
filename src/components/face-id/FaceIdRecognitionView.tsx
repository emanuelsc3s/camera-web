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
    <div className="flex-1 flex flex-col gap-2 min-h-0">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ScanFace className="h-3.5 w-3.5" />
        <span>
          {canRecognize
            ? 'Mantenha o rosto centralizado para reconhecimento.'
            : 'Cadastre um rosto para habilitar o login.'}
        </span>
      </div>

      <FaceIdWebcamView
        mode="recognize"
        boxes={boxes}
        onFrameProcess={canRecognize ? onFrameProcess : undefined}
        onCameraError={onCameraError}
      />

      <div className="rounded border bg-muted/40 px-2 py-2 text-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {status === 'recognized' ? (
              <BadgeCheck className="h-4 w-4 text-emerald-500" />
            ) : status === 'unknown' || status === 'error' ? (
              <AlertCircle className="h-4 w-4 text-destructive" />
            ) : (
              <ScanFace className="h-4 w-4 text-muted-foreground" />
            )}
            <div>
              <p className="text-xs font-medium leading-tight">{statusMap[status]}</p>
              {!canRecognize && (
                <p className="text-[10px] text-muted-foreground">
                  Nenhum usuário cadastrado.
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
          <div className="mt-2 rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1.5">
            <p className="text-[10px] uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
              Reconhecido
            </p>
            <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-100">
              {recognizedUser.name}
            </p>
            {recognizedUser.matricula && (
              <p className="text-[10px] text-emerald-800/80 dark:text-emerald-200/80">
                Matrícula: {recognizedUser.matricula}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
