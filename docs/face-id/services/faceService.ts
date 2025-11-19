import { RegisteredUser, FaceDetectionResult } from '../types';

// face-api.js is loaded via script tag in index.html
declare const faceapi: any;

// Use a reliable CDN for the models to ensure the app works without local file setup
const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

export const loadModels = async (): Promise<void> => {
  if (typeof faceapi === 'undefined') {
    throw new Error("face-api.js library not loaded");
  }
  try {
    // Load the SSD Mobilenet (lighter/faster) and Landmark/Recognition models
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    console.log("Models loaded successfully");
  } catch (error) {
    console.error("Error loading models", error);
    throw new Error("Falha ao carregar modelos de visão computacional.");
  }
};

export const detectFace = async (imageElement: HTMLImageElement | HTMLVideoElement): Promise<FaceDetectionResult | null> => {
  const detection = await faceapi.detectSingleFace(imageElement)
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) return null;

  const { box } = detection.detection;
  return {
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    score: detection.detection.score,
    descriptor: detection.descriptor,
  };
};

export const createFaceMatcher = (users: RegisteredUser[]): any => {
  if (users.length === 0) return null;

  const labeledDescriptors = users.map((user) => {
    const descriptorArray = new Float32Array(user.descriptors);
    return new faceapi.LabeledFaceDescriptors(user.name, [descriptorArray]);
  });

  // 0.6 is the standard distance threshold for face matching
  return new faceapi.FaceMatcher(labeledDescriptors, 0.6);
};

export const matchFace = async (
  videoElement: HTMLVideoElement,
  faceMatcher: any
) => {
  const detections = await faceapi.detectAllFaces(videoElement)
    .withFaceLandmarks()
    .withFaceDescriptors();

  const results = detections.map((d: any) => faceMatcher.findBestMatch(d.descriptor));
  
  return results.map((result: any, i: number) => {
    const box = detections[i].detection.box;
    return {
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      label: result.toString(false), // Returns "Name" or "unknown"
      distance: result.distance,
      rawLabel: result.label
    };
  });
};