import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import CameraCard from '@/components/camera/CameraCard'
import {
  ChevronLeft,
  Search,
  XCircle,
  CheckCircle2,
  Pause,
  Bell,
  Camera
} from 'lucide-react'


export default function HomePage() {

  const [lastPhoto, setLastPhoto] = useState<string | null>(null)

  const handlePhotoCapture = useCallback((photoDataUrl: string) => {
    setLastPhoto(photoDataUrl)
    toast.success('Foto capturada com sucesso!')
  }, [])

  return (
    <>
      {/* Breadcrumbs + Ações do topo */}

      {/* Cards de dados (lado a lado) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
        {/* Esquerda: Dados informados */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Dados informados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border border-dashed p-3 space-y-3">
              <div className="grid grid-cols-3 gap-3 max-md:grid-cols-1">
                <input className="h-9 w-full rounded-md border px-3 text-sm" placeholder="OP" />
                <input className="h-9 w-full rounded-md border px-3 text-sm" placeholder="Lote" />
                <input className="h-9 w-full rounded-md border px-3 text-sm" placeholder="Validade" />
              </div>
              <input className="h-9 w-full rounded-md border px-3 text-sm" placeholder="Produto" />
              <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
                <input className="h-9 w-full rounded-md border px-3 text-sm" placeholder="Registro ANVISA" />
                <input className="h-9 w-full rounded-md border px-3 text-sm" placeholder="GTIN" />
              </div>
              <div className="pt-2 text-center text-xs text-muted-foreground">Texto Dados Variáveis</div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-3 gap-3 max-md:grid-cols-1">
              <div className="rounded-md border bg-blue-50 text-blue-900 p-3">
                <div className="flex items-center gap-2 text-sm"><Search className="w-4 h-4" /> Inspecionado</div>
                <div className="mt-1 font-semibold">999,999</div>
              </div>
              <div className="rounded-md border bg-red-50 text-red-900 p-3">
                <div className="flex items-center gap-2 text-sm"><XCircle className="w-4 h-4" /> Rejeitado</div>
                <div className="mt-1 font-semibold">999,999</div>
              </div>
              <div className="rounded-md border bg-green-50 text-green-900 p-3">
                <div className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-4 h-4" /> Aprovado</div>
                <div className="mt-1 font-semibold">999,999</div>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Pré-visualizações (2 câmeras) */}
      <div className="max-w-7xl mx-auto mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6 pb-28">
        <Card>
          <CardContent className="pt-4">
            <CameraCard onPhotoCapture={handlePhotoCapture} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="pt-2 space-y-2">
              <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                {lastPhoto ? (
                  <img src={lastPhoto} alt="Foto capturada" className="w-full h-full object-cover" />
                ) : (
                  <div className="relative flex h-full items-center justify-center overflow-hidden">
                    {/* Fundo sutil com gradiente e borda tracejada ao estilo shadcn */}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/40 via-muted/30 to-background/60" />
                    <div className="pointer-events-none absolute inset-0 rounded-lg border border-dashed border-border/50" />

                    {/* Conteúdo do estado vazio */}
                    <div className="relative flex flex-col items-center text-center gap-2 px-4">
                      <div className="rounded-full bg-muted p-3 ring-1 ring-border shadow-sm">
                        <Camera className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium text-foreground">Nenhuma foto capturada ainda</p>
                      <p className="text-xs text-muted-foreground">Capture uma imagem para visualizar aqui</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>


      {/* Footer de ações */}
      <footer className="fixed inset-x-0 bottom-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto h-16 flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2">
              <ChevronLeft className="w-4 h-4" />
              VOLTAR
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" className="gap-2">
              <Pause className="w-4 h-4" />
              PAUSAR
            </Button>
            <Button className="gap-2">
              <Search className="w-4 h-4" />
              CONSULTAR
            </Button>
            <Button variant="secondary" className="gap-2">
              <Bell className="w-4 h-4" />
              ALARMES
            </Button>
          </div>
        </div>
      </footer>
    </>
  )
}