import { Card } from '@/components/ui/card'

interface ReferenceData {
  op: string
  lote: string
  validade: string
  produto: string
  registroAnvisa: string
  gtin: string
}

interface ReferenceDataCardProps {
  data: ReferenceData
}

export default function ReferenceDataCard({ data }: ReferenceDataCardProps) {
  return (
    <div className="h-full flex flex-col bg-card rounded-lg border shadow-sm overflow-hidden">
      <div className="flex-none border-b bg-muted/50 px-3 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3">
        <h2 className="text-sm sm:text-base font-semibold">Dados de Referência</h2>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Confira estes dados na foto capturada</p>
      </div>

      <div className="flex-1 overflow-y-auto p-2.5 sm:p-3 md:p-4">
        <div className="space-y-2.5 sm:space-y-3 md:space-y-4">
          {/* OP, Lote, Validade */}
          <div className="grid grid-cols-3 gap-2 sm:gap-2.5 md:gap-3">
            <DataField label="OP" value={data.op} />
            <DataField label="Lote" value={data.lote} />
            <DataField label="Validade" value={data.validade} />
          </div>

          {/* Produto */}
          <DataField label="Produto" value={data.produto} fullWidth />

          {/* Registro ANVISA e GTIN */}
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5 md:gap-3">
            <DataField label="Registro ANVISA" value={data.registroAnvisa} />
            <DataField label="GTIN" value={data.gtin} />
          </div>
        </div>
      </div>
    </div>
  )
}

interface DataFieldProps {
  label: string
  value: string
  fullWidth?: boolean
}

function DataField({ label, value, fullWidth = false }: DataFieldProps) {
  return (
    <div className={fullWidth ? 'col-span-full' : ''}>
      <label className="block text-xs sm:text-sm md:text-base font-medium text-muted-foreground mb-1">
        {label}
      </label>
      <div className="rounded-md border bg-muted/30 px-2.5 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base font-medium">
        {value || '-'}
      </div>
    </div>
  )
}

