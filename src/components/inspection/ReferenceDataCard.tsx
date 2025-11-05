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
      <div className="flex-none border-b bg-muted/50 px-3 sm:px-4 py-2 sm:py-3">
        <h2 className="text-base font-semibold">Dados de Referência</h2>
        <p className="text-base text-muted-foreground mt-0.5">Confira estes dados na foto capturada</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 sm:p-4">
        <div className="space-y-3 sm:space-y-4">
          {/* OP, Lote, Validade */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <DataField label="OP" value={data.op} />
            <DataField label="Lote" value={data.lote} />
            <DataField label="Validade" value={data.validade} />
          </div>

          {/* Produto */}
          <DataField label="Produto" value={data.produto} fullWidth />

          {/* Registro ANVISA e GTIN */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <DataField label="Registro ANVISA" value={data.registroAnvisa} />
            <DataField label="GTIN" value={data.gtin} />
          </div>

          {/* Informação adicional */}
          <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t">
            <div className="flex items-start gap-2 text-base text-muted-foreground">
              <div className="flex-none mt-0.5">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="flex-1">
                Capture uma foto do produto e marque a conformidade de cada item de inspeção comparando com estes dados de referência.
              </p>
            </div>
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
      <label className="block text-base font-medium text-muted-foreground mb-1">
        {label}
      </label>
      <div className="rounded-md border bg-muted/30 px-3 py-2 text-base font-medium">
        {value || '-'}
      </div>
    </div>
  )
}

