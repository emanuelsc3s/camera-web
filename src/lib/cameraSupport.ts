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

const isLocalhost = () => {
  if (typeof window === 'undefined') return false

  return ['localhost', '127.0.0.1', '[::1]', '::1'].includes(window.location.hostname)
}

export const isInsecureCameraContext = () => {
  if (typeof window === 'undefined') return false

  return window.isSecureContext === false && !isLocalhost()
}

export const getCameraUnsupportedMessage = () => {
  if (isInsecureCameraContext()) {
    return 'A câmera só pode ser usada em HTTPS ou localhost. Se você abriu o sistema por http://IP-da-maquina, o navegador bloqueia o Face ID; acesse por HTTPS ou execute o sistema localmente nessa máquina.'
  }

  return 'Este navegador não oferece suporte ao acesso à câmera. Use uma versão atual do Chrome, Edge ou Firefox.'
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

  if (isInsecureCameraContext()) {
    return {
      supported: false,
      message: getCameraUnsupportedMessage(),
    }
  }

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
