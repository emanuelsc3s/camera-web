type LegacyGetUserMedia = (
  constraints: MediaStreamConstraints,
  successCallback: (stream: MediaStream) => void,
  errorCallback: (error: DOMException) => void
) => void

type LegacyNavigator = Navigator & {
  getUserMedia?: LegacyGetUserMedia
  webkitGetUserMedia?: LegacyGetUserMedia
  mozGetUserMedia?: LegacyGetUserMedia
  msGetUserMedia?: LegacyGetUserMedia
}

type WritableMediaDevices = Partial<MediaDevices> & {
  getUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream>
  enumerateDevices?: () => Promise<MediaDeviceInfo[]>
}

export interface CameraSupportResult {
  supported: boolean
  message?: string
}

export const getCurrentCameraOrigin = () => {
  if (typeof window === 'undefined') return ''

  return window.location.origin
}

export const CAMERA_BROWSER_CONFIG = {
  chromeFlagsUrl: 'chrome://flags/#unsafely-treat-insecure-origin-as-secure',
  edgeFlagsUrl: 'edge://flags/#unsafely-treat-insecure-origin-as-secure',
}

export const getCameraUnsupportedMessage = () => {
  return 'O navegador não disponibilizou acesso à câmera para este endereço. Em rede local usando IP e porta, libere esta origem nas configurações ou políticas do navegador e tente novamente.'
}

const installEnumerateDevicesFallback = (mediaDevices: WritableMediaDevices) => {
  if (typeof mediaDevices.enumerateDevices === 'function') return

  try {
    Object.defineProperty(mediaDevices, 'enumerateDevices', {
      configurable: true,
      value: async () => [],
    })
  } catch {
    // Alguns navegadores expõem mediaDevices como objeto não extensível.
  }
}

const isStubbedGetUserMedia = (getUserMedia: unknown) => {
  if (typeof getUserMedia !== 'function') return false

  return Function.prototype.toString
    .call(getUserMedia)
    .includes('getUserMedia is not implemented')
}

export const ensureCameraApiSupport = (): CameraSupportResult => {
  if (typeof navigator === 'undefined') {
    return {
      supported: false,
      message: 'Ambiente sem suporte ao acesso à câmera.',
    }
  }

  const legacyNavigator = navigator as LegacyNavigator
  const currentMediaDevices = navigator.mediaDevices as WritableMediaDevices | undefined

  if (
    typeof currentMediaDevices?.getUserMedia === 'function' &&
    !isStubbedGetUserMedia(currentMediaDevices.getUserMedia)
  ) {
    installEnumerateDevicesFallback(currentMediaDevices)
    return { supported: true }
  }

  const legacyGetUserMedia =
    legacyNavigator.getUserMedia ??
    legacyNavigator.webkitGetUserMedia ??
    legacyNavigator.mozGetUserMedia ??
    legacyNavigator.msGetUserMedia

  if (!legacyGetUserMedia) {
    return {
      supported: false,
      message: getCameraUnsupportedMessage(),
    }
  }

  const mediaDevices: WritableMediaDevices = currentMediaDevices ?? {}

  try {
    Object.defineProperty(mediaDevices, 'getUserMedia', {
      configurable: true,
      value: (constraints: MediaStreamConstraints) =>
        new Promise<MediaStream>((resolve, reject) => {
          legacyGetUserMedia.call(legacyNavigator, constraints, resolve, reject)
        }),
    })

    installEnumerateDevicesFallback(mediaDevices)

    if (!currentMediaDevices) {
      Object.defineProperty(legacyNavigator, 'mediaDevices', {
        configurable: true,
        value: mediaDevices,
      })
    }

    return { supported: true }
  } catch {
    return {
      supported: false,
      message: getCameraUnsupportedMessage(),
    }
  }
}

export const isCameraApiUnsupportedError = (err: unknown) => {
  if (!err || !(err instanceof Error)) return false

  return err.message.includes('getUserMedia is not implemented') || err.message.includes('getUserMedia')
}

export const getCameraErrorMessage = (err: unknown) => {
  const support = ensureCameraApiSupport()
  if (!support.supported || isCameraApiUnsupportedError(err)) {
    return support.message ?? getCameraUnsupportedMessage()
  }

  if (!(err instanceof Error)) {
    return 'Não foi possível acessar a câmera. Verifique permissões ou tente novamente.'
  }

  const name = (err as DOMException).name
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Permissão de câmera negada ou bloqueada pelo navegador.'
  }
  if (name === 'NotReadableError') {
    return 'Outro app ou aba está usando a câmera. Feche-o e tente novamente.'
  }
  if (name === 'OverconstrainedError') {
    return 'A câmera não suporta a resolução solicitada.'
  }
  if (name === 'NotFoundError') {
    return 'Nenhuma câmera foi encontrada.'
  }

  return err.message || 'Não foi possível acessar a câmera. Verifique permissões ou tente novamente.'
}
