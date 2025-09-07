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

interface CameraConfigDialogProps {
  devices: WebcamDevice[]
  selectedDeviceId: string | null
  onDeviceChange: (deviceId: string) => Promise<void>
  isLoading: boolean
}

export default function CameraConfigDialog({
  devices,
  selectedDeviceId,
  onDeviceChange,
  isLoading
}: CameraConfigDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [tempSelectedDevice, setTempSelectedDevice] = useState<string>(
    selectedDeviceId || ''
  )

  const handleApply = async () => {
    if (tempSelectedDevice && tempSelectedDevice !== selectedDeviceId) {
      await onDeviceChange(tempSelectedDevice)
    }
    setIsOpen(false)
  }

  const handleCancel = () => {
    setTempSelectedDevice(selectedDeviceId || '')
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
              disabled={isLoading || !tempSelectedDevice || tempSelectedDevice === selectedDeviceId}
            >
              {isLoading ? 'Aplicando...' : 'Aplicar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}