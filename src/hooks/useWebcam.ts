import { useState, useEffect, useRef, useCallback } from 'react'

interface WebcamDevice {
  deviceId: string
  label: string
}

interface UseWebcamReturn {
  videoRef: React.RefObject<HTMLVideoElement>
  canvasRef: React.RefObject<HTMLCanvasElement>
  stream: MediaStream | null
  devices: WebcamDevice[]
  selectedDeviceId: string | null
  isLoading: boolean
  error: string | null
  isStreamActive: boolean
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

export function useWebcam(): UseWebcamReturn {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [devices, setDevices] = useState<WebcamDevice[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isStreamActive, setIsStreamActive] = useState(false)

  // Log de debug
  const debugLog = useCallback((message: string, data?: any) => {
    console.log(`[WebCam] ${message}`, data || '')
  }, [])

  // Listar dispositivos de câmera disponíveis
  const getDevices = useCallback(async () => {
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
      setError('Erro ao listar câmeras disponíveis')
      return []
    }
  }, [debugLog])

  // Parar stream e limpar recursos
  const cleanupStream = useCallback(() => {
    debugLog('Limpando recursos do stream...')
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop()
        debugLog(`Track parado: ${track.kind}`)
      })
      setStream(null)
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    
    setIsStreamActive(false)
  }, [stream, debugLog])

  // Tentar com diferentes câmeras se a atual falhar
  const tryWithDifferentCameras = useCallback(async (excludeDeviceId?: string): Promise<MediaStream> => {
    const availableDevices = devices.filter(device => device.deviceId !== excludeDeviceId)
    
    for (const device of availableDevices) {
      try {
        debugLog(`Tentando câmera alternativa: ${device.label}`)
        const constraints = { video: { deviceId: { exact: device.deviceId } } }
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
        debugLog(`Sucesso com câmera alternativa: ${device.label}`)
        return mediaStream
      } catch (err) {
        debugLog(`Falha com câmera ${device.label}:`, err)
        continue
      }
    }
    
    throw new Error('Todas as câmeras falharam')
  }, [devices, debugLog])

  // Tentar todas as câmeras disponíveis
  const tryAllCameras = useCallback(async (): Promise<MediaStream> => {
    debugLog(`Tentando todas as ${devices.length} câmeras disponíveis...`)
    
    for (let i = 0; i < devices.length; i++) {
      const device = devices[i]
      debugLog(`Testando câmera ${i + 1}/${devices.length}: ${device.label}`)
      
      // Tentar com constraints progressivos para esta câmera
      for (let constraintIndex = 0; constraintIndex < CAMERA_CONSTRAINTS.length; constraintIndex++) {
        const baseConstraints = CAMERA_CONSTRAINTS[constraintIndex]
        const constraints = {
          ...baseConstraints,
          video: typeof baseConstraints.video === 'object' ? {
            ...baseConstraints.video,
            deviceId: { exact: device.deviceId }
          } : { deviceId: { exact: device.deviceId } }
        }

        try {
          debugLog(`  Tentando constraint ${constraintIndex + 1} para ${device.label}:`, constraints)
          const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
          debugLog(`✅ Sucesso com ${device.label}!`)
          return mediaStream
        } catch (err) {
          debugLog(`  Falha constraint ${constraintIndex + 1} para ${device.label}:`, err)
          
          // Para NotReadableError, aguardar antes da próxima tentativa
          if (err instanceof Error && err.name === 'NotReadableError') {
            const delay = 1000 * (constraintIndex + 1) // 1s, 2s, 3s
            debugLog(`  Aguardando ${delay/1000}s antes da próxima tentativa...`)
            await sleep(delay)
          }
        }
      }
    }
    
    throw new Error(`Todas as ${devices.length} câmeras falharam com todos os constraints`)
  }, [devices, debugLog])

  // Tentar inicializar stream com configurações progressivas
  const tryGetUserMedia = useCallback(async (deviceId?: string, retryCount = 0): Promise<MediaStream> => {
    // Se não especificou deviceId, tentar todas as câmeras
    if (!deviceId && devices.length > 0) {
      debugLog('Nenhuma câmera específica, tentando todas...')
      return tryAllCameras()
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
    const constraints = {
      ...baseConstraints,
      video: typeof baseConstraints.video === 'object' ? {
        ...baseConstraints.video,
        deviceId: { exact: deviceId }
      } : { deviceId: { exact: deviceId } }
    }

    debugLog(`Tentativa ${retryCount + 1}/${maxRetries} com constraints:`, constraints)

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      debugLog(`Sucesso na tentativa ${retryCount + 1}`)
      return mediaStream
    } catch (err) {
      debugLog(`Falha na tentativa ${retryCount + 1}:`, err)
      
      // Para NotReadableError, aumentar o delay progressivamente
      if (err instanceof Error && err.name === 'NotReadableError') {
        const delay = (retryCount + 1) * 2000 // 2s, 4s, 6s...
        debugLog(`NotReadableError detectado, aguardando ${delay/1000} segundos...`)
        await sleep(delay)
      }
      
      return tryGetUserMedia(deviceId, retryCount + 1)
    }
  }, [debugLog, devices, tryWithDifferentCameras, tryAllCameras])

  // Iniciar câmera com retry inteligente
  const startCamera = useCallback(async (deviceId?: string) => {
    debugLog('Iniciando câmera...', { deviceId })
    setIsLoading(true)
    setError(null)

    try {
      // Limpar recursos anteriores
      cleanupStream()
      
      // Aguardar um pouco para garantir que recursos foram liberados
      await sleep(500)

      // Tentar obter stream com fallback progressivo
      const mediaStream = await tryGetUserMedia(deviceId)
      
      // Conectar stream ao elemento de vídeo
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        
        // Aguardar o vídeo estar pronto
        await new Promise<void>((resolve, reject) => {
          const video = videoRef.current!
          
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
          
          video.play().catch(playErr => {
            debugLog('Erro ao reproduzir vídeo:', playErr)
            reject(playErr)
          })
        })
      }

      // Configurar estado
      setStream(mediaStream)
      const actualDeviceId = mediaStream.getVideoTracks()[0]?.getSettings().deviceId
      setSelectedDeviceId(deviceId || actualDeviceId || null)
      setIsStreamActive(true)

      debugLog('Câmera iniciada com sucesso!', {
        selectedDevice: actualDeviceId,
        tracks: mediaStream.getTracks().length
      })

      // Atualizar lista de dispositivos após obter permissões
      await getDevices()
      
    } catch (err) {
      debugLog('Erro final ao iniciar câmera:', err)
      console.error('Erro ao acessar webcam:', err)
      
      let errorMessage = 'Erro ao acessar a webcam'
      
      if (err instanceof Error) {
        switch (err.name) {
          case 'NotAllowedError':
            errorMessage = 'Acesso à webcam negado. Clique no ícone da câmera na barra de endereços e permita o acesso.'
            break
          case 'NotFoundError':
            errorMessage = 'Nenhuma webcam encontrada. Verifique se há uma câmera conectada.'
            break
          case 'NotReadableError':
            errorMessage = `Webcam ocupada por outro aplicativo. 
            
🔧 Soluções:
• Feche Chrome, Edge, Teams, Zoom, Skype
• Reinicie o navegador
• Desconecte e reconecte a webcam
• Tente outra câmera se disponível
            
${devices.length > 1 ? '💡 Você tem outras câmeras disponíveis - tente trocar nas configurações' : ''}`
            break
          case 'OverconstrainedError':
            errorMessage = 'Configurações da câmera não suportadas. Tente uma câmera diferente.'
            break
          default:
            if (err.message.includes('Todas as tentativas') || err.message.includes('Todas as câmeras')) {
              errorMessage = `Todas as câmeras falharam. 
              
🔧 Verificações:
• Certifique-se que nenhum outro app está usando a webcam
• Feche completamente outros navegadores
• Reinicie o computador se necessário
• Verifique se a webcam funciona em outros aplicativos
              
${devices.length} câmera${devices.length > 1 ? 's' : ''} detectada${devices.length > 1 ? 's' : ''}`
            } else {
              errorMessage = `Erro ao acessar webcam: ${err.message}`
            }
        }
      }
      
      setError(errorMessage)
      setIsStreamActive(false)
      cleanupStream()
    } finally {
      setIsLoading(false)
    }
  }, [cleanupStream, tryGetUserMedia, getDevices, debugLog])

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
  }, [cleanupStream, debugLog])

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
    startCamera,
    stopCamera,
    capturePhoto,
    switchCamera,
    retryCamera
  }
}