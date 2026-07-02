import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
import BarcodeReadingModal from '@/components/inspection/BarcodeReadingModal'
import StatsCard from '@/components/inspection/StatsCard'
import { useAuth } from '@/hooks/useAuth'
import {
  Search,
  XCircle,
  CheckCircle2,
  Camera,
  Save,
  AlertCircle,
  ClipboardCheck,
  Power,
  Settings
} from 'lucide-react'
import type { InspectionItem, ConformityState } from '@/types/inspection'
import { useInspectionStats } from '@/hooks/useInspectionStats'
import {
  ApiError,
  createInspection,
  getContextoEstacao,
  type ReferenceDataComOpId,
} from '@/services/apiService'

function criarAssinaturaOpAtiva(opAtiva: ReferenceDataComOpId | null): string {
  if (!opAtiva) {
    return 'sem-op'
  }

  return [
    opAtiva.opId ?? '',
    opAtiva.op ?? '',
    opAtiva.lote ?? '',
    opAtiva.validade ?? '',
    opAtiva.produto ?? '',
    opAtiva.registroAnvisa ?? '',
    opAtiva.gtin ?? '',
    opAtiva.linhaProducaoId ?? '',
  ].join('|')
}

export default function HomePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { logout, user } = useAuth()
  const contextoQuery = useQuery({
    queryKey: ['estacao', 'contexto'],
    queryFn: getContextoEstacao,
    retry: false,
    refetchInterval: 5000,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  })
  const opAtiva = contextoQuery.data?.opAtiva ?? null
  const assinaturaOpAtiva = useMemo(() => criarAssinaturaOpAtiva(opAtiva), [opAtiva])
  const assinaturaOpAnteriorRef = useRef<string | null>(null)
  const stats = useInspectionStats(contextoQuery.data?.linhaProducaoId)
  const isAdministrador = String(user?.perfil || '').trim().toUpperCase() === 'ADMINISTRADOR'
  const createInspectionMutation = useMutation({
    mutationFn: createInspection,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inspecoes', 'resumo'] })
      void queryClient.invalidateQueries({ queryKey: ['estacao', 'contexto'] })
    },
  })
  const [lastPhoto, setLastPhoto] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isGabaritoModalOpen, setIsGabaritoModalOpen] = useState(false)
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false)
  const [currentBarcodeType, setCurrentBarcodeType] = useState<InspectionItem | null>(null)
  const [inspectionStates, setInspectionStates] = useState<Record<InspectionItem, ConformityState>>({
    gtin: null,
    datamatrix: null,
    lote: null,
    validade: null
  })

  const temInspecaoEmAndamento = Boolean(lastPhoto) ||
    Object.values(inspectionStates).some((state) => state !== null)

  useEffect(() => {
    if (!contextoQuery.isSuccess) {
      return
    }

    const assinaturaAnterior = assinaturaOpAnteriorRef.current
    assinaturaOpAnteriorRef.current = assinaturaOpAtiva

    if (!assinaturaAnterior || assinaturaAnterior === assinaturaOpAtiva) {
      return
    }

    setIsModalOpen(false)
    setIsBarcodeModalOpen(false)
    setIsConfirmModalOpen(false)
    setCurrentBarcodeType(null)

    if (temInspecaoEmAndamento) {
      clearInspectionForm()
      toast.warning('A OP ativa foi alterada. A inspeção em andamento foi limpa para reiniciar com a OP atual.')
    }
  }, [assinaturaOpAtiva, contextoQuery.isSuccess, temInspecaoEmAndamento])

  const handlePhotoConfirmed = (photoDataUrl: string) => {
    setLastPhoto(photoDataUrl)
    toast.success('Foto capturada com sucesso!')
  }

  // Alterna entre: null -> true (conforme) -> false (não conforme) -> null
  // Para GTIN e Datamatrix, abre o modal de leitura de código de barras
  const toggleInspectionState = (item: InspectionItem) => {
    if (!opAtiva) {
      toast.error('Não há OP ativa para iniciar a inspeção manual.')
      return
    }

    // Se for GTIN ou Datamatrix, abre o modal
    if (item === 'gtin' || item === 'datamatrix') {
      setCurrentBarcodeType(item)
      setIsBarcodeModalOpen(true)
      return
    }

    // Para outros itens, mantém o comportamento de toggle
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

  // Callback para decisão do modal de código de barras
  const handleBarcodeDecision = (approved: boolean, value: string) => {
    if (currentBarcodeType) {
      setInspectionStates(prev => ({
        ...prev,
        [currentBarcodeType]: approved
      }))

      const action = approved ? 'aprovado' : 'reprovado'
      const label = currentBarcodeType === 'gtin' ? 'GTIN' : 'Datamatrix'
      toast.success(`${label} ${action}: ${value}`)
    }
  }

  // Abre o modal de confirmação antes de salvar
  const handleSaveInspection = () => {
    if (!opAtiva) {
      toast.error('Não há OP ativa para salvar a inspeção.')
      return
    }

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

  const clearInspectionForm = () => {
    setLastPhoto(null)
    setInspectionStates({
      gtin: null,
      datamatrix: null,
      lote: null,
      validade: null
    })
  }

  // Confirma e salva o registro de inspeção no backend
  const handleConfirmSave = async () => {
    try {
      if (!opAtiva?.opId) {
        toast.error('A OP ativa não foi carregada corretamente.')
        return
      }

      await createInspectionMutation.mutateAsync({
        opAtivaIdConfirmado: opAtiva.opId,
        fotoBase64: lastPhoto!,
        inspectionStates,
        usuarioId: user?.usuarioId,
        usuario: user?.name,
      })

      toast.success('Registro de inspeção salvo com sucesso!')
      clearInspectionForm()
      setIsConfirmModalOpen(false)
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === 'OP_ATIVA_ALTERADA' || error.code === 'SEM_OP_ATIVA') {
          toast.error(error.message)
          clearInspectionForm()
          setIsConfirmModalOpen(false)
          void contextoQuery.refetch()
          return
        }

        toast.error(error.message)
        return
      }

      toast.error('Erro desconhecido ao salvar registro')
    }
  }

  // Cancela o salvamento e fecha o modal
  const handleCancelSave = () => {
    setIsConfirmModalOpen(false)
  }

  const handleConfirmLogout = () => {
    setIsLogoutModalOpen(false)
    logout()
    navigate('/login', { replace: true })
  }

  const inspectionItems: { key: InspectionItem; label: string }[] = [
    { key: 'gtin', label: 'GTIN' },
    { key: 'datamatrix', label: 'Datamatrix' },
    { key: 'lote', label: 'Impressão do Lote' },
    { key: 'validade', label: 'Impressão da Validade' }
  ]

  const contextoErrorMessage = contextoQuery.error instanceof ApiError
    ? contextoQuery.error.message
    : contextoQuery.error instanceof Error
      ? contextoQuery.error.message
      : null

  const renderReferencePanel = () => {
    if (contextoQuery.isLoading) {
      return (
        <div className="h-full flex flex-col bg-card rounded-lg border shadow-sm overflow-hidden">
          <div className="flex-none border-b bg-muted/50 px-4 py-3">
            <h2 className="text-sm sm:text-base font-semibold">Dados de Referência</h2>
          </div>
          <div className="flex-1 grid place-items-center p-4 text-sm text-muted-foreground">
            Carregando OP ativa...
          </div>
        </div>
      )
    }

    if (contextoErrorMessage) {
      return (
        <div className="h-full flex flex-col bg-card rounded-lg border shadow-sm overflow-hidden">
          <div className="flex-none border-b bg-muted/50 px-4 py-3">
            <h2 className="text-sm sm:text-base font-semibold">Dados de Referência</h2>
          </div>
          <div className="flex-1 flex flex-col justify-center gap-3 p-4">
            <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {contextoErrorMessage}
            </div>
            {isAdministrador ? (
              <Button
                onClick={() => navigate('/configuracao-estacao')}
                className="w-fit gap-2"
              >
                <Settings className="w-4 h-4" />
                Configurar estação
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Solicite a configuração da estação a um Administrador.
              </p>
            )}
          </div>
        </div>
      )
    }

    if (!opAtiva) {
      return (
        <div className="h-full flex flex-col bg-card rounded-lg border shadow-sm overflow-hidden">
          <div className="flex-none border-b bg-muted/50 px-4 py-3">
            <h2 className="text-sm sm:text-base font-semibold">Dados de Referência</h2>
          </div>
          <div className="flex-1 flex flex-col justify-center gap-3 p-4">
            <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Nenhuma OP iniciada para a linha configurada.
            </div>
            <Button
              variant="outline"
              onClick={() => contextoQuery.refetch()}
              className="w-fit"
            >
              Atualizar OP ativa
            </Button>
          </div>
        </div>
      )
    }

    return <ReferenceDataCard data={opAtiva} />
  }

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
              {renderReferencePanel()}

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
                        disabled={!opAtiva}
                        className={`
                          relative flex items-start gap-2 sm:gap-2.5 md:gap-3 p-2 sm:p-2.5 md:p-3 rounded-md border-2 transition-all min-h-[80px] sm:min-h-[85px] md:min-h-[90px]
                          disabled:cursor-not-allowed disabled:opacity-60
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
              {isAdministrador && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 px-0 text-primary hover:text-primary"
                  onClick={() => navigate('/configuracao-estacao')}
                  aria-label="Configuração da estação"
                  title="Configuração da estação"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              )}

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
                disabled={!opAtiva}
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
                disabled={!lastPhoto || !opAtiva || createInspectionMutation.isPending}
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

              <Button
                variant="outline"
                style={{ height: '36px', minWidth: '166px', paddingLeft: '12px', paddingRight: '12px' }}
                className="rounded-md gap-1 sm:gap-1.5 md:gap-2 text-xs sm:text-sm text-primary border-primary/40 hover:text-primary hover:border-primary"
                onClick={() => setIsLogoutModalOpen(true)}
              >
                <Power className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" fill="currentColor" />
                <span className="hidden sm:inline">LOGOFF</span>
                <span className="sm:hidden">Logoff</span>
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

      {/* Modal de leitura de código de barras */}
      <BarcodeReadingModal
        open={isBarcodeModalOpen}
        onOpenChange={setIsBarcodeModalOpen}
        barcodeType={currentBarcodeType}
        onDecision={handleBarcodeDecision}
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
              disabled={createInspectionMutation.isPending}
              className="gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {createInspectionMutation.isPending ? 'Salvando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmação de logoff */}
      <Dialog open={isLogoutModalOpen} onOpenChange={setIsLogoutModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Power className="w-5 h-5 text-primary" fill="currentColor" />
              Confirmar saída
            </DialogTitle>
            <DialogDescription className="text-lg pt-2 text-gray-700 dark:text-gray-300">
              Deseja encerrar a sessão e voltar para a tela de login?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-base text-gray-600 dark:text-gray-400">
              Ao confirmar, os dados de sessão serão limpos e você será redirecionado para a página de login.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsLogoutModalOpen(false)}
              className="gap-2"
            >
              <XCircle className="w-4 h-4" />
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmLogout}
              className="gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Sair
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
