export interface FaceApiNet {
  loadFromUri: (uri: string) => Promise<void>
}

export interface TensorFlowEngine {
  startScope: () => void
  endScope: () => void
}

export interface TensorFlowNamespace {
  engine?: () => TensorFlowEngine | undefined
}

export interface FaceDetectionBox {
  x: number
  y: number
  width: number
  height: number
}

export interface FaceDetectionWithDescriptor {
  detection: {
    box: FaceDetectionBox
    score: number
  }
  descriptor: Float32Array
}

export interface FaceDetectionOptions {
  readonly _faceDetectionOptionsBrand?: never
}

export interface TinyFaceDetectorOptionsInput {
  inputSize?: number
  scoreThreshold?: number
}

export interface SsdMobilenetv1OptionsInput {
  minConfidence?: number
  maxResults?: number
}

export interface DetectSingleFaceTask {
  withFaceLandmarks: (useTinyLandmarkNet?: boolean) => {
    withFaceDescriptor: () => Promise<FaceDetectionWithDescriptor | null | undefined>
  }
}

export interface DetectAllFacesTask {
  withFaceLandmarks: (useTinyLandmarkNet?: boolean) => {
    withFaceDescriptors: () => Promise<FaceDetectionWithDescriptor[]>
  }
}

export interface FaceMatcherResult {
  toString: (withDistance?: boolean) => string
  label: string
  distance: number
}

export interface FaceMatcher {
  findBestMatch: (descriptor: Float32Array) => FaceMatcherResult
}

export interface LabeledFaceDescriptors {
  label: string
  descriptors: Float32Array[]
}

export interface FaceApi {
  nets: {
    ssdMobilenetv1: FaceApiNet
    tinyFaceDetector: FaceApiNet
    faceLandmark68Net: FaceApiNet
    faceRecognitionNet: FaceApiNet
  }
  tf?: TensorFlowNamespace
  TinyFaceDetectorOptions: new (
    options?: TinyFaceDetectorOptionsInput
  ) => FaceDetectionOptions
  SsdMobilenetv1Options: new (
    options?: SsdMobilenetv1OptionsInput
  ) => FaceDetectionOptions
  LabeledFaceDescriptors: new (
    label: string,
    descriptors: Float32Array[]
  ) => LabeledFaceDescriptors
  FaceMatcher: new (
    descriptors: LabeledFaceDescriptors[],
    threshold?: number
  ) => FaceMatcher
  detectSingleFace: (
    input: HTMLImageElement | HTMLVideoElement,
    options?: FaceDetectionOptions
  ) => DetectSingleFaceTask
  detectAllFaces: (
    input: HTMLVideoElement | HTMLImageElement,
    options?: FaceDetectionOptions
  ) => DetectAllFacesTask
}
