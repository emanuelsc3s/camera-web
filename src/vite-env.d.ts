/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare global {
  // face-api.js is loaded via CDN in index.html
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const faceapi: any
}

export {}
