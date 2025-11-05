import { useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Camera, Check, X, RotateCcw } from 'lucide-react'
import { useWebcam } from '@/hooks/useWebcam'

interface PhotoCaptureModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPhotoConfirmed: (photoDataUrl: string) => void
}

export default function PhotoCaptureModal({
  open,
  onOpenChange,
  onPhotoConfirmed
}: PhotoCaptureModalProps) {
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null)
  
  const {
    videoRef,
    canvasRef,
    isLoading,
    error,
    isStreamActive,
    startCamera,
    stopCamera,
    capturePhoto,
    retryCamera
  } = useWebcam()

  // Iniciar câmera quando o modal abre
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setCapturedPhoto(null)
      startCamera()
    } else {
      stopCamera()
      setCapturedPhoto(null)
    }
    onOpenChange(newOpen)
  }

  const handleCapture = () => {
    const photoDataUrl = capturePhoto()
    if (photoDataUrl) {
      setCapturedPhoto(photoDataUrl)
    }
  }

  const handleConfirm = () => {
    if (capturedPhoto) {
      onPhotoConfirmed(capturedPhoto)
      stopCamera()
      setCapturedPhoto(null)
      onOpenChange(false)
    }
  }

  const handleRecapture = () => {
    setCapturedPhoto(null)
  }

  const handleCancel = () => {
    stopCamera()
    setCapturedPhoto(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b">
          <DialogTitle className="text-lg sm:text-xl">
            {capturedPhoto ? 'Confirmar Foto Capturada' : 'Capturar Foto do Produto'}
          </DialogTitle>
        </DialogHeader>

        {/* Área de conteúdo - câmera ou preview */}
        <div className="flex-1 overflow-hidden px-4 sm:px-6 py-4">
          <div className="h-full flex items-center justify-center bg-muted rounded-lg overflow-hidden">
            {capturedPhoto ? (
              // Preview da foto capturada
              <img
                src={capturedPhoto}
                alt="Foto capturada"
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              // Câmera ao vivo
              <div className="relative w-full h-full">
                {error ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
                    <div className="rounded-full bg-destructive/10 p-4 mb-4">
                      <Camera className="w-8 h-8 text-destructive" />
                    </div>
                    <p className="text-sm text-center mb-4 max-w-md">{error}</p>
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
                      className="w-full h-full object-contain"
                      autoPlay
                      playsInline
                      muted
                      style={{ display: isStreamActive ? 'block' : 'none' }}
                    />

                    {!isStreamActive && !isLoading && (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <div className="text-center">
                          <Camera className="w-16 h-16 mb-4 mx-auto opacity-50" />
                          <p className="text-sm mb-4">Câmera desligada</p>
                          <Button onClick={startCamera} size="sm">
                            <Camera className="w-4 h-4 mr-2" />
                            Iniciar Câmera
                          </Button>
                        </div>
                      </div>
                    )}

                    {isLoading && (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center text-muted-foreground">
                          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4 mx-auto" />
                          <p className="text-sm mb-1">Carregando câmera...</p>
                          <p className="text-xs opacity-70">
                            Aguardando permissões e inicialização
                          </p>
                        </div>
                      </div>
                    )}

                    {isStreamActive && (
                      <div className="absolute top-4 right-4 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 backdrop-blur-sm">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-xs text-white font-medium">Câmera Ativa</span>
                      </div>
                    )}
                  </>
                )}

                {/* Canvas oculto para captura */}
                <canvas ref={canvasRef} className="hidden" />
              </div>
            )}
          </div>
        </div>

        {/* Footer com botões de ação */}
        <DialogFooter className="px-4 sm:px-6 pb-4 sm:pb-6 pt-3 border-t">
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {capturedPhoto ? (
              // Botões após captura
              <>
                <Button
                  variant="outline"
                  onClick={handleRecapture}
                  className="w-full sm:w-auto"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Recapturar
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  className="w-full sm:w-auto"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
                <Button
                  onClick={handleConfirm}
                  className="w-full sm:w-auto"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Confirmar Foto
                </Button>
              </>
            ) : (
              // Botões durante captura
              <>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  className="w-full sm:w-auto"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
                <Button
                  onClick={handleCapture}
                  disabled={!isStreamActive || isLoading}
                  className="w-full sm:w-auto"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Capturar Foto
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

