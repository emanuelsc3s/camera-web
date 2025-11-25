export interface RegisteredUser {
  id: string;
  name: string;
  descriptors: number[]; // Serialized Float32Array
  photoUrl: string;
  createdAt: number;
}

export interface FaceDetectionResult {
  x: number;
  y: number;
  width: number;
  height: number;
  score: number;
  descriptor: Float32Array;
}

export interface DetectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  distance?: number;
  color: string;
}

export interface MatchedFaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  distance: number;
  rawLabel: string;
}
