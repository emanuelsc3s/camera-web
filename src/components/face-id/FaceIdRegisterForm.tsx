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
    <div className="space-y-4">
      <div className="grid gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="name" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Nome completo
          </Label>
          <Input
            id="name"
            value={name}
            disabled={isProcessing}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nome a ser reconhecido"
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="matricula" className="flex items-center gap-2">
            <Camera className="h-4 w-4" aria-hidden="true" />
            Matrícula (opcional)
          </Label>
          <Input
            id="matricula"
            value={matricula}
            disabled={isProcessing}
            onChange={(event) => setMatricula(event.target.value)}
            placeholder="Código interno ou identificação"
          />
        </div>
      </div>

      <FaceIdWebcamView
        mode="register"
        isProcessing={isProcessing}
        onCapture={handleCapture}
      />

      {preview && (
        <div className="rounded-md border bg-muted/40 p-3 text-sm">
          <p className="text-xs text-muted-foreground">Última captura</p>
          <img
            src={preview}
            alt="Pré-visualização do rosto capturado"
            className="mt-2 h-32 w-full rounded-md object-cover"
          />
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-[2px] h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        Dica: use iluminação frontal e mantenha o rosto centralizado para obter um vetor facial de
        boa qualidade.
      </div>

      <Button type="button" variant="outline" onClick={() => setPreview(null)} disabled={!preview}>
        Limpar pré-visualização
      </Button>
    </div>
  )
}
