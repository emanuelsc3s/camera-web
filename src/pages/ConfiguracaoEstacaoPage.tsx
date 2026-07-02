import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  Save,
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
  ApiError,
  type ReferenceDataComOpId,
  getConfiguracaoEstacao,
  testarOpAtiva,
  updateConfiguracaoEstacao,
} from '@/services/apiService'

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

export default function ConfiguracaoEstacaoPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [linhaInput, setLinhaInput] = useState('')
  const [estacaoNome, setEstacaoNome] = useState('')
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
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
    </div>
  )
}
