import { ensureFaceApiModelsLoaded } from '@/lib/faceApiLoader'
import {
  FACE_ID_DEFAULTS,
  type FaceDetectionResult,
  type FaceIdUser,
  type FaceMatch,
} from '@/types/faceId'

export const detectSingleFace = async (
  imageElement: HTMLImageElement | HTMLVideoElement
): Promise<FaceDetectionResult | null> => {
  await ensureFaceApiModelsLoaded()

  const detection = await faceapi
    .detectSingleFace(imageElement)
    .withFaceLandmarks()
    .withFaceDescriptor()

  if (!detection) return null

  const { box } = detection.detection
  if (detection.detection.score < FACE_ID_DEFAULTS.minDetectionScore) return null

  return {
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    score: detection.detection.score,
    descriptor: detection.descriptor,
  }
}

export const detectAllFaces = async (
  videoElement: HTMLVideoElement
): Promise<FaceDetectionResult[]> => {
  await ensureFaceApiModelsLoaded()

  const detections = await faceapi
    .detectAllFaces(videoElement)
    .withFaceLandmarks()
    .withFaceDescriptors()

  return detections.map((detection: any) => {
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
}

export const createFaceMatcher = (
  users: FaceIdUser[],
  threshold: number = FACE_ID_DEFAULTS.matchThreshold
): any => {
  if (users.length === 0) return null

  const labeledDescriptors = users.map((user) => {
    const descriptorArray = new Float32Array(user.descriptors)
    return new faceapi.LabeledFaceDescriptors(user.id, [descriptorArray])
  })

  return new faceapi.FaceMatcher(labeledDescriptors, threshold)
}

export const matchFaces = async (
  videoElement: HTMLVideoElement,
  faceMatcher: any,
  users: FaceIdUser[]
): Promise<FaceMatch[]> => {
  const detections = await faceapi
    .detectAllFaces(videoElement)
    .withFaceLandmarks()
    .withFaceDescriptors()

  const results = detections.map((d: any) => faceMatcher.findBestMatch(d.descriptor))

  return results.map((result: any, index: number) => {
    const detection = detections[index]
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
}

export const generateUserId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }

  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}
