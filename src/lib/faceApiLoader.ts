import { FACE_ID_DEFAULTS } from '@/types/faceId'
import { ensureCameraApiSupport } from '@/lib/cameraSupport'

/**
 * URL dos modelos de IA do face-api.js
 *
 * IMPORTANTE: Modelos armazenados localmente em /public/models/ para uso OFFLINE
 *
 * Modelos incluídos:
 * - tiny_face_detector: Detecção rápida de rostos para login em tempo real
 * - ssd_mobilenetv1: Fallback local de detecção de rostos
 * - face_landmark_68: Detecção de 68 pontos faciais
 * - face_recognition: Extração de descritores (128 dimensões)
 */
const MODEL_URL = '/models'

let modelsLoaded = false
let activeDetector: 'tiny' | 'ssd' = 'tiny'

const loadPreferredDetector = async (): Promise<void> => {
  try {
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL)
    activeDetector = 'tiny'
  } catch (err) {
    console.warn('[FaceID] Tiny Face Detector indisponível, usando SSD como fallback local.', err)
    await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL)
    activeDetector = 'ssd'
  }
}

export const loadFaceApiModels = async (): Promise<void> => {
  if (typeof faceapi === 'undefined') {
    throw new Error(
      'face-api.js não foi carregado. Valide o script no index.html antes de usar o Face ID.'
    )
  }

  await Promise.all([
    loadPreferredDetector(),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ])

  modelsLoaded = true
}

export const ensureFaceApiModelsLoaded = async (): Promise<void> => {
  if (modelsLoaded) return
  await loadFaceApiModels()
}

export const isFaceIdSupported = (): boolean => {
  const cameraSupport = ensureCameraApiSupport()

  return (
    typeof navigator !== 'undefined' &&
    typeof indexedDB !== 'undefined' &&
    cameraSupport.supported &&
    typeof faceapi !== 'undefined'
  )
}

export const createFaceDetectionOptions = () => {
  if (activeDetector === 'tiny') {
    return new faceapi.TinyFaceDetectorOptions({
      inputSize: FACE_ID_DEFAULTS.tinyInputSize,
      scoreThreshold: FACE_ID_DEFAULTS.minDetectionScore,
    })
  }

  return new faceapi.SsdMobilenetv1Options({
    minConfidence: FACE_ID_DEFAULTS.minDetectionScore,
    maxResults: 1,
  })
}

export const FACE_ID_MODEL_CONFIG = {
  modelUrl: MODEL_URL,
  minScore: FACE_ID_DEFAULTS.minDetectionScore,
  get activeDetector() {
    return activeDetector
  },
}
