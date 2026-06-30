import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import Webcam from 'react-webcam'
import {
  ensureCameraApiSupport,
  getCameraErrorMessage,
  isCameraApiUnsupportedError,
} from '@/lib/cameraSupport'
import { FACE_ID_DEFAULTS, type DetectionBox, type RecognitionStatus } from '@/types/faceId'

interface FaceIdWebcamViewProps {
  mode: 'register' | 'recognize'
  boxes?: DetectionBox[]
  status?: RecognitionStatus
  trackingEnabled?: boolean
  isProcessing?: boolean
  onCapture?: (imageSrc: string) => void
  onFrameProcess?: (video: HTMLVideoElement) => void | Promise<void>
  onCameraError?: (message: string) => void
  onRetry?: () => void
}

const CONSTRAINTS_CHAIN: MediaTrackConstraints[] = [
  {
    width: { ideal: FACE_ID_DEFAULTS.videoWidth },
    height: { ideal: FACE_ID_DEFAULTS.videoHeight },
    frameRate: { ideal: 15 },
    facingMode: 'user',
  },
  {
    width: { ideal: 240 },
    height: { ideal: 180 },
    frameRate: { ideal: 10 },
    facingMode: 'user',
  },
  {},
]

interface Size {
  width: number
  height: number
}

interface TrackedBox extends DetectionBox {
  id: string
  left: number
  top: number
}

const EMPTY_SIZE: Size = { width: 0, height: 0 }

const RECOGNITION_STATUS_COPY: Record<RecognitionStatus, { label: string; dotClassName: string }> = {
  idle: {
    label: 'Buscando rosto',
    dotClassName: 'bg-sky-400 shadow-[0_0_0_3px_rgba(56,189,248,0.22)]',
  },
  detecting: {
    label: 'Analisando face',
    dotClassName: 'bg-amber-300 shadow-[0_0_0_3px_rgba(252,211,77,0.22)]',
  },
  recognized: {
    label: 'Acesso liberado',
    dotClassName: 'bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,0.22)]',
  },
  unknown: {
    label: 'Rosto não cadastrado',
    dotClassName: 'bg-red-400 shadow-[0_0_0_3px_rgba(248,113,113,0.22)]',
  },
  error: {
    label: 'Falha no reconhecimento',
    dotClassName: 'bg-red-400 shadow-[0_0_0_3px_rgba(248,113,113,0.22)]',
  },
}

const isValidBox = (box: DetectionBox): boolean =>
  Number.isFinite(box.x) &&
  Number.isFinite(box.y) &&
  Number.isFinite(box.width) &&
  Number.isFinite(box.height) &&
  box.width > 0 &&
  box.height > 0

export function FaceIdWebcamView({
  mode,
  boxes = [],
  status = 'idle',
  trackingEnabled = true,
  isProcessing = false,
  onCapture,
  onFrameProcess,
  onCameraError,
  onRetry,
}: FaceIdWebcamViewProps) {
  const cameraSupport = ensureCameraApiSupport()
  const containerRef = useRef<HTMLDivElement>(null)
  const webcamRef = useRef<Webcam>(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [constraintsIndex, setConstraintsIndex] = useState(0)
  const [webcamKey, setWebcamKey] = useState(0)
  const [viewportSize, setViewportSize] = useState<Size>(EMPTY_SIZE)
  const [videoSize, setVideoSize] = useState<Size>(EMPTY_SIZE)
  const [cameraError, setCameraError] = useState<string | null>(() =>
    cameraSupport.supported ? null : cameraSupport.message ?? null
  )
  const [hasExhaustedFallbacks, setHasExhaustedFallbacks] = useState(!cameraSupport.supported)
  const stopRequestsRef = useRef(!cameraSupport.supported)
  const modeRef = useRef(mode)
  const onFrameProcessRef = useRef(onFrameProcess)
  const lastFrameProcessTimeRef = useRef(0)
  const isFrameProcessPendingRef = useRef(false)
  const videoSizeRef = useRef(EMPTY_SIZE)

  useEffect(() => {
    modeRef.current = mode
  }, [mode])

  useEffect(() => {
    onFrameProcessRef.current = onFrameProcess
  }, [onFrameProcess])

  useEffect(() => {
    if (cameraSupport.supported) return

    const message = cameraSupport.message ?? getCameraErrorMessage(new Error('getUserMedia is not implemented'))
    setCameraReady(false)
    setCameraError(message)
    setHasExhaustedFallbacks(true)
    stopRequestsRef.current = true
    if (onCameraError) onCameraError(message)
  }, [cameraSupport.message, cameraSupport.supported, onCameraError])

  const updateViewportSize = useCallback(() => {
    const element = containerRef.current
    if (!element) return

    setViewportSize((currentSize) => {
      const nextSize = {
        width: element.clientWidth,
        height: element.clientHeight,
      }

      if (currentSize.width === nextSize.width && currentSize.height === nextSize.height) {
        return currentSize
      }

      return nextSize
    })
  }, [])

  useEffect(() => {
    updateViewportSize()

    const element = containerRef.current
    if (!element) return

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateViewportSize)
      return () => window.removeEventListener('resize', updateViewportSize)
    }

    const observer = new ResizeObserver(updateViewportSize)
    observer.observe(element)

    return () => observer.disconnect()
  }, [updateViewportSize])

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
      if (video && video.readyState === 4) {
        if (!video.videoWidth || !video.videoHeight) {
          animationFrame = requestAnimationFrame(loop)
          return
        }

        const nextVideoSize = {
          width: video.videoWidth,
          height: video.videoHeight,
        }

        if (
          videoSizeRef.current.width !== nextVideoSize.width ||
          videoSizeRef.current.height !== nextVideoSize.height
        ) {
          videoSizeRef.current = nextVideoSize
          setVideoSize(nextVideoSize)
        }

        const now = Date.now()
        const shouldProcessFrame =
          modeRef.current === 'recognize' &&
          onFrameProcessRef.current &&
          !isFrameProcessPendingRef.current &&
          now - lastFrameProcessTimeRef.current >= FACE_ID_DEFAULTS.throttleMs

        if (shouldProcessFrame && onFrameProcessRef.current) {
          isFrameProcessPendingRef.current = true
          lastFrameProcessTimeRef.current = now

          Promise.resolve(onFrameProcessRef.current(video))
            .catch((error) => {
              console.error('[FaceID] Erro ao processar frame da câmera', error)
            })
            .finally(() => {
              isFrameProcessPendingRef.current = false
            })
        }
      }
      animationFrame = requestAnimationFrame(loop)
    }

    animationFrame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animationFrame)
  }, [])

  const handleMediaError = useCallback(
    (err: Error) => {
      console.error('[FaceID] Erro ao acessar câmera:', err)
      setCameraReady(false)
      const message = getCameraErrorMessage(err)
      setCameraError(message)

      const unsupported = isCameraApiUnsupportedError(err) || !ensureCameraApiSupport().supported
      if (unsupported) {
        setHasExhaustedFallbacks(true)
        stopRequestsRef.current = true
        if (onCameraError) onCameraError(message)
        return
      }

      const nextIndex = constraintsIndex + 1
      if (nextIndex < CONSTRAINTS_CHAIN.length) {
        setConstraintsIndex(nextIndex)
        setWebcamKey((key) => key + 1)
      } else {
        setHasExhaustedFallbacks(true)
        stopRequestsRef.current = true
      }
      if (onCameraError) onCameraError(message)
    },
    [constraintsIndex, onCameraError]
  )

  const handleRetry = useCallback(() => {
    const support = ensureCameraApiSupport()
    if (!support.supported) {
      const message = support.message ?? getCameraErrorMessage(new Error('getUserMedia is not implemented'))
      setCameraReady(false)
      setCameraError(message)
      setHasExhaustedFallbacks(true)
      stopRequestsRef.current = true
      if (onCameraError) onCameraError(message)
      return
    }

    stopRequestsRef.current = false
    setCameraError(null)
    setHasExhaustedFallbacks(false)
    setConstraintsIndex(0)
    setWebcamKey((key) => key + 1)
    if (onRetry) onRetry()
  }, [onCameraError, onRetry])

  const trackedBoxes = useMemo<TrackedBox[]>(() => {
    if (!videoSize.width || !videoSize.height || !viewportSize.width || !viewportSize.height) {
      return []
    }

    const scale = Math.max(
      viewportSize.width / videoSize.width,
      viewportSize.height / videoSize.height
    )
    const renderedWidth = videoSize.width * scale
    const renderedHeight = videoSize.height * scale
    const offsetX = (viewportSize.width - renderedWidth) / 2
    const offsetY = (viewportSize.height - renderedHeight) / 2

    return boxes.filter(isValidBox).flatMap((box, index) => {
      const mirroredX = videoSize.width - box.x - box.width
      const left = mirroredX * scale + offsetX
      const top = box.y * scale + offsetY
      const width = box.width * scale
      const height = box.height * scale
      const right = left + width
      const bottom = top + height

      if (right < 0 || bottom < 0 || left > viewportSize.width || top > viewportSize.height) {
        return []
      }

      return [
        {
          ...box,
          id: `${index}-${box.label}`,
          left,
          top,
          width,
          height,
        },
      ]
    })
  }, [boxes, videoSize.height, videoSize.width, viewportSize.height, viewportSize.width])

  const statusCopy = RECOGNITION_STATUS_COPY[status]
  const shouldShowTrackingStatus =
    mode === 'recognize' && trackingEnabled && cameraReady && !cameraError
  const shouldShowGuide =
    cameraReady &&
    !cameraError &&
    trackedBoxes.length === 0 &&
    (mode === 'register' || trackingEnabled)

  return (
    <div
      ref={containerRef}
      className="relative w-full flex-1 min-h-[200px] overflow-hidden rounded-lg border bg-black shadow-sm"
    >
      {!cameraReady && (
        <div className="absolute inset-0 z-10 flex items-center justify-center text-sm text-muted-foreground">
          Iniciando câmera...
        </div>
      )}

      {cameraSupport.supported && (
        <Webcam
          key={webcamKey}
          ref={webcamRef}
          audio={false}
          mirrored
          screenshotFormat="image/jpeg"
          className="h-full w-full object-cover"
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
      )}

      <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
        {shouldShowTrackingStatus && (
          <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full border border-white/20 bg-black/60 px-3 py-1.5 text-[11px] font-medium text-white shadow-sm backdrop-blur-sm">
            <span className={`h-2 w-2 rounded-full ${statusCopy.dotClassName}`} />
            <span>{statusCopy.label}</span>
          </div>
        )}

        {shouldShowGuide && (
          <div className="absolute inset-x-[22%] bottom-[17%] top-[17%] rounded-[28px] border border-white/20">
            <div className="absolute -top-px left-10 right-10 h-px bg-white/40 shadow-[0_0_18px_rgba(255,255,255,0.45)] face-id-scan-line" />
            <span className="absolute left-0 top-0 h-10 w-10 rounded-tl-[28px] border-l-2 border-t-2 border-white/60" />
            <span className="absolute right-0 top-0 h-10 w-10 rounded-tr-[28px] border-r-2 border-t-2 border-white/60" />
            <span className="absolute bottom-0 left-0 h-10 w-10 rounded-bl-[28px] border-b-2 border-l-2 border-white/60" />
            <span className="absolute bottom-0 right-0 h-10 w-10 rounded-br-[28px] border-b-2 border-r-2 border-white/60" />
          </div>
        )}

        {trackedBoxes.map((box) => {
          const trackStyle: CSSProperties = {
            left: box.left,
            top: box.top,
            width: box.width,
            height: box.height,
            color: box.color,
          }
          const cornerStyle: CSSProperties = { borderColor: box.color }
          const labelClassName =
            box.top > 36
              ? 'absolute -top-8 left-0 max-w-full truncate rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-medium text-white shadow-sm backdrop-blur-sm'
              : 'absolute left-2 top-2 max-w-[calc(100%-1rem)] truncate rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-medium text-white shadow-sm backdrop-blur-sm'

          return (
            <div
              key={box.id}
              className="absolute min-h-12 min-w-12 rounded-[18px] transition-[left,top,width,height] duration-150 ease-out"
              style={trackStyle}
            >
              <span
                className="absolute left-0 top-0 h-7 w-7 rounded-tl-[18px] border-l-[3px] border-t-[3px]"
                style={cornerStyle}
              />
              <span
                className="absolute right-0 top-0 h-7 w-7 rounded-tr-[18px] border-r-[3px] border-t-[3px]"
                style={cornerStyle}
              />
              <span
                className="absolute bottom-0 left-0 h-7 w-7 rounded-bl-[18px] border-b-[3px] border-l-[3px]"
                style={cornerStyle}
              />
              <span
                className="absolute bottom-0 right-0 h-7 w-7 rounded-br-[18px] border-b-[3px] border-r-[3px]"
                style={cornerStyle}
              />
              <div
                className={labelClassName}
                style={{ boxShadow: `0 0 0 1px ${box.color}66` }}
              >
                {box.label}
              </div>
            </div>
          )
        })}
      </div>

      {mode === 'register' && (
        <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center">
          <button
            type="button"
            onClick={capture}
            disabled={isProcessing || !cameraReady}
            className="pointer-events-auto inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
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
              ? 'Libere a câmera para esta origem no navegador e clique em tentar novamente.'
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
