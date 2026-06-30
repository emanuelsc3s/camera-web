import { useCallback, useMemo, useState } from 'react'
import { Check, Clipboard, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  CAMERA_BROWSER_CONFIG,
  ensureCameraApiSupport,
  getCameraErrorMessage,
  getCurrentCameraOrigin,
} from '@/lib/cameraSupport'

interface FaceIdCameraAccessHelpProps {
  onSupportChange?: (message: string | null) => void
}

type CopyTarget = 'origin' | 'chrome' | 'edge'

const copyToClipboard = async (value: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }

  const input = document.createElement('textarea')
  input.value = value
  input.setAttribute('readonly', 'true')
  input.style.position = 'fixed'
  input.style.left = '-9999px'
  document.body.appendChild(input)
  input.select()
  document.execCommand('copy')
  document.body.removeChild(input)
}

export function FaceIdCameraAccessHelp({ onSupportChange }: FaceIdCameraAccessHelpProps) {
  const origin = useMemo(() => getCurrentCameraOrigin(), [])
  const [copiedTarget, setCopiedTarget] = useState<CopyTarget | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [checkMessage, setCheckMessage] = useState<string | null>(null)

  const handleCopy = useCallback(async (target: CopyTarget, value: string) => {
    await copyToClipboard(value)
    setCopiedTarget(target)
    window.setTimeout(() => setCopiedTarget(null), 1800)
  }, [])

  const handleCheckAccess = useCallback(async () => {
    setIsChecking(true)
    setCheckMessage(null)

    const support = ensureCameraApiSupport()
    if (!support.supported) {
      const message = support.message ?? getCameraErrorMessage(new Error('getUserMedia is not implemented'))
      setCheckMessage(message)
      onSupportChange?.(message)
      setIsChecking(false)
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      stream.getTracks().forEach((track) => track.stop())
      setCheckMessage('A câmera foi liberada para esta origem. Clique em tentar novamente para abrir a webcam.')
      onSupportChange?.(null)
    } catch (err) {
      const message = getCameraErrorMessage(err)
      setCheckMessage(message)
      onSupportChange?.(message)
    } finally {
      setIsChecking(false)
    }
  }, [onSupportChange])

  return (
    <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-100">
      <div className="space-y-2">
        <p className="font-medium">Liberação para rede local</p>
        <div className="rounded border border-amber-500/30 bg-background/70 px-2 py-1 font-mono text-[11px] text-foreground">
          {origin || 'Origem indisponível'}
        </div>
        <ol className="list-decimal space-y-1 pl-4">
          <li>Copie a origem acima.</li>
          <li>Abra a configuração do Chrome ou Edge em uma nova aba.</li>
          <li>Cole a origem em “Insecure origins treated as secure”, habilite e reinicie o navegador.</li>
        </ol>

        <div className="flex flex-wrap gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2 text-[11px]"
            onClick={() => void handleCopy('origin', origin)}
            disabled={!origin}
          >
            {copiedTarget === 'origin' ? (
              <Check className="mr-1 h-3 w-3" aria-hidden="true" />
            ) : (
              <Clipboard className="mr-1 h-3 w-3" aria-hidden="true" />
            )}
            Origem
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2 text-[11px]"
            onClick={() => void handleCopy('chrome', CAMERA_BROWSER_CONFIG.chromeFlagsUrl)}
          >
            {copiedTarget === 'chrome' ? (
              <Check className="mr-1 h-3 w-3" aria-hidden="true" />
            ) : (
              <Clipboard className="mr-1 h-3 w-3" aria-hidden="true" />
            )}
            Chrome
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2 text-[11px]"
            onClick={() => void handleCopy('edge', CAMERA_BROWSER_CONFIG.edgeFlagsUrl)}
          >
            {copiedTarget === 'edge' ? (
              <Check className="mr-1 h-3 w-3" aria-hidden="true" />
            ) : (
              <Clipboard className="mr-1 h-3 w-3" aria-hidden="true" />
            )}
            Edge
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-7 px-2 text-[11px]"
            onClick={() => void handleCheckAccess()}
            disabled={isChecking}
          >
            <RotateCcw className="mr-1 h-3 w-3" aria-hidden="true" />
            {isChecking ? 'Verificando...' : 'Verificar'}
          </Button>
        </div>

        {checkMessage && (
          <p className="rounded border border-amber-500/30 bg-background/70 px-2 py-1 text-[11px] text-foreground">
            {checkMessage}
          </p>
        )}
      </div>
    </div>
  )
}
