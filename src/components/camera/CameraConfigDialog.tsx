import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Settings } from 'lucide-react'

interface WebcamDevice {
  deviceId: string
  label: string
}

type ResolutionMode = 'auto' | 'fullhd' | 'max'

interface CameraConfigDialogProps {
  devices: WebcamDevice[]
  selectedDeviceId: string | null
  resolutionMode: ResolutionMode
  onResolutionChange: (mode: ResolutionMode) => Promise<void>
  onDeviceChange: (deviceId: string) => Promise<void>
  isLoading: boolean
}

export default function CameraConfigDialog({
  devices,
  selectedDeviceId,
  resolutionMode,
  onResolutionChange,
  onDeviceChange,
  isLoading
}: CameraConfigDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [tempSelectedDevice, setTempSelectedDevice] = useState<string>(selectedDeviceId || '')
  const [tempResolutionMode, setTempResolutionMode] = useState<ResolutionMode>(resolutionMode)

  const handleApply = async () => {
    if (tempResolutionMode !== resolutionMode) {
      await onResolutionChange(tempResolutionMode)
    }
    if (tempSelectedDevice && tempSelectedDevice !== selectedDeviceId) {
      await onDeviceChange(tempSelectedDevice)
    }
    setIsOpen(false)
  }

  const handleCancel = () => {
    setTempSelectedDevice(selectedDeviceId || '')
    setTempResolutionMode(resolutionMode)
    setIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          disabled={isLoading}
        >
          <Settings className="w-4 h-4 mr-2" />
          Configurar Câmera
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configurações da Câmera</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label htmlFor="camera-select" className="text-sm font-medium">
              Selecionar Câmera
            </label>

            {devices.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                Nenhuma câmera encontrada
              </div>
            ) : (
              <Select
                value={tempSelectedDevice}
                onValueChange={setTempSelectedDevice}
                disabled={isLoading}
              >
                <SelectTrigger id="camera-select">
                  <SelectValue placeholder="Escolha uma câmera" />
                </SelectTrigger>
                <SelectContent>
                  {devices.map((device) => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="resolution-select" className="text-sm font-medium">
              Resolução
            </label>
            <Select
              value={tempResolutionMode}
              onValueChange={(v) => setTempResolutionMode(v as ResolutionMode)}
              disabled={isLoading}
            >
              <SelectTrigger id="resolution-select">
                <SelectValue placeholder="Escolha a resolução" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Automática</SelectItem>
                <SelectItem value="fullhd">Full HD (1920x1080)</SelectItem>
                <SelectItem value="max">Máxima suportada</SelectItem>
              </SelectContent>
            </Select>
          </div>


          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleApply}
              disabled={isLoading || (!(tempSelectedDevice && tempSelectedDevice !== selectedDeviceId) && tempResolutionMode === resolutionMode)}
            >
              {isLoading ? 'Aplicando...' : 'Aplicar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}