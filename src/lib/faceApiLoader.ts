import { FACE_ID_DEFAULTS } from '@/types/faceId'

const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models'

let modelsLoaded = false

export const loadFaceApiModels = async (): Promise<void> => {
  if (typeof faceapi === 'undefined') {
    throw new Error(
      'face-api.js não foi carregado. Valide o script no index.html antes de usar o Face ID.'
    )
  }

  await Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
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
  return (
    typeof navigator !== 'undefined' &&
    typeof indexedDB !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof faceapi !== 'undefined'
  )
}

export const FACE_ID_MODEL_CONFIG = {
  modelUrl: MODEL_URL,
  minScore: FACE_ID_DEFAULTS.minDetectionScore,
}
