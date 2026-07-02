import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  AlertCircle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Save,
  Search,
  SearchCheck,
  Settings,
  XCircle,
} from 'lucide-react'

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ApiError,
  type OpCadastrada,
  type ReferenceDataComOpId,
  getConfiguracaoEstacao,
  getOpsCadastradas,
  testarOpAtiva,
  updateConfiguracaoEstacao,
} from '@/services/apiService'

const OPS_PAGE_SIZE_OPTIONS = [10, 25, 50]

function parseLinhaInput(value: string): number {
  const text = value.trim()

  if (!/^\d+$/.test(text)) {
    throw new Error('Informe uma linha de produção válida.')
  }

  const parsed = Number.parseInt(text, 10)
  if (parsed < 1) {
    throw new Error('Informe uma linha de produção válida.')
  }

  return parsed
}

function formatApiError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Sessão expirada. Faça login novamente.'
    if (error.status === 403) return 'Acesso permitido somente para Administradores.'
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Não foi possível concluir a operação.'
}

function OpAtivaResumo({ opAtiva }: { opAtiva: ReferenceDataComOpId | null }) {
  if (!opAtiva) {
    return (
      <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        Nenhuma OP iniciada para esta linha.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
      <DataItem label="OP" value={opAtiva.op} />
      <DataItem label="Lote" value={opAtiva.lote} />
      <DataItem label="Validade" value={opAtiva.validade} />
      <div className="sm:col-span-3">
        <DataItem label="Produto" value={opAtiva.produto} />
      </div>
      <DataItem label="GTIN" value={opAtiva.gtin} />
      <DataItem label="Registro ANVISA" value={opAtiva.registroAnvisa} />
      <DataItem label="OP ID" value={String(opAtiva.opId)} />
    </div>
  )
}

function DataItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/30 px-3 py-2">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold break-words">{value || '-'}</div>
    </div>
  )
}

interface OpsCadastradasDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (op: OpCadastrada) => void
}

function OpsCadastradasDialog({
  open,
  onOpenChange,
  onSelect,
}: OpsCadastradasDialogProps) {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)

  const opsQuery = useQuery({
    queryKey: ['configuracao-estacao', 'ops-cadastradas', page, limit],
    queryFn: () => getOpsCadastradas({ page, limit }),
    enabled: open,
    retry: false,
  })

  const ops = opsQuery.data?.data ?? []
  const pagination = opsQuery.data?.pagination
  const totalPages = pagination?.totalPages ?? 0
  const hasPreviousPage = page > 1
  const hasNextPage = totalPages > 0 && page < totalPages
  const pageLabel = totalPages > 0 ? `Página ${page} de ${totalPages}` : 'Página 0 de 0'
  const totalLabel = pagination?.total === 1
    ? '1 OP encontrada'
    : `${pagination?.total ?? 0} OPs encontradas`
  const errorMessage = opsQuery.error ? formatApiError(opsQuery.error) : null

  const handleLimitChange = (value: string) => {
    setLimit(Number.parseInt(value, 10))
    setPage(1)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[860px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" />
            Buscar OP cadastrada
          </DialogTitle>
          <DialogDescription>
            Registros cadastrados na tabela TBOP.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm">
            <span className="text-muted-foreground">{totalLabel}</span>
            <div className="flex items-center gap-2">
              <Label htmlFor="opsPageSize" className="text-sm font-medium">
                Registros por página
              </Label>
              <Select value={String(limit)} onValueChange={handleLimitChange}>
                <SelectTrigger id="opsPageSize" className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPS_PAGE_SIZE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={String(option)}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {errorMessage && (
            <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
              {errorMessage}
            </div>
          )}

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="bg-muted/60 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">OP</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                  <th className="px-3 py-2 text-left font-medium">Linha</th>
                  <th className="px-3 py-2 text-left font-medium">Descrição da linha</th>
                  <th className="px-3 py-2 text-left font-medium">Produto</th>
                  <th className="px-3 py-2 text-left font-medium">Lote</th>
                  <th className="px-3 py-2 text-right font-medium">Ação</th>
                </tr>
              </thead>
              <tbody>
                {opsQuery.isLoading && (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Carregando OPs cadastradas...
                      </span>
                    </td>
                  </tr>
                )}

                {!opsQuery.isLoading && !errorMessage && ops.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                      Nenhuma OP cadastrada encontrada.
                    </td>
                  </tr>
                )}

                {!opsQuery.isLoading && ops.map((op) => (
                  <tr key={`${op.opId}-${op.op}`} className="border-t">
                    <td className="px-3 py-2 font-medium">{op.op || '-'}</td>
                    <td className="px-3 py-2">{op.status || '-'}</td>
                    <td className="px-3 py-2">{op.linhaProducaoId ?? '-'}</td>
                    <td className="px-3 py-2">{op.linhaProducao || '-'}</td>
                    <td className="px-3 py-2">{op.produto || '-'}</td>
                    <td className="px-3 py-2">{op.lote || '-'}</td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => onSelect(op)}
                        disabled={!op.linhaProducaoId}
                      >
                        Selecionar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span className="text-sm text-muted-foreground">{pageLabel}</span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                disabled={!hasPreviousPage || opsQuery.isFetching}
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage((currentPage) => currentPage + 1)}
                disabled={!hasNextPage || opsQuery.isFetching}
              >
                Próxima
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function ConfiguracaoEstacaoPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [linhaInput, setLinhaInput] = useState('')
  const [estacaoNome, setEstacaoNome] = useState('')
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isOpsOpen, setIsOpsOpen] = useState(false)
  const [testResult, setTestResult] = useState<ReferenceDataComOpId | null | undefined>(undefined)

  const configuracaoQuery = useQuery({
    queryKey: ['configuracao-estacao'],
    queryFn: getConfiguracaoEstacao,
    retry: false,
  })

  useEffect(() => {
    if (!configuracaoQuery.data) return

    setLinhaInput(configuracaoQuery.data.linhaProducaoId?.toString() || '')
    setEstacaoNome(configuracaoQuery.data.estacaoNome || '')
    setTestResult(undefined)
  }, [configuracaoQuery.data])

  const testMutation = useMutation({
    mutationFn: async () => testarOpAtiva(parseLinhaInput(linhaInput)),
    onSuccess: (data) => {
      setTestResult(data.opAtiva)
      if (data.opAtiva) {
        toast.success(`OP ativa encontrada: ${data.opAtiva.op}`)
        return
      }

      toast.warning('Linha válida, mas sem OP iniciada.')
    },
    onError: (error) => {
      setTestResult(undefined)
      toast.error(formatApiError(error))
    },
  })

  const saveMutation = useMutation({
    mutationFn: async () => updateConfiguracaoEstacao({
      linhaProducaoId: parseLinhaInput(linhaInput),
      estacaoNome: estacaoNome.trim(),
    }),
    onSuccess: (data) => {
      queryClient.setQueryData(['configuracao-estacao'], data)
      void queryClient.invalidateQueries({ queryKey: ['estacao', 'contexto'] })
      void queryClient.invalidateQueries({ queryKey: ['inspecoes', 'resumo'] })
      setIsConfirmOpen(false)
      setTestResult(undefined)
      toast.success('Configuração da estação salva com sucesso.')
    },
    onError: (error) => {
      toast.error(formatApiError(error))
    },
  })

  const handleOpenConfirm = () => {
    try {
      parseLinhaInput(linhaInput)
      if (!estacaoNome.trim()) {
        toast.error('Informe o nome da estação.')
        return
      }

      setIsConfirmOpen(true)
    } catch (error) {
      toast.error(formatApiError(error))
    }
  }

  const handleSelectOp = (op: OpCadastrada) => {
    if (!op.linhaProducaoId) {
      toast.error('A OP selecionada não possui linha de produção vinculada.')
      return
    }

    setLinhaInput(String(op.linhaProducaoId))
    setEstacaoNome(op.linhaProducao)
    setTestResult(undefined)
    setIsOpsOpen(false)
  }

  const currentData = configuracaoQuery.data
  const isLoading = configuracaoQuery.isLoading
  const errorMessage = configuracaoQuery.error
    ? formatApiError(configuracaoQuery.error)
    : null

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex-none border-b bg-card px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/')}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
            <div className="flex items-center gap-2 min-w-0">
              <Settings className="w-5 h-5 text-primary" />
              <h1 className="text-lg sm:text-xl font-semibold truncate">Configuração da Estação</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="mx-auto max-w-5xl space-y-4">
          {isLoading && (
            <div className="rounded-md border bg-card px-4 py-6 text-sm text-muted-foreground">
              Carregando configuração...
            </div>
          )}

          {errorMessage && (
            <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
              <div className="flex items-center gap-2 font-semibold">
                <AlertCircle className="w-4 h-4" />
                Não foi possível carregar a configuração
              </div>
              <p className="mt-1">{errorMessage}</p>
            </div>
          )}

          {!isLoading && !errorMessage && (
            <>
              <section className="rounded-lg border bg-card shadow-sm">
                <div className="border-b bg-muted/50 px-4 py-3">
                  <h2 className="text-base font-semibold">Dados da estação</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                  <div className="space-y-2">
                    <Label htmlFor="linhaProducaoId">Linha de produção</Label>
                    <div className="flex gap-2">
                      <Input
                        id="linhaProducaoId"
                        inputMode="numeric"
                        value={linhaInput}
                        onChange={(event) => {
                          setLinhaInput(event.target.value)
                          setTestResult(undefined)
                        }}
                        placeholder="Ex.: 5"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setIsOpsOpen(true)}
                        aria-label="Buscar OPs cadastradas"
                      >
                        <Search className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="estacaoNome">Nome da estação</Label>
                    <Input
                      id="estacaoNome"
                      value={estacaoNome}
                      onChange={(event) => setEstacaoNome(event.target.value)}
                      placeholder="Ex.: LINHA_05_MANUAL"
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-lg border bg-card shadow-sm">
                <div className="border-b bg-muted/50 px-4 py-3">
                  <h2 className="text-base font-semibold">Status atual</h2>
                </div>
                <div className="space-y-3 p-4">
                  <div className="flex flex-wrap gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-sm font-medium ${
                      currentData?.configurado
                        ? 'border-green-300 bg-green-50 text-green-800'
                        : 'border-amber-300 bg-amber-50 text-amber-900'
                    }`}>
                      {currentData?.configurado ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <AlertCircle className="w-4 h-4" />
                      )}
                      {currentData?.configurado ? 'Configurada' : 'Sem configuração'}
                    </span>
                    {currentData?.linhaProducaoId && (
                      <span className="inline-flex items-center rounded-md border bg-muted/30 px-2.5 py-1 text-sm font-medium">
                        Linha {currentData.linhaProducaoId}
                      </span>
                    )}
                    {currentData?.estacaoNome && (
                      <span className="inline-flex items-center rounded-md border bg-muted/30 px-2.5 py-1 text-sm font-medium">
                        {currentData.estacaoNome}
                      </span>
                    )}
                  </div>

                  <OpAtivaResumo opAtiva={currentData?.opAtiva || null} />
                </div>
              </section>

              {testResult !== undefined && (
                <section className="rounded-lg border bg-card shadow-sm">
                  <div className="border-b bg-muted/50 px-4 py-3">
                    <h2 className="text-base font-semibold">Teste da linha informada</h2>
                  </div>
                  <div className="p-4">
                    <OpAtivaResumo opAtiva={testResult} />
                  </div>
                </section>
              )}

              <div className="flex flex-col sm:flex-row justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => testMutation.mutate()}
                  disabled={testMutation.isPending}
                  className="gap-2"
                >
                  <SearchCheck className="w-4 h-4" />
                  {testMutation.isPending ? 'Testando...' : 'Testar OP ativa'}
                </Button>
                <Button
                  onClick={handleOpenConfirm}
                  disabled={saveMutation.isPending}
                  className="gap-2"
                >
                  <Save className="w-4 h-4" />
                  Salvar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => configuracaoQuery.refetch()}
                  disabled={configuracaoQuery.isFetching}
                  className="gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Atualizar
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-primary" />
              Confirmar configuração
            </DialogTitle>
            <DialogDescription>
              Confirme a alteração da linha usada por esta estação.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2 text-sm">
            <DataItem label="Linha atual" value={currentData?.linhaProducaoId?.toString() || '-'} />
            <DataItem label="Nova linha" value={linhaInput.trim() || '-'} />
            <DataItem label="Estação atual" value={currentData?.estacaoNome || '-'} />
            <DataItem label="Nova estação" value={estacaoNome.trim() || '-'} />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsConfirmOpen(false)}
              className="gap-2"
            >
              <XCircle className="w-4 h-4" />
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {saveMutation.isPending ? 'Salvando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <OpsCadastradasDialog
        open={isOpsOpen}
        onOpenChange={setIsOpsOpen}
        onSelect={handleSelectOp}
      />
    </div>
  )
}
