import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import ReferenceDataCard from '@/components/inspection/ReferenceDataCard'
import PhotoCaptureModal from '@/components/inspection/PhotoCaptureModal'
import GabaritoModal from '@/components/inspection/GabaritoModal'
import StatsCard from '@/components/inspection/StatsCard'
import {
  ChevronLeft,
  Search,
  XCircle,
  CheckCircle2,
  Camera,
  Save,
  AlertCircle,
  ClipboardCheck
} from 'lucide-react'
import type { InspectionItem, ConformityState, InspectionRecord, InspectionStatus } from '@/types/inspection'
import { saveInspectionRecord, generateRecordId, formatDateTime } from '@/services/storageService'
import { useInspectionStats } from '@/hooks/useInspectionStats'

export default function HomePage() {
  const navigate = useNavigate()
  const stats = useInspectionStats()
  const [lastPhoto, setLastPhoto] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isGabaritoModalOpen, setIsGabaritoModalOpen] = useState(false)
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [inspectionStates, setInspectionStates] = useState<Record<InspectionItem, ConformityState>>({
    gtin: null,
    datamatrix: null,
    lote: null,
    validade: null
  })

  // Dados de referência (em produção, viriam de uma API ou contexto)
  const referenceData = {
    op: '146728',
    lote: '25L12683',
    validade: '10/27',
    produto: 'SOL. CLORETO DE SODIO 0,9% 500ML - SF',
    registroAnvisa: '1108500010193',
    gtin: '7898166041400'
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

  /**
   * Calcula o status final da inspeção baseado nos itens inspecionados
   * Regra de negócio:
   * - REPROVADO: Se pelo menos um item tiver status false (não conforme)
   * - APROVADO: Somente se todos os itens tiverem status true (conforme)
   */
  const calculateFinalStatus = (states: Record<InspectionItem, ConformityState>): InspectionStatus => {
    const hasRejected = Object.values(states).some(state => state === false)

    if (hasRejected) {
      return 'REPROVADO'
    }

    return 'APROVADO'
  }

  // Abre o modal de confirmação antes de salvar
  const handleSaveInspection = () => {
    // Valida se há foto capturada
    if (!lastPhoto) {
      toast.error('Capture uma foto antes de salvar o registro!')
      return
    }

    // Valida se todos os itens foram inspecionados
    const allInspected = Object.values(inspectionStates).every(state => state !== null)
    if (!allInspected) {
      toast.error('Marque todos os itens de inspeção antes de salvar!')
      return
    }

    // Se passou nas validações, abre o modal de confirmação
    setIsConfirmModalOpen(true)
  }

  // Confirma e salva o registro de inspeção no localStorage
  const handleConfirmSave = () => {
    try {
      const timestamp = Date.now()

      // Calcula o status final baseado nos itens inspecionados
      const statusFinal = calculateFinalStatus(inspectionStates)

      const record: InspectionRecord = {
        id: generateRecordId(),
        timestamp,
        dataHora: formatDateTime(timestamp),
        foto: lastPhoto!, // Garantido que não é null pelas validações
        referenceData,
        inspectionStates,
        statusFinal // Status calculado automaticamente
      }

      const success = saveInspectionRecord(record)

      if (success) {
        toast.success('Registro de inspeção salvo com sucesso!')

        // Limpa o formulário após salvar
        setLastPhoto(null)
        setInspectionStates({
          gtin: null,
          datamatrix: null,
          lote: null,
          validade: null
        })

        // Fecha o modal de confirmação
        setIsConfirmModalOpen(false)
      } else {
        toast.error('Erro ao salvar registro de inspeção')
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error('Erro desconhecido ao salvar registro')
      }
    }
  }

  // Cancela o salvamento e fecha o modal
  const handleCancelSave = () => {
    setIsConfirmModalOpen(false)
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
        <div className="flex-1 overflow-hidden p-2 sm:p-3 md:p-4 lg:p-4">
          <div className="h-full flex flex-col gap-2 sm:gap-2.5 md:gap-3 lg:gap-3">
            {/* Seção de Estatísticas - altura fixa */}
            <div className="flex-none">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5 md:gap-3 lg:gap-3">
                <StatsCard
                  title="Inspecionados"
                  value={stats.total}
                  variant="default"
                />
                <StatsCard
                  title="Aprovados"
                  value={stats.aprovados}
                  variant="success"
                />
                <StatsCard
                  title="Reprovados"
                  value={stats.reprovados}
                  variant="danger"
                />
              </div>
            </div>

            {/* Área de dados de referência e preview - ocupa espaço disponível */}
            <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-2.5 md:gap-3 lg:gap-3">
              {/* Dados de Referência (lado esquerdo) */}
              <ReferenceDataCard data={referenceData} />

              {/* Preview da foto capturada (lado direito) */}
              <div className="h-full flex flex-col bg-card rounded-lg border shadow-sm overflow-hidden">
                <div className="flex-none border-b bg-muted/50 px-3 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3">
                  <h2 className="text-sm sm:text-base font-semibold">Foto Capturada</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {lastPhoto ? 'Confira os dados na imagem' : 'Clique em "Capturar Foto" para iniciar'}
                  </p>
                </div>
                <div className="flex-1 min-h-0 p-2 sm:p-2.5 md:p-3">
                  <div className="h-full relative bg-muted rounded-lg overflow-hidden">
                    {lastPhoto ? (
                      <img src={lastPhoto} alt="Foto capturada" className="w-full h-full object-contain" />
                    ) : (
                      <div className="relative flex h-full items-center justify-center overflow-hidden">
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/40 via-muted/30 to-background/60" />
                        <div className="pointer-events-none absolute inset-0 rounded-lg border border-dashed border-border/50" />
                        <div className="relative flex flex-col items-center text-center gap-2 px-4">
                          <div className="rounded-full bg-muted p-2.5 sm:p-3 ring-1 ring-border shadow-sm">
                            <Camera className="w-5 h-5 sm:w-5 sm:h-5 md:w-6 md:h-6 text-muted-foreground" />
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
              <div className="bg-card rounded-lg border shadow-sm p-2 sm:p-2.5 md:p-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-2.5 md:gap-3">
                  {inspectionItems.map(({ key, label }) => {
                    const state = inspectionStates[key]
                    return (
                      <button
                        key={key}
                        onClick={() => toggleInspectionState(key)}
                        className={`
                          relative flex items-start gap-2 sm:gap-2.5 md:gap-3 p-2 sm:p-2.5 md:p-3 rounded-md border-2 transition-all min-h-[80px] sm:min-h-[85px] md:min-h-[90px]
                          ${state === true ? 'border-green-500 bg-green-50 dark:bg-green-950' : ''}
                          ${state === false ? 'border-red-500 bg-red-50 dark:bg-red-950' : ''}
                          ${state === null ? 'border-border hover:border-primary/50' : ''}
                        `}
                      >
                        {/* Ícone à esquerda */}
                        <div className="flex-none">
                          {state === true && (
                            <CheckCircle2 className="w-5 h-5 sm:w-5 sm:h-5 md:w-6 md:h-6 text-green-600 dark:text-green-400" />
                          )}
                          {state === false && (
                            <XCircle className="w-5 h-5 sm:w-5 sm:h-5 md:w-6 md:h-6 text-red-600 dark:text-red-400" />
                          )}
                          {state === null && (
                            <div className="w-5 h-5 sm:w-5 sm:h-5 md:w-6 md:h-6 rounded-full border-2 border-muted-foreground/30" />
                          )}
                        </div>

                        {/* Conteúdo à direita */}
                        <div className="flex-1 flex flex-col justify-center gap-1 sm:gap-1 md:gap-1.5 min-w-0">
                          {/* Nome do item - alinhado à esquerda */}
                          <div className="text-sm sm:text-sm md:text-base font-medium text-left leading-tight">
                            {label}
                          </div>

                          {/* Status APROVADO/REPROVADO - centralizado e BEM MAIOR */}
                          <div className={`
                            text-sm sm:text-base md:text-lg font-extrabold uppercase tracking-wide leading-none text-center
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
          <div className="h-14 sm:h-15 md:h-16 flex items-center justify-between px-2 sm:px-3 md:px-4 gap-2">
            <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2">
              <Button variant="outline" size="sm" className="gap-1 sm:gap-1.5 md:gap-2 text-xs sm:text-sm">
                <ChevronLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
                <span className="hidden sm:inline">VOLTAR</span>
                <span className="sm:hidden">Voltar</span>
              </Button>

              <Button
                style={{ height: '36px', minWidth: '166px', paddingLeft: '12px', paddingRight: '12px' }}
                className="rounded-md gap-1 sm:gap-1.5 md:gap-2 text-xs sm:text-sm"
                onClick={() => setIsGabaritoModalOpen(true)}
              >
                <ClipboardCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
                <span className="hidden sm:inline">GABARITO</span>
                <span className="sm:hidden">Gabarito</span>
              </Button>
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2">
              <Button
                style={{ height: '36px', minWidth: '166px', paddingLeft: '12px', paddingRight: '12px' }}
                className="rounded-md gap-1 sm:gap-1.5 md:gap-2 text-xs sm:text-sm"
                onClick={() => setIsModalOpen(true)}
              >
                <Camera className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
                <span className="hidden sm:inline">CAPTURAR FOTO</span>
                <span className="sm:hidden">Capturar</span>
              </Button>

              <Button
                variant="secondary"
                style={{ height: '36px', minWidth: '166px', paddingLeft: '12px', paddingRight: '12px' }}
                className="rounded-md gap-1 sm:gap-1.5 md:gap-2 text-xs sm:text-sm"
                onClick={handleSaveInspection}
                disabled={!lastPhoto}
              >
                <Save className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
                <span className="hidden sm:inline">SALVAR</span>
                <span className="sm:hidden">Salvar</span>
              </Button>

              <Button
                style={{ height: '36px', minWidth: '166px', paddingLeft: '12px', paddingRight: '12px' }}
                className="rounded-md gap-1 sm:gap-1.5 md:gap-2 text-xs sm:text-sm"
                onClick={() => navigate('/consulta')}
              >
                <Search className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
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

      {/* Modal de gabarito */}
      <GabaritoModal
        open={isGabaritoModalOpen}
        onOpenChange={setIsGabaritoModalOpen}
      />

      {/* Modal de confirmação de salvamento */}
      <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-primary" />
              Confirmar Salvamento
            </DialogTitle>
            <DialogDescription className="text-lg pt-2 text-gray-700 dark:text-gray-300">
              Deseja salvar este registro de inspeção?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-base text-gray-600 dark:text-gray-400">
              Ao confirmar, todos os dados da inspeção serão salvos e a tela será limpa para uma nova inspeção.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelSave}
              className="gap-2"
            >
              <XCircle className="w-4 h-4" />
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmSave}
              className="gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}