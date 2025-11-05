import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import ReferenceDataCard from '@/components/inspection/ReferenceDataCard'
import PhotoCaptureModal from '@/components/inspection/PhotoCaptureModal'
import {
  ChevronLeft,
  Search,
  XCircle,
  CheckCircle2,
  Camera
} from 'lucide-react'

// Tipo para os itens de inspeção
type InspectionItem = 'gtin' | 'datamatrix' | 'lote' | 'validade'

// Estado de conformidade: null (não marcado), true (conforme), false (não conforme)
type ConformityState = boolean | null

export default function HomePage() {
  const [lastPhoto, setLastPhoto] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [inspectionStates, setInspectionStates] = useState<Record<InspectionItem, ConformityState>>({
    gtin: null,
    datamatrix: null,
    lote: null,
    validade: null
  })

  // Dados de referência (em produção, viriam de uma API ou contexto)
  const referenceData = {
    op: '12345',
    lote: 'L2024001',
    validade: '12/2025',
    produto: 'Medicamento XYZ 500mg - Caixa com 30 comprimidos',
    registroAnvisa: '1.0234.5678',
    gtin: '7891234567890'
  }

  const handlePhotoConfirmed = (photoDataUrl: string) => {
    setLastPhoto(photoDataUrl)
    toast.success('Foto capturada com sucesso!')
  }

  // Alterna entre: null -> true (conforme) -> false (não conforme) -> null
  const toggleInspectionState = (item: InspectionItem) => {
    setInspectionStates(prev => {
      const currentState = prev[item]
      let newState: ConformityState

      if (currentState === null) {
        newState = true // Conforme
      } else if (currentState === true) {
        newState = false // Não conforme
      } else {
        newState = null // Não marcado
      }

      return { ...prev, [item]: newState }
    })
  }

  const inspectionItems: { key: InspectionItem; label: string }[] = [
    { key: 'gtin', label: 'GTIN' },
    { key: 'datamatrix', label: 'Datamatrix' },
    { key: 'lote', label: 'Impressão do Lote' },
    { key: 'validade', label: 'Impressão da Validade' }
  ]

  return (
    <>
      <div className="h-full flex flex-col">
        {/* Área de conteúdo principal - ocupa espaço disponível */}
        <div className="flex-1 overflow-hidden p-2 sm:p-4">
          <div className="h-full flex flex-col gap-2 sm:gap-3">
            {/* Área de dados de referência e preview - ocupa espaço disponível */}
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3">
              {/* Dados de Referência (lado esquerdo) */}
              <ReferenceDataCard data={referenceData} />

              {/* Preview da foto capturada (lado direito) */}
              <div className="h-full flex flex-col bg-card rounded-lg border shadow-sm overflow-hidden">
                <div className="flex-none border-b bg-muted/50 px-3 sm:px-4 py-2 sm:py-3">
                  <h2 className="text-base font-semibold">Foto Capturada</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {lastPhoto ? 'Confira os dados na imagem' : 'Clique em "Capturar Foto" para iniciar'}
                  </p>
                </div>
                <div className="flex-1 min-h-0 p-2 sm:p-3">
                  <div className="h-full relative bg-muted rounded-lg overflow-hidden">
                    {lastPhoto ? (
                      <img src={lastPhoto} alt="Foto capturada" className="w-full h-full object-contain" />
                    ) : (
                      <div className="relative flex h-full items-center justify-center overflow-hidden">
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/40 via-muted/30 to-background/60" />
                        <div className="pointer-events-none absolute inset-0 rounded-lg border border-dashed border-border/50" />
                        <div className="relative flex flex-col items-center text-center gap-2 px-4">
                          <div className="rounded-full bg-muted p-3 ring-1 ring-border shadow-sm">
                            <Camera className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
                          </div>
                          <p className="text-xs sm:text-sm font-medium text-foreground">Nenhuma foto capturada</p>
                          <p className="text-xs text-muted-foreground hidden sm:block">Clique no botão abaixo para capturar</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Checkboxes de inspeção - altura fixa compacta */}
            <div className="flex-none">
              <div className="bg-card rounded-lg border shadow-sm p-2 sm:p-3">
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {inspectionItems.map(({ key, label }) => {
                    const state = inspectionStates[key]
                    return (
                      <button
                        key={key}
                        onClick={() => toggleInspectionState(key)}
                        className={`
                          relative flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-md border-2 transition-all min-h-[80px] sm:min-h-[90px]
                          ${state === true ? 'border-green-500 bg-green-50 dark:bg-green-950' : ''}
                          ${state === false ? 'border-red-500 bg-red-50 dark:bg-red-950' : ''}
                          ${state === null ? 'border-border hover:border-primary/50' : ''}
                        `}
                      >
                        {/* Ícone à esquerda */}
                        <div className="flex-none">
                          {state === true && (
                            <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 dark:text-green-400" />
                          )}
                          {state === false && (
                            <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 dark:text-red-400" />
                          )}
                          {state === null && (
                            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-muted-foreground/30" />
                          )}
                        </div>

                        {/* Conteúdo à direita */}
                        <div className="flex-1 flex flex-col justify-center gap-1 sm:gap-1.5 min-w-0">
                          {/* Nome do item - alinhado à esquerda */}
                          <div className="text-base font-medium text-left leading-tight">
                            {label}
                          </div>

                          {/* Status APROVADO/REPROVADO - centralizado e BEM MAIOR */}
                          <div className={`
                            text-base sm:text-lg font-extrabold uppercase tracking-wide leading-none text-center
                            ${state === true ? 'text-green-700 dark:text-green-300' : ''}
                            ${state === false ? 'text-red-700 dark:text-red-300' : ''}
                            ${state === null ? 'invisible' : ''}
                          `}>
                            {state === true ? 'APROVADO' : state === false ? 'REPROVADO' : 'PLACEHOLDER'}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer de ações - altura fixa */}
        <footer className="flex-none border-t bg-background">
          <div className="h-14 sm:h-16 flex items-center justify-between px-2 sm:px-4 gap-2">
            <Button variant="outline" size="sm" className="gap-1 sm:gap-2 text-xs sm:text-sm">
              <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">VOLTAR</span>
              <span className="sm:hidden">Voltar</span>
            </Button>

            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1 sm:gap-2 text-xs sm:text-sm"
                onClick={() => setIsModalOpen(true)}
              >
                <Camera className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">CAPTURAR FOTO</span>
                <span className="sm:hidden">Capturar</span>
              </Button>

              <Button
                size="sm"
                className="gap-1 sm:gap-2 text-xs sm:text-sm"
                disabled={!lastPhoto}
              >
                <Search className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">CONSULTAR</span>
                <span className="sm:hidden">Consultar</span>
              </Button>
            </div>
          </div>
        </footer>
      </div>

      {/* Modal de captura de foto */}
      <PhotoCaptureModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onPhotoConfirmed={handlePhotoConfirmed}
      />
    </>
  )
}