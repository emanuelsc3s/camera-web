import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  X
} from 'lucide-react'
import type { InspectionRecord } from '@/types/inspection'
import {
  getAllRecords,
  filterRecords,
  getPaginatedRecords
} from '@/services/storageService'

export default function ConsultaPage() {
  const navigate = useNavigate()
  
  // Estados
  const [records] = useState<InspectionRecord[]>(getAllRecords())
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [searchField, setSearchField] = useState('todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRecord, setSelectedRecord] = useState<InspectionRecord | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  // Filtra registros com base na busca
  const filteredRecords = useMemo(() => {
    if (!searchTerm.trim()) {
      return records
    }
    return filterRecords(searchField, searchTerm)
  }, [records, searchField, searchTerm])

  // Paginação
  const paginatedData = useMemo(() => {
    return getPaginatedRecords({ page: currentPage, pageSize }, filteredRecords)
  }, [currentPage, pageSize, filteredRecords])

  // Visualiza detalhes de um registro
  const handleViewDetails = (record: InspectionRecord) => {
    setSelectedRecord(record)
    setIsDetailModalOpen(true)
  }

  // Renderiza status de conformidade
  const renderConformityStatus = (state: boolean | null) => {
    if (state === true) {
      return <span className="text-green-600 dark:text-green-400 font-semibold">✓ Aprovado</span>
    } else if (state === false) {
      return <span className="text-red-600 dark:text-red-400 font-semibold">✗ Reprovado</span>
    }
    return <span className="text-muted-foreground">-</span>
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex-none border-b bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/')}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Voltar
            </Button>
            <h1 className="text-xl font-semibold">Consulta de Inspeções</h1>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex-none border-b bg-muted/30 px-4 py-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={searchField} onValueChange={setSearchField}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Campo de busca" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os campos</SelectItem>
              <SelectItem value="dataHora">Data/Hora</SelectItem>
              <SelectItem value="op">OP</SelectItem>
              <SelectItem value="lote">Lote</SelectItem>
              <SelectItem value="validade">Validade</SelectItem>
              <SelectItem value="produto">Produto</SelectItem>
              <SelectItem value="gtin">GTIN</SelectItem>
              <SelectItem value="registroAnvisa">Registro ANVISA</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Digite para buscar..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1) // Volta para primeira página ao buscar
              }}
              className="w-full pl-10 pr-10 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Conteúdo principal - Tabela */}
      <div className="flex-1 overflow-auto p-4">
        {paginatedData.data.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">
              {searchTerm ? 'Nenhum registro encontrado com os critérios de busca.' : 'Nenhum registro de inspeção salvo.'}
            </p>
          </Card>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 text-left">Foto</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Data/Hora</th>
                  <th className="p-3 text-left">OP</th>
                  <th className="p-3 text-left">Lote</th>
                  <th className="p-3 text-left">Produto</th>
                  <th className="p-3 text-left">GTIN</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.data.map((record) => {
                  // Usa o statusFinal calculado automaticamente ao salvar o registro
                  const isReprovado = record.statusFinal === 'REPROVADO'

                  return (
                    <tr
                      key={record.id}
                      className={`border-b hover:bg-muted/30 transition-colors ${
                        isReprovado ? 'bg-red-50 dark:bg-red-950/20' : ''
                      }`}
                    >
                      <td className="p-3">
                        <img
                          src={record.foto}
                          alt="Foto da inspeção"
                          className="w-16 h-16 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => handleViewDetails(record)}
                          title="Clique para visualizar detalhes"
                        />
                      </td>
                      <td className="p-3 text-sm">
                        {isReprovado ? (
                          <span className="text-red-600 dark:text-red-400 font-semibold">REPROVADO</span>
                        ) : (
                          <span className="text-green-600 dark:text-green-400 font-semibold">APROVADO</span>
                        )}
                      </td>
                      <td className="p-3 text-sm">{record.dataHora}</td>
                      <td className="p-3 text-sm">{record.referenceData.op}</td>
                      <td className="p-3 text-sm">{record.referenceData.lote}</td>
                      <td className="p-3 text-sm max-w-xs truncate" title={record.referenceData.produto}>
                        {record.referenceData.produto}
                      </td>
                      <td className="p-3 text-sm">{record.referenceData.gtin}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer - Paginação */}
      {paginatedData.total > 0 && (
        <div className="flex-none border-t bg-card px-4 py-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                Mostrando {((currentPage - 1) * pageSize) + 1} a {Math.min(currentPage * pageSize, paginatedData.total)} de {paginatedData.total} registros
              </span>
              
              <Select
                value={String(pageSize)}
                onValueChange={(value) => {
                  setPageSize(Number(value))
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 / página</SelectItem>
                  <SelectItem value="25">25 / página</SelectItem>
                  <SelectItem value="50">50 / página</SelectItem>
                  <SelectItem value="100">100 / página</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                <ChevronsLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <span className="text-sm px-3">
                Página {currentPage} de {paginatedData.totalPages}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(paginatedData.totalPages, p + 1))}
                disabled={currentPage === paginatedData.totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(paginatedData.totalPages)}
                disabled={currentPage === paginatedData.totalPages}
              >
                <ChevronsRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">Detalhes da Inspeção</DialogTitle>
            <DialogDescription className="text-base">
              Data: {selectedRecord?.dataHora}
            </DialogDescription>
          </DialogHeader>

          {selectedRecord && (
            <div className="space-y-4">
              {/* Foto */}
              <div>
                <h3 className="font-semibold mb-2 text-base">Foto Capturada</h3>
                <img
                  src={selectedRecord.foto}
                  alt="Foto da inspeção"
                  className="w-full rounded-lg border"
                />
              </div>

              {/* Status Final */}
              <div className={`p-4 rounded-lg border-2 ${
                selectedRecord.statusFinal === 'REPROVADO'
                  ? 'bg-red-50 dark:bg-red-950/20 border-red-500'
                  : 'bg-green-50 dark:bg-green-950/20 border-green-500'
              }`}>
                <h3 className="font-semibold mb-2 text-base">Status Final da Inspeção</h3>
                <p className={`text-2xl font-extrabold ${
                  selectedRecord.statusFinal === 'REPROVADO'
                    ? 'text-red-700 dark:text-red-300'
                    : 'text-green-700 dark:text-green-300'
                }`}>
                  {selectedRecord.statusFinal}
                </p>
              </div>

              {/* Informações Gerais */}
              <div>
                <h3 className="font-semibold mb-2 text-base">Informações Gerais</h3>
                <div className="grid grid-cols-2 gap-3 text-base">
                  <div>
                    <span className="text-muted-foreground">Data/Hora:</span>
                    <p className="font-medium">{selectedRecord.dataHora}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">ID:</span>
                    <p className="font-medium">{selectedRecord.id}</p>
                  </div>
                </div>
              </div>

              {/* Dados do Produto */}
              <div>
                <h3 className="font-semibold mb-2 text-base">Dados do Produto</h3>
                <div className="grid grid-cols-2 gap-3 text-base">
                  <div>
                    <span className="text-muted-foreground">OP:</span>
                    <p className="font-medium">{selectedRecord.referenceData.op}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Lote:</span>
                    <p className="font-medium">{selectedRecord.referenceData.lote}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Validade:</span>
                    <p className="font-medium">{selectedRecord.referenceData.validade}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">GTIN:</span>
                    <p className="font-medium">{selectedRecord.referenceData.gtin}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Produto:</span>
                    <p className="font-medium">{selectedRecord.referenceData.produto}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Registro ANVISA:</span>
                    <p className="font-medium">{selectedRecord.referenceData.registroAnvisa}</p>
                  </div>
                </div>
              </div>

              {/* Resultados da Inspeção */}
              <div>
                <h3 className="font-semibold mb-2 text-base">Resultados da Inspeção</h3>
                <div className="grid grid-cols-2 gap-3 text-base">
                  <div>
                    <span className="text-muted-foreground">GTIN:</span>
                    <p>{renderConformityStatus(selectedRecord.inspectionStates.gtin)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Datamatrix:</span>
                    <p>{renderConformityStatus(selectedRecord.inspectionStates.datamatrix)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Impressão do Lote:</span>
                    <p>{renderConformityStatus(selectedRecord.inspectionStates.lote)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Impressão da Validade:</span>
                    <p>{renderConformityStatus(selectedRecord.inspectionStates.validade)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

