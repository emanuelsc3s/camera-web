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
  Save,
  Search,
  SearchCheck,
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
  type FirebirdConfiguracao,
  type LinhaProducao,
  type OpCadastrada,
  type ReferenceDataComOpId,
  getConfiguracaoEstacao,
  getLinhasProducao,
  getOpsCadastradas,
  testarOpAtiva,
  updateConfiguracaoEstacao,
  updateConfiguracaoFirebird,
} from '@/services/apiService'

const PAGE_SIZE_OPTIONS = [10, 25, 50]

interface FirebirdFormState {
  host: string
  port: string
  database: string
  user: string
  password: string
  role: string
  charset: string
  pageSize: string
  poolMax: string
  connectTimeoutMs: string
}

const EMPTY_FIREBIRD_FORM: FirebirdFormState = {
  host: '',
  port: '',
  database: '',
  user: '',
  password: '',
  role: '',
  charset: '',
  pageSize: '',
  poolMax: '',
  connectTimeoutMs: '',
}

function firebirdToForm(firebird?: FirebirdConfiguracao): FirebirdFormState {
  if (!firebird) {
    return EMPTY_FIREBIRD_FORM
  }

  return {
    host: firebird.host || '',
    port: String(firebird.port ?? ''),
    database: firebird.database || '',
    user: firebird.user || '',
    password: '',
    role: firebird.role || '',
    charset: firebird.charset || '',
    pageSize: String(firebird.pageSize ?? ''),
    poolMax: String(firebird.poolMax ?? ''),
    connectTimeoutMs: String(firebird.connectTimeoutMs ?? ''),
  }
}

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

function parseFirebirdInteger(value: string, label: string, minimum: number): number {
  const text = value.trim()

  if (!/^\d+$/.test(text)) {
    throw new Error(`Informe um valor numérico válido para ${label}.`)
  }

  const parsed = Number.parseInt(text, 10)
  if (parsed < minimum) {
    throw new Error(`${label} deve ser maior ou igual a ${minimum}.`)
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
                  {PAGE_SIZE_OPTIONS.map((option) => (
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

interface LinhasProducaoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (linha: LinhaProducao) => void
}

function LinhasProducaoDialog({
  open,
  onOpenChange,
  onSelect,
}: LinhasProducaoDialogProps) {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)

  const linhasQuery = useQuery({
    queryKey: ['configuracao-estacao', 'linhas-producao', page, limit],
    queryFn: () => getLinhasProducao({ page, limit }),
    enabled: open,
    retry: false,
  })

  const linhas = linhasQuery.data?.data ?? []
  const pagination = linhasQuery.data?.pagination
  const totalPages = pagination?.totalPages ?? 0
  const hasPreviousPage = page > 1
  const hasNextPage = totalPages > 0 && page < totalPages
  const pageLabel = totalPages > 0 ? `Página ${page} de ${totalPages}` : 'Página 0 de 0'
  const totalLabel = pagination?.total === 1
    ? '1 linha encontrada'
    : `${pagination?.total ?? 0} linhas encontradas`
  const errorMessage = linhasQuery.error ? formatApiError(linhasQuery.error) : null

  const handleLimitChange = (value: string) => {
    setLimit(Number.parseInt(value, 10))
    setPage(1)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" />
            Buscar linha de produção
          </DialogTitle>
          <DialogDescription>
            Registros cadastrados na tabela TBLINHA_PRODUCAO.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm">
            <span className="text-muted-foreground">{totalLabel}</span>
            <div className="flex items-center gap-2">
              <Label htmlFor="linhasPageSize" className="text-sm font-medium">
                Registros por página
              </Label>
              <Select value={String(limit)} onValueChange={handleLimitChange}>
                <SelectTrigger id="linhasPageSize" className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((option) => (
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
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-muted/60 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Código</th>
                  <th className="px-3 py-2 text-left font-medium">Linha de produção</th>
                  <th className="px-3 py-2 text-right font-medium">Ação</th>
                </tr>
              </thead>
              <tbody>
                {linhasQuery.isLoading && (
                  <tr>
                    <td colSpan={3} className="px-3 py-8 text-center text-muted-foreground">
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Carregando linhas de produção...
                      </span>
                    </td>
                  </tr>
                )}

                {!linhasQuery.isLoading && !errorMessage && linhas.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-8 text-center text-muted-foreground">
                      Nenhuma linha de produção encontrada.
                    </td>
                  </tr>
                )}

                {!linhasQuery.isLoading && linhas.map((linha) => (
                  <tr key={linha.linhaProducaoId} className="border-t">
                    <td className="px-3 py-2 font-medium">{linha.linhaProducaoId}</td>
                    <td className="px-3 py-2">{linha.linhaProducao || '-'}</td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => onSelect(linha)}
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
                disabled={!hasPreviousPage || linhasQuery.isFetching}
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage((currentPage) => currentPage + 1)}
                disabled={!hasNextPage || linhasQuery.isFetching}
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
  const [isLinhasOpen, setIsLinhasOpen] = useState(false)
  const [isOpsOpen, setIsOpsOpen] = useState(false)
  const [isTestResultOpen, setIsTestResultOpen] = useState(false)
  const [testResultLinha, setTestResultLinha] = useState('')
  const [testResult, setTestResult] = useState<ReferenceDataComOpId | null | undefined>(undefined)
  const [firebirdForm, setFirebirdForm] = useState<FirebirdFormState>(EMPTY_FIREBIRD_FORM)

  const configuracaoQuery = useQuery({
    queryKey: ['configuracao-estacao'],
    queryFn: getConfiguracaoEstacao,
    retry: false,
  })

  useEffect(() => {
    if (!configuracaoQuery.data) return

    setLinhaInput(configuracaoQuery.data.linhaProducaoId?.toString() || '')
    setEstacaoNome(configuracaoQuery.data.estacaoNome || '')
    setFirebirdForm(firebirdToForm(configuracaoQuery.data.firebird))
    setTestResultLinha('')
    setTestResult(undefined)
    setIsTestResultOpen(false)
  }, [configuracaoQuery.data])

  const testMutation = useMutation({
    mutationFn: async () => testarOpAtiva(parseLinhaInput(linhaInput)),
    onSuccess: (data) => {
      setTestResultLinha(data.linhaProducao)
      setTestResult(data.opAtiva)
      setIsTestResultOpen(true)
      if (data.opAtiva) {
        toast.success(`OP ativa encontrada: ${data.opAtiva.op}`)
        return
      }

      toast.warning('Linha válida, mas sem OP iniciada.')
    },
    onError: (error) => {
      setTestResultLinha('')
      setTestResult(undefined)
      setIsTestResultOpen(false)
      toast.error(formatApiError(error))
    },
  })

  const saveMutation = useMutation({
    mutationFn: async () => updateConfiguracaoEstacao({
      linhaProducaoId: parseLinhaInput(linhaInput),
      estacaoNome: estacaoNome.trim(),
    }),
    onSuccess: async (data) => {
      queryClient.setQueryData(['configuracao-estacao'], data)
      await configuracaoQuery.refetch()
      void queryClient.invalidateQueries({ queryKey: ['estacao', 'contexto'] })
      void queryClient.invalidateQueries({ queryKey: ['inspecoes', 'resumo'] })
      setIsConfirmOpen(false)
      setTestResultLinha('')
      setTestResult(undefined)
      setIsTestResultOpen(false)
      toast.success('Configuração da estação salva com sucesso.')
    },
    onError: (error) => {
      toast.error(formatApiError(error))
    },
  })

  const saveFirebirdMutation = useMutation({
    mutationFn: async () => {
      if (!firebirdForm.host.trim()) {
        throw new Error('Informe o host do Firebird.')
      }

      if (!firebirdForm.database.trim()) {
        throw new Error('Informe o caminho do banco de dados.')
      }

      if (!firebirdForm.user.trim()) {
        throw new Error('Informe o usuário do Firebird.')
      }

      if (!firebirdForm.charset.trim()) {
        throw new Error('Informe o charset do Firebird.')
      }

      if (!currentData?.firebird?.passwordConfigured && !firebirdForm.password) {
        throw new Error('Informe a senha do Firebird.')
      }

      return updateConfiguracaoFirebird({
        host: firebirdForm.host.trim(),
        port: parseFirebirdInteger(firebirdForm.port, 'porta', 1),
        database: firebirdForm.database.trim(),
        user: firebirdForm.user.trim(),
        role: firebirdForm.role.trim(),
        charset: firebirdForm.charset.trim(),
        pageSize: parseFirebirdInteger(firebirdForm.pageSize, 'page size', 1024),
        poolMax: parseFirebirdInteger(firebirdForm.poolMax, 'pool máximo', 1),
        connectTimeoutMs: parseFirebirdInteger(
          firebirdForm.connectTimeoutMs,
          'timeout de conexão',
          0
        ),
        password: firebirdForm.password,
      })
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['configuracao-estacao'], data)
      setFirebirdForm(firebirdToForm(data.firebird))
      toast.success('Configuração de conexão salva com sucesso.')
    },
    onError: (error) => {
      toast.error(formatApiError(error))
    },
  })

  const handleFirebirdFieldChange = (field: keyof FirebirdFormState, value: string) => {
    setFirebirdForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }))
  }

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

  const handleSelectLinha = (linha: LinhaProducao) => {
    setLinhaInput(String(linha.linhaProducaoId))
    setEstacaoNome(linha.linhaProducao)
    setTestResultLinha('')
    setTestResult(undefined)
    setIsTestResultOpen(false)
    setIsLinhasOpen(false)
  }

  const handleSelectOp = (op: OpCadastrada) => {
    if (!op.linhaProducaoId) {
      toast.error('A OP selecionada não possui linha de produção vinculada.')
      return
    }

    setLinhaInput(String(op.linhaProducaoId))
    setEstacaoNome(op.linhaProducao)
    setTestResultLinha('')
    setTestResult(undefined)
    setIsTestResultOpen(false)
    setIsOpsOpen(false)
  }

  const currentData = configuracaoQuery.data
  const isLoading = configuracaoQuery.isLoading
  const errorMessage = configuracaoQuery.error
    ? formatApiError(configuracaoQuery.error)
    : null

  return (
    <div className="relative h-full flex flex-col bg-background">
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
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold truncate">Configuração da Estação</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 pb-44 sm:pb-24">
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
                <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-4">
                  <div className="space-y-2 md:col-span-1">
                    <Label htmlFor="linhaProducaoId">Linha de produção</Label>
                    <div className="flex w-full gap-2">
                      <Input
                        id="linhaProducaoId"
                        inputMode="numeric"
                        value={linhaInput}
                        onChange={(event) => {
                          setLinhaInput(event.target.value)
                          setTestResultLinha('')
                          setTestResult(undefined)
                          setIsTestResultOpen(false)
                        }}
                        placeholder="Ex.: 5"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setIsLinhasOpen(true)}
                        aria-label="Buscar linhas de produção"
                      >
                        <Search className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-3">
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
                  <h2 className="text-base font-semibold">Conexão com banco de dados</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                  <div className="space-y-2">
                    <Label htmlFor="firebirdHost">Host</Label>
                    <Input
                      id="firebirdHost"
                      value={firebirdForm.host}
                      onChange={(event) => handleFirebirdFieldChange('host', event.target.value)}
                      placeholder="Ex.: 127.0.0.1"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="firebirdPort">Porta</Label>
                    <Input
                      id="firebirdPort"
                      inputMode="numeric"
                      value={firebirdForm.port}
                      onChange={(event) => handleFirebirdFieldChange('port', event.target.value)}
                      placeholder="3050"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="firebirdDatabase">Banco de dados</Label>
                    <Input
                      id="firebirdDatabase"
                      value={firebirdForm.database}
                      onChange={(event) => handleFirebirdFieldChange('database', event.target.value)}
                      placeholder="C:\caminho\para\banco.fdb"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="firebirdUser">Usuário</Label>
                    <Input
                      id="firebirdUser"
                      value={firebirdForm.user}
                      onChange={(event) => handleFirebirdFieldChange('user', event.target.value)}
                      placeholder="SYSDBA"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="firebirdPassword">Senha</Label>
                    <Input
                      id="firebirdPassword"
                      type="password"
                      autoComplete="new-password"
                      value={firebirdForm.password}
                      onChange={(event) => handleFirebirdFieldChange('password', event.target.value)}
                      placeholder={
                        currentData?.firebird?.passwordConfigured
                          ? 'Senha já configurada. Preencha para alterar.'
                          : 'Informe a senha do Firebird'
                      }
                    />
                    <div className="text-xs text-muted-foreground">
                      {currentData?.firebird?.passwordConfigured
                        ? currentData.firebird.passwordEncrypted
                          ? 'Senha configurada e criptografada no .env.'
                          : 'Senha configurada em texto puro; será criptografada ao salvar.'
                        : 'Nenhuma senha configurada.'}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="firebirdRole">Role</Label>
                    <Input
                      id="firebirdRole"
                      value={firebirdForm.role}
                      onChange={(event) => handleFirebirdFieldChange('role', event.target.value)}
                      placeholder="Opcional"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="firebirdCharset">Charset</Label>
                    <Input
                      id="firebirdCharset"
                      value={firebirdForm.charset}
                      onChange={(event) => handleFirebirdFieldChange('charset', event.target.value)}
                      placeholder="WIN1252"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="firebirdPageSize">Page size</Label>
                    <Input
                      id="firebirdPageSize"
                      inputMode="numeric"
                      value={firebirdForm.pageSize}
                      onChange={(event) => handleFirebirdFieldChange('pageSize', event.target.value)}
                      placeholder="4096"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="firebirdPoolMax">Pool máximo</Label>
                    <Input
                      id="firebirdPoolMax"
                      inputMode="numeric"
                      value={firebirdForm.poolMax}
                      onChange={(event) => handleFirebirdFieldChange('poolMax', event.target.value)}
                      placeholder="5"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="firebirdTimeout">Timeout de conexão (ms)</Label>
                    <Input
                      id="firebirdTimeout"
                      inputMode="numeric"
                      value={firebirdForm.connectTimeoutMs}
                      onChange={(event) => handleFirebirdFieldChange('connectTimeoutMs', event.target.value)}
                      placeholder="10000"
                    />
                  </div>

                  <div className="flex items-end justify-end md:col-span-2">
                    <Button
                      type="button"
                      onClick={() => saveFirebirdMutation.mutate()}
                      disabled={saveFirebirdMutation.isPending}
                      className="gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {saveFirebirdMutation.isPending ? 'Salvando...' : 'Salvar conexão'}
                    </Button>
                  </div>
                </div>
              </section>

            </>
          )}
        </div>
      </div>

      {!isLoading && !errorMessage && (
        <div className="absolute inset-x-0 bottom-0 z-20 border-t bg-background/95 px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="mx-auto max-w-5xl">
            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => testMutation.mutate()}
                disabled={testMutation.isPending}
                className="gap-2"
              >
                <SearchCheck className="w-4 h-4" />
                {testMutation.isPending ? 'Testando...' : 'Testar'}
              </Button>
              <Button
                onClick={handleOpenConfirm}
                disabled={saveMutation.isPending}
                className="gap-2"
              >
                <Save className="w-4 h-4" />
                Salvar
              </Button>
            </div>
          </div>
        </div>
      )}

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

      <Dialog open={isTestResultOpen} onOpenChange={setIsTestResultOpen}>
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>
              Teste da linha informada
            </DialogTitle>
            <DialogDescription>
              Resultado da consulta de OP ativa para a linha {testResultLinha || '-'}.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            {testResult !== undefined && (
              <OpAtivaResumo opAtiva={testResult} />
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsTestResultOpen(false)}
              className="gap-2"
            >
              <XCircle className="w-4 h-4" />
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LinhasProducaoDialog
        open={isLinhasOpen}
        onOpenChange={setIsLinhasOpen}
        onSelect={handleSelectLinha}
      />

      <OpsCadastradasDialog
        open={isOpsOpen}
        onOpenChange={setIsOpsOpen}
        onSelect={handleSelectOp}
      />
    </div>
  )
}
