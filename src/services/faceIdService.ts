import { ensureFaceApiModelsLoaded } from '@/lib/faceApiLoader'
import {
  FACE_ID_DEFAULTS,
  type FaceDetectionResult,
  type FaceIdUser,
  type FaceMatch,
} from '@/types/faceId'
import type {
  FaceDetectionBox,
  FaceDetectionWithDescriptor,
  FaceMatcher,
  FaceMatcherResult,
  TensorFlowEngine,
} from '@/types/faceApi'

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const hasValidBox = (box: { x: unknown; y: unknown; width: unknown; height: unknown }): box is FaceDetectionBox =>
  isFiniteNumber(box.x) &&
  isFiniteNumber(box.y) &&
  isFiniteNumber(box.width) &&
  isFiniteNumber(box.height)

const hasValidVideoDimensions = (video: HTMLVideoElement): boolean =>
  isFiniteNumber(video.videoWidth) &&
  isFiniteNumber(video.videoHeight) &&
  video.videoWidth > 0 &&
  video.videoHeight > 0

export const detectSingleFace = async (
  imageElement: HTMLImageElement | HTMLVideoElement
): Promise<FaceDetectionResult | null> => {
  await ensureFaceApiModelsLoaded()

  if (
    imageElement instanceof HTMLVideoElement &&
    !hasValidVideoDimensions(imageElement)
  ) {
    console.warn('[FaceID] Frame ignorado por não possuir dimensões válidas')
    return null
  }

  const tfEngine: TensorFlowEngine | undefined = faceapi.tf?.engine?.() ?? window.tf?.engine?.()
  tfEngine?.startScope()

  try {
    const detection = await faceapi
      .detectSingleFace(imageElement)
      .withFaceLandmarks()
      .withFaceDescriptor()

    if (!detection) return null

    const { box } = detection.detection
    if (!hasValidBox(box)) {
      console.warn('[FaceID] Box inválido recebido ao detectar rosto único', box)
      return null
    }

    if (detection.detection.score < FACE_ID_DEFAULTS.minDetectionScore) return null

    // Copiar descriptor antes de encerrar o escopo do TensorFlow
    const descriptorCopy = new Float32Array(detection.descriptor)

    return {
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      score: detection.detection.score,
      descriptor: descriptorCopy,
    }
  } finally {
    tfEngine?.endScope()
  }
}

export const detectAllFaces = async (
  videoElement: HTMLVideoElement
): Promise<FaceDetectionResult[]> => {
  await ensureFaceApiModelsLoaded()

  if (!hasValidVideoDimensions(videoElement)) {
    console.warn('[FaceID] Ignorando detecção: vídeo sem dimensões válidas')
    return []
  }

  const tfEngine: TensorFlowEngine | undefined = faceapi.tf?.engine?.() ?? window.tf?.engine?.()
  tfEngine?.startScope()

  try {
    const detections = await faceapi
      .detectAllFaces(videoElement)
      .withFaceLandmarks()
      .withFaceDescriptors()

    const validDetections = detections.filter((detection) => {
      const { box } = detection.detection
      const isValid = hasValidBox(box)
      if (!isValid) {
        console.warn('[FaceID] Box inválido descartado durante detecção múltipla', box)
      }
      return isValid
    })

    return validDetections.map((detection): FaceDetectionResult => {
      const { box } = detection.detection
      return {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        score: detection.detection.score,
        descriptor: detection.descriptor,
      }
    })
  } finally {
    tfEngine?.endScope()
  }
}

export const createFaceMatcher = (
  users: FaceIdUser[],
  threshold: number = FACE_ID_DEFAULTS.matchThreshold
): FaceMatcher | null => {
  if (users.length === 0) return null

  const labeledDescriptors = users.map((user) => {
    const descriptorArray = new Float32Array(user.descriptors)
    return new faceapi.LabeledFaceDescriptors(user.id, [descriptorArray])
  })

  return new faceapi.FaceMatcher(labeledDescriptors, threshold)
}

export const matchFaces = async (
  videoElement: HTMLVideoElement,
  faceMatcher: FaceMatcher,
  users: FaceIdUser[]
): Promise<FaceMatch[]> => {
  if (!hasValidVideoDimensions(videoElement)) {
    console.warn('[FaceID] Ignorando frame para matching: vídeo sem dimensões válidas')
    return []
  }

  const tfEngine: TensorFlowEngine | undefined = faceapi.tf?.engine?.() ?? window.tf?.engine?.()
  tfEngine?.startScope()

  try {
    const detections = await faceapi
      .detectAllFaces(videoElement)
      .withFaceLandmarks()
      .withFaceDescriptors()

    const validDetections = detections.filter((detection) => {
      const { box } = detection.detection
      const isValid = hasValidBox(box)
      if (!isValid) {
        console.warn('[FaceID] Box inválido descartado antes do FaceMatcher', box)
      }
      return isValid
    })

    if (validDetections.length === 0) return []

    const results = validDetections.map((detection) =>
      faceMatcher.findBestMatch(detection.descriptor)
    )

    return results.map((result: FaceMatcherResult, index: number) => {
      const detection: FaceDetectionWithDescriptor = validDetections[index]
      const box = detection.detection.box
      const matchedUser = users.find((user) => user.id === result.label)

      return {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        label: matchedUser ? matchedUser.name : 'unknown',
        distance: result.distance,
        userId: matchedUser?.id,
      }
    })
  } finally {
    tfEngine?.endScope()
  }
}

export const generateUserId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }

  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}
