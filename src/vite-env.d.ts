/// <reference types="vite/client" />
import type { FaceApi, TensorFlowNamespace } from '@/types/faceApi'

declare global {
  interface ImportMetaEnv {
    readonly VITE_APP_TITLE: string
    readonly VITE_API_URL?: string
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv
  }

  interface Window {
    tf?: TensorFlowNamespace
  }

  const faceapi: FaceApi
}

export {}
