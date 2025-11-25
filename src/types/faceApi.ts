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
    faceLandmark68Net: FaceApiNet
    faceRecognitionNet: FaceApiNet
  }
  tf?: TensorFlowNamespace
  LabeledFaceDescriptors: new (
    label: string,
    descriptors: Float32Array[]
  ) => LabeledFaceDescriptors
  FaceMatcher: new (
    descriptors: LabeledFaceDescriptors[],
    threshold?: number
  ) => FaceMatcher
  detectSingleFace: (
    input: HTMLImageElement | HTMLVideoElement
  ) => {
    withFaceLandmarks: () => {
      withFaceDescriptor: () => Promise<FaceDetectionWithDescriptor | null>
    }
  }
  detectAllFaces: (
    input: HTMLVideoElement | HTMLImageElement
  ) => {
    withFaceLandmarks: () => {
      withFaceDescriptors: () => Promise<FaceDetectionWithDescriptor[]>
    }
  }
}
