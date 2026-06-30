/**
 * Tipos e constantes usados pelo fluxo de Face ID.
 */
export interface FaceIdUser {
  id: string
  name: string
  matricula?: string
  descriptors: number[]
  photoUrl: string
  createdAt: number
  updatedAt: number
}

export interface FaceDetectionResult {
  x: number
  y: number
  width: number
  height: number
  score: number
  descriptor: Float32Array
}

export interface FaceMatch {
  x: number
  y: number
  width: number
  height: number
  label: string
  distance: number
  userId?: string
}

export interface DetectionBox {
  x: number
  y: number
  width: number
  height: number
  label: string
  color: string
  distance?: number
}

export type FaceIdMode = 'login' | 'register'
export type RecognitionStatus = 'idle' | 'detecting' | 'recognized' | 'unknown' | 'error'

export interface FaceIdConfig {
  matchThreshold: number
  minDetectionScore: number
  throttleMs: number
  videoWidth: number
  videoHeight: number
  tinyInputSize: number
}

export const FACE_ID_DEFAULTS: FaceIdConfig = {
  matchThreshold: 0.6,
  minDetectionScore: 0.6,
  throttleMs: 150,
  videoWidth: 320,
  videoHeight: 240,
  tinyInputSize: 320,
}

export const FACE_ID_AUTH_TOKEN = 'FACE_ID_AUTH'
