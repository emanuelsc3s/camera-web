import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Images, Download, Trash2, Eye } from 'lucide-react'

interface Photo {
  id: string
  dataUrl: string
  timestamp: number
  name: string
}

interface GalleryCardProps {
  photos: Photo[]
  onDeletePhoto: (photoId: string) => void
}

export default function GalleryCard({ photos, onDeletePhoto }: GalleryCardProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)

  const handleDownloadPhoto = (photo: Photo) => {
    const link = document.createElement('a')
    link.href = photo.dataUrl
    link.download = photo.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleViewPhoto = (photo: Photo) => {
    setSelectedPhoto(photo)
  }

  const closePhotoModal = () => {
    setSelectedPhoto(null)
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Images className="w-5 h-5" />
            Galeria de Fotos
            {photos.length > 0 && (
              <span className="ml-auto text-sm font-normal text-muted-foreground">
                {photos.length} {photos.length === 1 ? 'foto' : 'fotos'}
              </span>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent>
          {photos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Images className="w-12 h-12 mb-3 mx-auto opacity-50" />
              <p className="text-sm">Nenhuma foto capturada ainda</p>
              <p className="text-xs mt-1">
                Use a câmera para capturar suas primeiras fotos
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="group relative aspect-square bg-muted rounded-lg overflow-hidden border-2 border-transparent hover:border-primary/20 transition-colors"
                >
                  <img
                    src={photo.dataUrl}
                    alt={photo.name}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Overlay com botões */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 w-8 p-0"
                        onClick={() => handleViewPhoto(photo)}
                        title="Visualizar"
                      >
                        <Eye className="w-3 h-3" />
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 w-8 p-0"
                        onClick={() => handleDownloadPhoto(photo)}
                        title="Baixar"
                      >
                        <Download className="w-3 h-3" />
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-8 w-8 p-0"
                        onClick={() => onDeletePhoto(photo.id)}
                        title="Excluir"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Informações da foto */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <p className="text-xs text-white truncate">
                      {formatTimestamp(photo.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de visualização da foto */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={closePhotoModal}
        >
          <div
            className="relative max-w-4xl max-h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedPhoto.dataUrl}
              alt={selectedPhoto.name}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            
            {/* Botões do modal */}
            <div className="absolute top-4 right-4 flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleDownloadPhoto(selectedPhoto)}
              >
                <Download className="w-4 h-4 mr-2" />
                Baixar
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={closePhotoModal}
              >
                Fechar
              </Button>
            </div>

            {/* Informações da foto */}
            <div className="absolute bottom-4 left-4 bg-black/60 text-white px-3 py-2 rounded-lg">
              <p className="text-sm font-medium">{selectedPhoto.name}</p>
              <p className="text-xs opacity-80">
                {formatTimestamp(selectedPhoto.timestamp)}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}