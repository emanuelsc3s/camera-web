import { useState, useCallback } from 'react'
import CameraCard from '@/components/camera/CameraCard'
import GalleryCard from '@/components/camera/GalleryCard'
import { toast } from 'sonner'

interface Photo {
  id: string
  dataUrl: string
  timestamp: number
  name: string
}

export default function HomePage() {
  const [photos, setPhotos] = useState<Photo[]>([])

  // Função para adicionar nova foto à galeria
  const handlePhotoCapture = useCallback((photoDataUrl: string) => {
    const now = Date.now()
    const photo: Photo = {
      id: crypto.randomUUID(),
      dataUrl: photoDataUrl,
      timestamp: now,
      name: `foto_${new Date(now).toISOString().slice(0, 19).replace(/:/g, '-')}.jpg`
    }

    setPhotos(prev => [photo, ...prev])
    toast.success('Foto capturada com sucesso!')
  }, [])

  // Função para deletar foto da galeria
  const handleDeletePhoto = useCallback((photoId: string) => {
    setPhotos(prev => prev.filter(photo => photo.id !== photoId))
    toast.success('Foto excluída')
  }, [])

  return (
    <>
      <div className="pb-[60px] grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
        {/* Coluna esquerda - Câmera */}
        <div className="w-full">
          <CameraCard onPhotoCapture={handlePhotoCapture} />
        </div>

        {/* Coluna direita - Galeria */}
        <div className="w-full">
          <GalleryCard
            photos={photos}
            onDeletePhoto={handleDeletePhoto}
          />
        </div>
      </div>
      <footer className="fixed inset-x-0 bottom-0 bg-[#f5f5f5] h-[60px]"></footer>
    </>
  )
}