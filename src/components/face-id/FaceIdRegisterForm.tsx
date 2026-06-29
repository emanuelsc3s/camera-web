import { useCallback, useState } from 'react'
import { AlertCircle, Camera, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FaceIdWebcamView } from '@/components/face-id/FaceIdWebcamView'
import { detectSingleFace } from '@/services/faceIdService'

interface FaceIdRegisterFormProps {
  onRegister: (input: {
    name: string
    matricula?: string
    photoUrl: string
    descriptor: Float32Array
  }) => Promise<void>
}

export function FaceIdRegisterForm({ onRegister }: FaceIdRegisterFormProps) {
  const [name, setName] = useState('')
  const [matricula, setMatricula] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const handleCapture = useCallback(
    async (imageSrc: string) => {
      if (!name.trim()) {
        setError('Informe o nome antes de capturar.')
        return
      }

      setIsProcessing(true)
      setError(null)
      setPreview(imageSrc)

      try {
        const img = new Image()
        img.src = imageSrc
        await img.decode()

        const detection = await detectSingleFace(img)
        if (!detection) {
          setError('Nenhum rosto válido encontrado. Tente aproximar e garantir boa iluminação.')
          return
        }

        await onRegister({
          name: name.trim(),
          matricula: matricula.trim() || undefined,
          photoUrl: imageSrc,
          descriptor: detection.descriptor,
        })

        setName('')
        setMatricula('')
      } catch (err) {
        console.error('[FaceID] Falha ao capturar rosto', err)
        setError('Não foi possível processar o rosto. Tente novamente.')
      } finally {
        setIsProcessing(false)
      }
    },
    [matricula, name, onRegister]
  )

  return (
    <div className="flex-1 flex flex-col gap-2 min-h-0">
      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-1">
          <Label htmlFor="name" className="flex items-center gap-1.5 text-xs">
            <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
            Nome completo
          </Label>
          <Input
            id="name"
            value={name}
            disabled={isProcessing}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nome"
            className="h-8 text-sm"
          />
        </div>

        <div className="grid gap-1">
          <Label htmlFor="matricula" className="flex items-center gap-1.5 text-xs">
            <Camera className="h-3.5 w-3.5" aria-hidden="true" />
            Matrícula (opcional)
          </Label>
          <Input
            id="matricula"
            value={matricula}
            disabled={isProcessing}
            onChange={(event) => setMatricula(event.target.value)}
            placeholder="Código"
            className="h-8 text-sm"
          />
        </div>
      </div>

      <FaceIdWebcamView
        mode="register"
        isProcessing={isProcessing}
        onCapture={handleCapture}
      />

      {preview && (
        <div className="flex items-center gap-2 rounded border bg-muted/40 px-2 py-1.5">
          <img
            src={preview}
            alt="Pré-visualização do rosto capturado"
            className="h-12 w-12 rounded object-cover"
          />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Captura realizada</p>
          </div>
          <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setPreview(null)}>
            Limpar
          </Button>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-1.5 rounded border border-destructive/40 bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
          <AlertCircle className="mt-[1px] h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
