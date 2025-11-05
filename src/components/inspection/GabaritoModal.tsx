import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FileText } from 'lucide-react'

interface GabaritoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface PdfFile {
  name: string
  path: string
}

export default function GabaritoModal({
  open,
  onOpenChange
}: GabaritoModalProps) {
  const [pdfFiles, setPdfFiles] = useState<PdfFile[]>([])
  const [selectedPdf, setSelectedPdf] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  // Carregar lista de arquivos PDF da pasta /data
  useEffect(() => {
    if (open) {
      loadPdfFiles()
    }
  }, [open])

  const loadPdfFiles = async () => {
    try {
      setLoading(true)

      // Lista de arquivos PDF disponíveis
      const files: PdfFile[] = [
        { name: 'Datamatrix', path: '/data/CAM 1 - Datamatrix.pdf' },
        { name: 'Lote e Validade no Rótulo', path: '/data/CAM 2 - Lote e Validade no Rótulo.pdf' },
      ]

      setPdfFiles(files)

      // Selecionar o primeiro arquivo por padrão
      if (files.length > 0) {
        setSelectedPdf(files[0].path)
      }
    } catch (err) {
      console.error('Erro ao carregar PDFs:', err)
    } finally {
      setLoading(false)
    }
  }

  const handlePdfSelect = (path: string) => {
    setSelectedPdf(path)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] h-[90vh] p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="w-6 h-6" />
            Gabaritos
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden" style={{ aspectRatio: '16/9' }}>
          {/* Coluna esquerda - Lista de PDFs */}
          <div className="w-64 border-r bg-muted/30 overflow-y-auto">
            <div className="p-4">
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                Arquivos Disponíveis
              </h3>
              
              {loading ? (
                <div className="text-sm text-muted-foreground">Carregando...</div>
              ) : pdfFiles.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  Nenhum gabarito disponível
                </div>
              ) : (
                <div className="space-y-2">
                  {pdfFiles.map((file) => (
                    <Button
                      key={file.path}
                      variant={selectedPdf === file.path ? 'default' : 'outline'}
                      className="w-full justify-start text-left h-auto py-3 px-3"
                      onClick={() => handlePdfSelect(file.path)}
                    >
                      <div className="flex items-start gap-2 w-full">
                        <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span className="text-sm break-words">{file.name}</span>
                      </div>
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Coluna direita - Visualizador de PDF */}
          <div className="flex-1 flex flex-col bg-background">
            {selectedPdf ? (
              <div className="flex-1 overflow-hidden">
                <iframe
                  src={`${selectedPdf}#toolbar=0&navpanes=0&scrollbar=0`}
                  className="w-full h-full border-0"
                  title="Visualizador de PDF"
                />
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center space-y-4">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto" />
                  <div>
                    <p className="text-lg font-semibold">Selecione um gabarito</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Escolha um arquivo da lista ao lado para visualizar
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

