
import { Card, CardContent } from '@/components/ui/card'
import { useEffect } from 'react'

import { Button } from '@/components/ui/button'
import { Camera, Play, Square, AlertCircle, RotateCcw } from 'lucide-react'
import { useWebcam } from '@/hooks/useWebcam'
import CameraConfigDialog from './CameraConfigDialog'

interface CameraCardProps {
  onPhotoCapture: (photoDataUrl: string) => void
}

export default function CameraCard({ onPhotoCapture }: CameraCardProps) {
  const {
    videoRef,
    canvasRef,
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
  } = useWebcam()

  const handleCapturePhoto = () => {
    const photoDataUrl = capturePhoto()
    if (photoDataUrl) {
      onPhotoCapture(photoDataUrl)
    }
  }
  // Iniciar a câmera automaticamente ao carregar a página (apenas uma vez)
  useEffect(() => {
    startCamera()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


  const handleStartCamera = () => {
    startCamera()
  }

  return (
    <Card className="w-full">


      <CardContent className="pt-2 space-y-2">
        {/* Container do vídeo */}
        <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
          {error ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
              <AlertCircle className="w-8 h-8 mb-2 text-destructive" />
              <p className="text-sm text-center mb-4">{error}</p>
              <Button
                onClick={retryCamera}
                size="sm"
                variant="outline"
                disabled={isLoading}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Tentar Novamente
              </Button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
                style={{ display: isStreamActive ? 'block' : 'none' }}
              />

              {!isStreamActive && !isLoading && (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <Camera className="w-12 h-12 mb-3 mx-auto opacity-50" />
                    <p className="text-sm mb-3">Câmera desligada</p>
                    <Button
                      onClick={handleStartCamera}
                      size="sm"
                      className="mb-2"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Iniciar Câmera
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Clique para ativar sua webcam
                    </p>
                  </div>
                </div>
              )}

              {isLoading && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-muted-foreground">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3 mx-auto" />
                    <p className="text-sm mb-1">Carregando câmera...</p>
                    <p className="text-xs opacity-70">
                      Aguardando permissões e inicialização
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
          {isStreamActive && (
            <div className="absolute top-2 right-2 flex items-center gap-2 rounded-full bg-black/60 px-2 py-1 backdrop-blur-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-white">Ativa</span>
            </div>
          )}
        </div>

        {/* Canvas oculto para captura */}
        <canvas
          ref={canvasRef}
          className="hidden"
        />

        {/* Botões de controle */}
        <div className="flex gap-2">
          {isStreamActive && (
            <Button
              onClick={stopCamera}
              variant="outline"
              size="sm"
              className="flex-1"
              disabled={isLoading}
            >
              <Square className="w-4 h-4 mr-2" />
              Parar Câmera
            </Button>
          )}

          <CameraConfigDialog
            devices={devices}
            selectedDeviceId={selectedDeviceId}
            resolutionMode={resolutionMode}
            onResolutionChange={setResolutionMode}
            onDeviceChange={switchCamera}
            isLoading={isLoading}
          />
        </div>

        {/* Botão de captura - destaque principal */}
        <Button
          onClick={handleCapturePhoto}
          disabled={!isStreamActive || isLoading}
          className="w-full"
          size="lg"
        >
          <Camera className="w-5 h-5 mr-2" />
          {!isStreamActive ? 'Inicie a câmera para capturar' : 'Capturar Foto'}
        </Button>

        {/* Debug info e informações da câmera */}
        <div className="space-y-1">
          {isStreamActive && selectedDeviceId && (
            <div className="text-xs text-muted-foreground text-center">
              📹 {devices.find(d => d.deviceId === selectedDeviceId)?.label || 'Câmera ativa'}
            </div>
          )}

          {devices.length > 0 && !isStreamActive && (
            <div className="text-xs text-muted-foreground text-center">
              {devices.length} câmera{devices.length > 1 ? 's' : ''} disponível{devices.length > 1 ? 'es' : ''}
            </div>
          )}

          {process.env.NODE_ENV === 'development' && (
            <div className="text-xs text-muted-foreground text-center opacity-50">
              Debug: {isLoading ? 'Carregando' : isStreamActive ? 'Ativa' : 'Desligada'}
              {error && ' | Erro presente'}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
