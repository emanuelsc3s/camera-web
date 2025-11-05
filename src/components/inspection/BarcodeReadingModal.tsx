import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle2, XCircle, Barcode, AlertCircle } from 'lucide-react'
import DatamatrixIcon from '@/components/icons/DatamatrixIcon'
import type { InspectionItem } from '@/types/inspection'

interface BarcodeReadingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  barcodeType: InspectionItem | null
  onDecision: (approved: boolean, value: string) => void
}

export default function BarcodeReadingModal({
  open,
  onOpenChange,
  barcodeType,
  onDecision
}: BarcodeReadingModalProps) {
  const [barcodeValue, setBarcodeValue] = useState('')

  // Limpa o input quando o modal abre
  useEffect(() => {
    if (open) {
      setBarcodeValue('')
    }
  }, [open])

  const handleApprove = () => {
    if (barcodeValue.trim()) {
      onDecision(true, barcodeValue.trim())
      onOpenChange(false)
    }
  }

  const handleReject = () => {
    if (barcodeValue.trim()) {
      onDecision(false, barcodeValue.trim())
      onOpenChange(false)
    }
  }

  const getBarcodeLabel = () => {
    if (barcodeType === 'gtin') return 'GTIN'
    if (barcodeType === 'datamatrix') return 'Datamatrix'
    return ''
  }

  const getBarcodeIcon = () => {
    if (barcodeType === 'datamatrix') {
      return <DatamatrixIcon className="w-6 h-6 text-primary" size={24} />
    }
    return <Barcode className="w-5 h-5 text-primary" />
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getBarcodeIcon()}
            Registro de Leitura - {getBarcodeLabel()}
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            Informe o valor lido do código de barras {getBarcodeLabel()}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="barcode-input" className="text-base font-semibold">
              Valor do {getBarcodeLabel()}
            </Label>
            <Input
              id="barcode-input"
              type="text"
              placeholder={`Digite o valor do ${getBarcodeLabel()}`}
              value={barcodeValue}
              onChange={(e) => setBarcodeValue(e.target.value)}
              className="text-base h-12"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && barcodeValue.trim()) {
                  handleApprove()
                }
              }}
            />
          </div>

          <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
            <p>
              <strong>Instruções:</strong> Digite o valor lido do código de barras e escolha uma das opções abaixo.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="destructive"
            onClick={handleReject}
            disabled={!barcodeValue.trim()}
            className="gap-2 min-w-[140px]"
          >
            <XCircle className="w-4 h-4" />
            REPROVAR
          </Button>
          <Button
            type="button"
            onClick={handleApprove}
            disabled={!barcodeValue.trim()}
            className="gap-2 min-w-[140px] bg-green-600 hover:bg-green-700"
          >
            <CheckCircle2 className="w-4 h-4" />
            APROVAR
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

