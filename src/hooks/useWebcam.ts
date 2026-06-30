import { useState, useEffect, useRef, useCallback } from 'react'
import {
  ensureCameraApiSupport,
  getCameraErrorMessage,
  isCameraApiUnsupportedError,
} from '@/lib/cameraSupport'

interface WebcamDevice {
  deviceId: string
  label: string
}

type ResolutionMode = 'auto' | 'fullhd' | 'max'

interface UseWebcamReturn {
  videoRef: React.RefObject<HTMLVideoElement>
  canvasRef: React.RefObject<HTMLCanvasElement>
  stream: MediaStream | null
  devices: WebcamDevice[]
  selectedDeviceId: string | null
  isLoading: boolean
  error: string | null
  isStreamActive: boolean
  resolutionMode: ResolutionMode
  setResolutionMode: (mode: ResolutionMode) => Promise<void>
  startCamera: (deviceId?: string) => Promise<void>
  stopCamera: () => void
  capturePhoto: () => string | null
  switchCamera: (deviceId: string) => Promise<void>
  retryCamera: () => Promise<void>
}

// Configurações de fallback progressivo
const CAMERA_CONSTRAINTS = [
  // Primeira tentativa - qualidade ideal
  {
    video: {
      width: { ideal: 640 },
      height: { ideal: 480 },
      frameRate: { ideal: 30 }
    }
  },
  // Segunda tentativa - qualidade média
  {
    video: {
      width: { ideal: 320 },
      height: { ideal: 240 },
      frameRate: { ideal: 15 }
    }
  },
  // Terceira tentativa - sem restrições específicas
  {
    video: true
  }
]

// Utilitário para aguardar um delay
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Backoff exponencial com jitter leve para retries de NotReadableError
const backoffDelay = (attempt: number, base = 500, cap = 4000) => {
  const exp = Math.min(cap, base * Math.pow(2, attempt))
  const jitter = Math.floor(Math.random() * 250)
  return exp + jitter
}


export function useWebcam(): UseWebcamReturn {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [devices, setDevices] = useState<WebcamDevice[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('camera.selectedDeviceId') || null
    } catch {
      return null
    }
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isStreamActive, setIsStreamActive] = useState(false)
  // Preferência de resolução
  const [resolutionMode, _setResolutionMode] = useState<ResolutionMode>(() => {
    try {
      return (localStorage.getItem('camera.resolutionMode') as ResolutionMode) || 'fullhd'
    } catch {
      return 'fullhd'
    }
  })

  const startSeqRef = useRef(0)
  const selectedDeviceIdRef = useRef<string | null>(selectedDeviceId)
  useEffect(() => {
    selectedDeviceIdRef.current = selectedDeviceId
  }, [selectedDeviceId])


  // Log de debug (silenciado)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const debugLog = useCallback((..._args: unknown[]) => {
    // silenciado conforme solicitado
  }, [])


  // Registro de tentativas para feedback ao usuário
  const attemptSummaryRef = useRef<string[]>([])
  const resetAttemptLog = useCallback(() => {
    attemptSummaryRef.current = []
  }, [])

  const logAttempt = useCallback((msg: string) => {
    attemptSummaryRef.current.push(msg)
    debugLog()
  }, [debugLog])

  // Listar dispositivos de câmera disponíveis
  const getDevices = useCallback(async () => {
    const support = ensureCameraApiSupport()
    if (!support.supported) {
      const message = support.message ?? getCameraErrorMessage(new Error('getUserMedia is not implemented'))
      setDevices([])
      setError(message)
      return []
    }

    try {
      debugLog('Listando dispositivos disponíveis...')
      const mediaDevices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = mediaDevices
        .filter(device => device.kind === 'videoinput')
        .map((device, index) => ({
          deviceId: device.deviceId,
          label: device.label || `Câmera ${index + 1}`
        }))

      debugLog('Dispositivos encontrados:', videoDevices)
      setDevices(videoDevices)
      return videoDevices
    } catch (err) {
      debugLog('Erro ao listar dispositivos:', err)
      console.error('Erro ao listar dispositivos:', err)
      setError(getCameraErrorMessage(err))
      return []
    }
  }, [debugLog])

  // Parar stream e limpar recursos
  const cleanupStream = useCallback(() => {
    debugLog('Limpando recursos do stream...')
    const current = streamRef.current

    if (current) {
      current.getTracks().forEach(track => {
        track.stop()
        debugLog(`Track parado: ${track.kind}`)
      })
    }
    streamRef.current = null
    setStream(null)

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setIsStreamActive(false)
  }, [debugLog])

  // Atualiza a resolução no track atual (se existir) e salva preferência
  const setResolutionMode = useCallback(async (mode: ResolutionMode) => {
    debugLog('Alterando modo de resolução...', { mode })
    _setResolutionMode(mode)
    try {
      localStorage.setItem('camera.resolutionMode', mode)
    } catch {
      // Falha ao salvar preferência no localStorage
    }


    const current = streamRef.current
    const track = current?.getVideoTracks()[0]
    if (!track) return

    try {
      if (mode === 'fullhd') {
        await track.applyConstraints({ width: { ideal: 1920 }, height: { ideal: 1080 } })
      } else if (mode === 'max') {
        interface VideoCapabilities {
          width?: { max?: number }
          height?: { max?: number }
        }

        const trackWithCapabilities = track as MediaStreamTrack & {
          getCapabilities?: () => VideoCapabilities
        }

        const caps = trackWithCapabilities.getCapabilities ? trackWithCapabilities.getCapabilities() : undefined
        if (caps?.width?.max && caps?.height?.max) {
          await track.applyConstraints({ width: caps.width.max, height: caps.height.max })
        }
      } else {
        // volta para automático (sem forçar dimensões específicas)
        await track.applyConstraints({})
      }
      debugLog('Resolução aplicada com sucesso ao stream atual')
    } catch (e) {
      debugLog('Falha ao aplicar resolução ao stream atual', e)
    }
  }, [debugLog])


  // Tentar com diferentes câmeras se a atual falhar
  const tryWithDifferentCameras = useCallback(async (excludeDeviceId?: string): Promise<MediaStream> => {
    const availableDevices = devices.filter(device => device.deviceId !== excludeDeviceId)

    for (const device of availableDevices) {
      try {
        logAttempt(`Tentando câmera alternativa: ${device.label}`)
        const constraints = { video: { deviceId: { ideal: device.deviceId } } }
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
        logAttempt(`✅ Sucesso com câmera alternativa: ${device.label}`)
        return mediaStream
      } catch (err) {
        const error = err as Error & { name?: string }
        logAttempt(`Falha com câmera ${device.label}: ${error?.name || 'Erro desconhecido'}`)
        debugLog(`Falha com câmera ${device.label}:`, err)
        continue
      }
    }

    throw new Error('Todas as câmeras falharam')
  }, [devices, debugLog, logAttempt])

  // Tentar todas as câmeras disponíveis
  const tryAllCameras = useCallback(async (): Promise<MediaStream> => {
    resetAttemptLog()
    logAttempt(`Buscando câmera disponível (${devices.length} detectada${devices.length !== 1 ? 's' : ''})...`)

    debugLog(`Tentando todas as ${devices.length} câmeras disponíveis...`)

    for (let i = 0; i < devices.length; i++) {
      const device = devices[i]
      logAttempt(`Testando ${device.label}`)

      debugLog(`Testando câmera ${i + 1}/${devices.length}: ${device.label}`)

      // Tentar com constraints progressivos para esta câmera
      for (let constraintIndex = 0; constraintIndex < CAMERA_CONSTRAINTS.length; constraintIndex++) {
        const baseConstraints = CAMERA_CONSTRAINTS[constraintIndex]
        const constraints = {
          ...baseConstraints,
          video: typeof baseConstraints.video === 'object' ? {
            ...baseConstraints.video,
            deviceId: { ideal: device.deviceId }
          } : { deviceId: { ideal: device.deviceId } }
        }

        try {
          debugLog(`  Tentando constraint ${constraintIndex + 1} para ${device.label}:`, constraints)
          const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
          debugLog(`✅ Sucesso com ${device.label}!`)
          logAttempt(`✅ Sucesso com ${device.label}`)
          return mediaStream
        } catch (err) {
          const error = err as Error & { name?: string }
          debugLog(`  Falha constraint ${constraintIndex + 1} para ${device.label}:`, err)
          logAttempt(`Falha (${error?.name || 'Erro'}) em ${device.label} [tentativa ${constraintIndex + 1}]`)

          // Para NotReadableError, aguardar antes da próxima tentativa com backoff exponencial + jitter
          if (err instanceof Error && err.name === 'NotReadableError') {
            const delay = backoffDelay(constraintIndex)
            debugLog(`  Aguardando ${Math.round(delay/100)/10}s antes da próxima tentativa...`)
            await sleep(delay)
          }
        }
      }
    }

    throw new Error(`Todas as ${devices.length} câmeras falharam com todos os constraints`)
  }, [devices, debugLog, logAttempt, resetAttemptLog])

  // Tentar inicializar stream com configurações progressivas
  const tryGetUserMedia = useCallback(async (deviceId?: string, retryCount = 0): Promise<MediaStream> => {
    // Se não especificou deviceId
    if (!deviceId) {
      if (devices.length > 0) {
        // Já temos lista de dispositivos - tentar todas as câmeras
        logAttempt('Nenhuma câmera específica selecionada; tentando todas as câmeras disponíveis...')
        debugLog('Nenhuma câmera específica, tentando todas...')
        return tryAllCameras()
      } else {
        // Dispositivos ainda não enumerados - solicitar acesso genérico para destravar permissões
        const baseConstraints = CAMERA_CONSTRAINTS[Math.min(retryCount, CAMERA_CONSTRAINTS.length - 1)]
        const genericConstraints: MediaStreamConstraints =
          typeof baseConstraints.video === 'object'
            ? { video: { ...(baseConstraints.video as Record<string, unknown>) } }
            : { video: true }

        debugLog(`Tentativa ${retryCount + 1}/${CAMERA_CONSTRAINTS.length} com constraints genéricos:`, genericConstraints)
        try {
          const mediaStream = await navigator.mediaDevices.getUserMedia(genericConstraints)
          debugLog(`Sucesso na tentativa ${retryCount + 1}`)
          return mediaStream
        } catch (err) {
          debugLog(`Falha na tentativa ${retryCount + 1}:`, err)
          if (err instanceof Error && err.name === 'NotReadableError') {
            const delay = backoffDelay(retryCount)
            debugLog(`NotReadableError detectado, aguardando ${Math.round(delay/100)/10} segundos...`)
            await sleep(delay)
            // Após aguardar, tentar enumerar dispositivos e buscar alternativas
            const freshDevices = await getDevices()
            if (freshDevices.length > 0) {
              logAttempt('Câmera padrão ocupada. Tentando alternativas automaticamente...')
              try {
                return await tryAllCameras()
              } catch {
                // Se todas alternativas também falharem, continua o fluxo de retry abaixo
              }
            }
          }
          if (retryCount + 1 < CAMERA_CONSTRAINTS.length) {
            return tryGetUserMedia(undefined, retryCount + 1)
          }
          throw err as Error
        }
      }
    }

    const maxRetries = CAMERA_CONSTRAINTS.length

    if (retryCount >= maxRetries) {
      // Se chegou ao limite com a câmera específica, tentar outras câmeras
      if (devices.length > 1 && deviceId) {
        debugLog('Limite atingido, tentando câmeras alternativas...')
        return tryWithDifferentCameras(deviceId)
      }
      throw new Error('Todas as tentativas de acesso à câmera falharam')
    }

    const baseConstraints = CAMERA_CONSTRAINTS[retryCount]
    const videoConstraintsBase = (typeof baseConstraints.video === 'object') ? { ...baseConstraints.video } : {}

    // Se o modo for FULL HD, força ideal 1920x1080 ao solicitar o stream
    if (resolutionMode === 'fullhd') {
      (videoConstraintsBase as Record<string, unknown>).width = { ideal: 1920 }
      ;(videoConstraintsBase as Record<string, unknown>).height = { ideal: 1080 }
    }

    const constraints: MediaStreamConstraints = {
      video: {
        ...(videoConstraintsBase as Record<string, unknown>),
        deviceId: { ideal: deviceId }
      }
    }

    debugLog(`Tentativa ${retryCount + 1}/${maxRetries} com constraints:`, constraints)

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      debugLog(`Sucesso na tentativa ${retryCount + 1}`)
      return mediaStream
    } catch (err) {
      debugLog(`Falha na tentativa ${retryCount + 1}:`, err)

      // Para NotReadableError, aumentar o delay progressivamente e tentar alternativas
      if (err instanceof Error && err.name === 'NotReadableError') {
        const delay = backoffDelay(retryCount) // backoff com jitter
        debugLog(`NotReadableError detectado, aguardando ${Math.round(delay/100)/10} segundos...`)
        await sleep(delay)

        // Antes de insistir na mesma câmera, tente outras automaticamente
        if (devices.length > 1 && deviceId) {
          try {
            const failingLabel = devices.find(d => d.deviceId === deviceId)?.label || 'câmera selecionada'
            logAttempt(`Câmera ocupada (${failingLabel}). Tentando alternativas...`)
            const altStream = await tryWithDifferentCameras(deviceId)
            return altStream
          } catch {
            // Se alternativas também falharem, continua o retry normal
          }
        }
      }

      return tryGetUserMedia(deviceId, retryCount + 1)
    }
  }, [debugLog, devices, tryWithDifferentCameras, tryAllCameras, resolutionMode, getDevices, logAttempt])

  // Iniciar câmera com retry inteligente (à prova de chamadas simultâneas/StrictMode)
  const startCamera = useCallback(async (deviceId?: string) => {
    debugLog('Iniciando câmera...', { deviceId })
    const mySeq = ++startSeqRef.current
    setIsLoading(true)
    setError(null)
    resetAttemptLog()

    const support = ensureCameraApiSupport()
    if (!support.supported) {
      setError(support.message ?? getCameraErrorMessage(new Error('getUserMedia is not implemented')))
      setIsLoading(false)
      cleanupStream()
      return
    }

    // Respeita preferência persistida quando nenhum deviceId é passado
    const desiredDeviceId = deviceId ?? selectedDeviceIdRef.current ?? undefined

    // Se já existe um stream ativo com o mesmo device, evita reiniciar
    const currentTrackDeviceId = streamRef.current?.getVideoTracks()[0]?.getSettings().deviceId
    if (streamRef.current && (!desiredDeviceId || desiredDeviceId === currentTrackDeviceId)) {
      debugLog('Stream já ativo com o mesmo dispositivo, ignorando start.')
      setIsLoading(false)
      return
    }

    try {
      // Limpar recursos anteriores
      cleanupStream()

      // Pequeno intervalo para garantir liberação de recursos do SO
      await sleep(200)

      // Tentar obter stream com fallback progressivo
      const mediaStream = await tryGetUserMedia(desiredDeviceId)

      // Se durante a espera outra inicialização começou, descarta este stream
      if (startSeqRef.current !== mySeq) {
        mediaStream.getTracks().forEach(t => t.stop())
        debugLog('Inicialização obsoleta descartada (antes de anexar ao vídeo)')
        return
      }

      // Aplicar preferência de resolução ao track antes de vincular ao vídeo
      try {
        const track = mediaStream.getVideoTracks()[0]
        if (resolutionMode === 'fullhd') {
          await track.applyConstraints({ width: { ideal: 1920 }, height: { ideal: 1080 } })
        } else if (resolutionMode === 'max') {
          interface VideoCapabilities {
            width?: { max?: number }
            height?: { max?: number }
          }

          const trackWithCapabilities = track as MediaStreamTrack & {
            getCapabilities?: () => VideoCapabilities
          }

          const caps = trackWithCapabilities.getCapabilities ? trackWithCapabilities.getCapabilities() : undefined
          if (caps?.width?.max && caps?.height?.max) {
            await track.applyConstraints({ width: caps.width.max, height: caps.height.max })
          }
        }
      } catch (e) {
        debugLog('Falha ao aplicar resolução na inicialização', e)
      }

      // Conectar stream ao elemento de vídeo
      if (videoRef.current) {
        const video = videoRef.current
        try {
          video.pause()
        } catch {
          // Falha ao pausar vídeo (pode não estar reproduzindo)
        }
        video.srcObject = null
        video.srcObject = mediaStream

        // Aguardar o vídeo estar pronto
        await new Promise<void>((resolve, reject) => {
          const onLoadedMetadata = () => {
            debugLog('Vídeo carregado com sucesso', {
              width: video.videoWidth,
              height: video.videoHeight
            })
            video.removeEventListener('loadedmetadata', onLoadedMetadata)
            video.removeEventListener('error', onError)
            resolve()
          }

          const onError = (e: Event) => {
            debugLog('Erro ao carregar vídeo:', e)
            video.removeEventListener('loadedmetadata', onLoadedMetadata)
            video.removeEventListener('error', onError)
            reject(new Error('Erro ao carregar stream de vídeo'))
          }

          video.addEventListener('loadedmetadata', onLoadedMetadata)
          video.addEventListener('error', onError)

          video.play().then(resolve).catch(playErr => {
            debugLog('Erro ao reproduzir vídeo:', playErr)
            // Se uma nova carga foi iniciada (StrictMode/duas chamadas), ignore AbortError
            const error = playErr as Error & { name?: string; code?: number }
            const name = error?.name
            if (name === 'AbortError' || error?.code === 20) {
              if (startSeqRef.current !== mySeq) {
                resolve()
                return
              }
            }
            reject(playErr)
          })
        })
      }

      // Se durante o carregamento outra inicialização começou, descarta este stream
      if (startSeqRef.current !== mySeq) {
        mediaStream.getTracks().forEach(t => t.stop())
        debugLog('Inicialização obsoleta descartada (após play)')
        return
      }

      // Configurar estado
      streamRef.current = mediaStream
      setStream(mediaStream)
      const actualDeviceId = mediaStream.getVideoTracks()[0]?.getSettings().deviceId
      setSelectedDeviceId(desiredDeviceId || actualDeviceId || null)

      // Persistir dispositivo selecionado
      try {
        localStorage.setItem('camera.selectedDeviceId', (actualDeviceId || desiredDeviceId || '') as string)
      } catch {
        // Falha ao salvar dispositivo no localStorage
      }

      setIsStreamActive(true)

      debugLog('Câmera iniciada com sucesso!', {
        selectedDevice: actualDeviceId,
        tracks: mediaStream.getTracks().length
      })

      // Atualizar lista de dispositivos após obter permissões
      await getDevices()

    } catch (err) {
      const error = err as Error & { name?: string; message?: string }
      debugLog('Erro final ao iniciar câmera:', err)
      console.error('Erro ao acessar webcam:', err)

      // Se a chamada atual for obsoleta, não apresente erro ao usuário
      if (error?.name === 'AbortError' && startSeqRef.current !== mySeq) {
        return
      }

      let errorMessage = 'Erro ao acessar a webcam'
      const attempts = attemptSummaryRef.current
      const attemptsText = attempts.length ? `\n\nTentativas realizadas:\n• ${attempts.slice(0, 8).join('\n• ')}` : ''

      if (error instanceof Error) {
        if (isCameraApiUnsupportedError(error) || !ensureCameraApiSupport().supported) {
          errorMessage = getCameraErrorMessage(error)
        } else {
          switch (error.name) {
            case 'NotAllowedError':
              errorMessage = 'Acesso à webcam negado. Clique no ícone da câmera na barra de endereços e permita o acesso.'
              break
            case 'NotFoundError':
              errorMessage = 'Nenhuma webcam encontrada. Verifique se há uma câmera conectada.'
              break
            case 'NotReadableError': {
              const failingLabel = desiredDeviceId ? (devices.find(d => d.deviceId === desiredDeviceId)?.label || null) : null
              errorMessage = `Não foi possível acessar a câmera${failingLabel ? ` (${failingLabel})` : ''} porque ela parece estar ocupada por outro aplicativo.

Ações automáticas realizadas:
• ${attempts.length ? attempts.join('\n• ') : 'Tentamos reestabelecer o acesso com diferentes configurações e dispositivos'}

O que você pode fazer agora:
• ${devices.length > 1 ? 'Troque para outra câmera nas configurações (botão "Trocar câmera")' : 'Feche aplicativos que possam estar usando a câmera (Teams, Zoom, Skype, etc.)'}
• Clique em "Tentar novamente"
• Verifique as permissões do navegador (ícone da câmera na barra de endereços)`
              break
            }
            case 'OverconstrainedError':
              errorMessage = 'Configurações da câmera não suportadas. Tente uma câmera diferente.'
              break
            default:
              if (error.message?.includes('Todas as tentativas') || error.message?.includes('Todas as câmeras')) {
                errorMessage = `Todas as câmeras falharam.

🔧 Verificações:
• Certifique-se que nenhum outro app está usando a webcam
• Feche completamente outros navegadores
• Reinicie o computador se necessário
• Verifique se a webcam funciona em outros aplicativos

${devices.length} câmera${devices.length > 1 ? 's' : ''} detectada${devices.length > 1 ? 's' : ''}${attemptsText}`
              } else {
                errorMessage = `Erro ao acessar webcam: ${error.message}${attemptsText}`
              }
          }
        }
      }

      setError(errorMessage)
      setIsStreamActive(false)
      cleanupStream()
    } finally {
      setIsLoading(false)
    }
  }, [cleanupStream, tryGetUserMedia, getDevices, debugLog, devices, resolutionMode, resetAttemptLog])

  // Parar câmera
  const stopCamera = useCallback(() => {
    debugLog('Parando câmera...')
    cleanupStream()
  }, [debugLog, cleanupStream])

  // Capturar foto
  const capturePhoto = useCallback((): string | null => {
    debugLog('Tentando capturar foto...', {
      hasVideo: !!videoRef.current,
      hasCanvas: !!canvasRef.current,
      isStreamActive
    })

    if (!videoRef.current || !canvasRef.current || !isStreamActive) {
      debugLog('Captura cancelada - requisitos não atendidos')
      return null
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) {
      debugLog('Erro: contexto 2d do canvas não disponível')
      return null
    }

    // Verificar se o vídeo tem dimensões válidas
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      debugLog('Erro: vídeo sem dimensões válidas', {
        width: video.videoWidth,
        height: video.videoHeight
      })
      return null
    }

    // Definir dimensões do canvas baseado no vídeo
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    debugLog('Capturando frame...', {
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight
    })

    // Desenhar frame atual do vídeo no canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Converter para data URL (base64)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
    debugLog('Foto capturada com sucesso!', {
      size: Math.round(dataUrl.length / 1024) + 'KB'
    })

    return dataUrl
  }, [isStreamActive, debugLog])

  // Retry camera - útil para tentar novamente após erro
  const retryCamera = useCallback(async () => {
    debugLog('Tentando novamente...')
    await startCamera(selectedDeviceId || undefined)
  }, [startCamera, selectedDeviceId, debugLog])

  // Trocar câmera
  const switchCamera = useCallback(async (deviceId: string) => {
    debugLog('Trocando câmera...', { newDeviceId: deviceId })
    await startCamera(deviceId)
  }, [startCamera, debugLog])

  // Limpar recursos ao desmontar componente
  useEffect(() => {
    return () => {
      debugLog('Componente desmontando, limpando recursos...')
      cleanupStream()
    }
  }, [debugLog, cleanupStream])

  // Carregar dispositivos na inicialização (sem iniciar câmera automaticamente)
  useEffect(() => {
    debugLog('Hook inicializado, carregando dispositivos...')
    getDevices()
  }, [getDevices, debugLog])

  return {
    videoRef,
    canvasRef,
    stream,
    devices,
    selectedDeviceId,
    isLoading,
    error,
    isStreamActive,
    resolutionMode,
    setResolutionMode,
    startCamera,
    stopCamera,
    capturePhoto,
    switchCamera,
    retryCamera
  }
}
