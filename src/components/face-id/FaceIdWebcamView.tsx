import { useCallback, useEffect, useRef, useState } from 'react'
import Webcam from 'react-webcam'
import { FACE_ID_DEFAULTS, type DetectionBox } from '@/types/faceId'

interface FaceIdWebcamViewProps {
  mode: 'register' | 'recognize'
  boxes?: DetectionBox[]
  isProcessing?: boolean
  onCapture?: (imageSrc: string) => void
  onFrameProcess?: (video: HTMLVideoElement) => void
  onCameraError?: (message: string) => void
  onRetry?: () => void
}

const CONSTRAINTS_CHAIN: MediaTrackConstraints[] = [
  {
    width: { ideal: FACE_ID_DEFAULTS.videoWidth },
    height: { ideal: FACE_ID_DEFAULTS.videoHeight },
    frameRate: { ideal: 30 },
    facingMode: 'user',
  },
  {
    width: { ideal: 320 },
    height: { ideal: 240 },
    frameRate: { ideal: 15 },
    facingMode: 'user',
  },
  {},
]

const humanizeCameraError = (err: Error) => {
  if ('name' in err) {
    const name = (err as DOMException).name
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      return 'Permissão de câmera negada ou bloqueada pelo navegador.'
    }
    if (name === 'NotReadableError') {
      return 'Outro app ou aba está usando a câmera. Feche-o e tente novamente.'
    }
    if (name === 'OverconstrainedError') {
      return 'A câmera não suporta a resolução solicitada.'
    }
    if (name === 'NotFoundError') {
      return 'Nenhuma câmera foi encontrada.'
    }
  }
  return 'Não foi possível acessar a câmera. Verifique permissões ou tente novamente.'
}

export function FaceIdWebcamView({
  mode,
  boxes = [],
  isProcessing = false,
  onCapture,
  onFrameProcess,
  onCameraError,
  onRetry,
}: FaceIdWebcamViewProps) {
  const webcamRef = useRef<Webcam>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [constraintsIndex, setConstraintsIndex] = useState(0)
  const [webcamKey, setWebcamKey] = useState(0)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [hasExhaustedFallbacks, setHasExhaustedFallbacks] = useState(false)
  const stopRequestsRef = useRef(false)

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot()
    if (imageSrc && onCapture) {
      onCapture(imageSrc)
    }
  }, [onCapture])

  useEffect(() => {
    let animationFrame: number

    const loop = () => {
      const video = webcamRef.current?.video as HTMLVideoElement | null
      const canvas = canvasRef.current
      if (video && video.readyState === 4 && canvas) {
        if (!video.videoWidth || !video.videoHeight) {
          animationFrame = requestAnimationFrame(loop)
          return
        }

        if (mode === 'recognize' && onFrameProcess) {
          Promise.resolve(onFrameProcess(video)).catch((error) => {
            console.error('[FaceID] Erro ao processar frame da câmera', error)
          })
        }

        const { videoWidth, videoHeight } = video
        if (canvas.width !== videoWidth || canvas.height !== videoHeight) {
          canvas.width = videoWidth
          canvas.height = videoHeight
        }

        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          const validBoxes = boxes.filter(
            (box) =>
              Number.isFinite(box.x) &&
              Number.isFinite(box.y) &&
              Number.isFinite(box.width) &&
              Number.isFinite(box.height)
          )

          validBoxes.forEach((box) => {
            ctx.strokeStyle = box.color
            ctx.lineWidth = 3
            ctx.strokeRect(box.x, box.y, box.width, box.height)

            const label = box.label
            ctx.fillStyle = box.color
            const labelWidth = ctx.measureText(label).width + 10
            ctx.fillRect(box.x, box.y - 24, labelWidth, 22)

            ctx.fillStyle = '#fff'
            ctx.font = 'bold 14px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
            ctx.fillText(label, box.x + 4, box.y - 8)
          })
        }
      }
      animationFrame = requestAnimationFrame(loop)
    }

    animationFrame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animationFrame)
  }, [boxes, mode, onFrameProcess])

  const handleMediaError = useCallback(
    (err: Error) => {
      console.error('[FaceID] Erro ao acessar câmera:', err)
      setCameraReady(false)
      const message = humanizeCameraError(err)
      setCameraError(message)

      const nextIndex = constraintsIndex + 1
      if (nextIndex < CONSTRAINTS_CHAIN.length) {
        setConstraintsIndex(nextIndex)
        setWebcamKey((key) => key + 1)
      } else {
        setHasExhaustedFallbacks(true)
        stopRequestsRef.current = true
      }
      if (onCameraError) onCameraError(err.message)
    },
    [constraintsIndex, onCameraError]
  )

  const handleRetry = useCallback(() => {
    stopRequestsRef.current = false
    setCameraError(null)
    setHasExhaustedFallbacks(false)
    setConstraintsIndex(0)
    setWebcamKey((key) => key + 1)
    if (onRetry) onRetry()
  }, [onRetry])

  return (
    <div className="relative w-full overflow-hidden rounded-lg border bg-black shadow-sm">
      {!cameraReady && (
        <div className="absolute inset-0 z-10 flex items-center justify-center text-sm text-muted-foreground">
          Iniciando câmera...
        </div>
      )}

      <Webcam
        key={webcamKey}
        ref={webcamRef}
        audio={false}
        mirrored
        screenshotFormat="image/jpeg"
        className="aspect-video h-full w-full object-cover"
        videoConstraints={CONSTRAINTS_CHAIN[constraintsIndex]}
        onUserMedia={() => {
          setCameraError(null)
          setCameraReady(true)
        }}
        onUserMediaError={(err) => {
          if (stopRequestsRef.current) return
          handleMediaError(err as Error)
        }}
      />

      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
      />

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-48 w-48 rounded-full border border-white/20 bg-white/5 shadow-[0_0_0_2000px_rgba(0,0,0,0.15)] backdrop-blur-sm" />
      </div>

      {mode === 'register' && (
        <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center">
          <button
            type="button"
            onClick={capture}
            disabled={isProcessing || !cameraReady}
            className="pointer-events-auto inline-flex items-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
          >
            {isProcessing ? 'Processando...' : 'Capturar rosto'}
          </button>
        </div>
      )}

      {cameraError && (
        <div className="absolute left-2 right-2 top-2 z-20 flex flex-col gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <div>
            {cameraError}{' '}
            {hasExhaustedFallbacks
              ? 'Verifique se outro app/aba usa a câmera ou libere permissão nas configurações do site.'
              : 'Conceda acesso à câmera e recarregue se necessário.'}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleRetry}
              className="rounded border border-destructive/40 px-2 py-1 text-destructive hover:bg-destructive/10"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
