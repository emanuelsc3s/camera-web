# Exemplos de Código - Implementação Face ID

Este documento contém exemplos de código prontos para uso na implementação do Face ID.

---

## 1. Tipos TypeScript (types/faceId.ts)

```typescript
// types/faceId.ts

/**
 * Usuário cadastrado com biometria facial
 */
export interface FaceIdUser {
  id: string                    // UUID gerado com crypto.randomUUID()
  name: string                  // Nome completo do usuário
  matricula?: string            // Matrícula (opcional)
  descriptors: number[]         // Float32Array serializado (128 dimensões)
  photoUrl: string              // Data URL da foto (base64)
  createdAt: number             // Timestamp de criação
  updatedAt: number             // Timestamp de última atualização
}

/**
 * Resultado da detecção facial
 */
export interface FaceDetectionResult {
  x: number                     // Posição X do bounding box
  y: number                     // Posição Y do bounding box
  width: number                 // Largura do bounding box
  height: number                // Altura do bounding box
  score: number                 // Confiança da detecção (0-1)
  descriptor: Float32Array      // Vetor de características (128D)
}

/**
 * Resultado do matching facial
 */
export interface FaceMatch {
  x: number
  y: number
  width: number
  height: number
  label: string                 // Nome do usuário ou "unknown"
  distance: number              // Distância euclidiana (0-1)
  userId?: string               // ID do usuário (se reconhecido)
}

/**
 * Box de detecção para renderização
 */
export interface DetectionBox {
  x: number
  y: number
  width: number
  height: number
  label: string
  color: string                 // Cor do box (ex: "#10b981" ou "#ef4444")
  distance?: number
}

/**
 * Modos do modal Face ID
 */
export type FaceIdMode = 'login' | 'register'

/**
 * Status do reconhecimento
 */
export type RecognitionStatus = 
  | 'idle'          // Aguardando
  | 'detecting'     // Detectando rostos
  | 'recognized'    // Usuário reconhecido
  | 'unknown'       // Rosto desconhecido
  | 'error'         // Erro na detecção

/**
 * Configurações do Face ID
 */
export interface FaceIdConfig {
  matchThreshold: number        // Threshold de matching (padrão: 0.6)
  minDetectionScore: number     // Score mínimo de detecção (padrão: 0.8)
  throttleMs: number            // Intervalo entre processamentos (padrão: 200ms)
  videoWidth: number            // Largura do vídeo (padrão: 640)
  videoHeight: number           // Altura do vídeo (padrão: 480)
}

/**
 * Constantes padrão
 */
export const FACE_ID_DEFAULTS: FaceIdConfig = {
  matchThreshold: 0.6,
  minDetectionScore: 0.8,
  throttleMs: 200,
  videoWidth: 640,
  videoHeight: 480,
}
```

---

## 2. Declaração Global (vite-env.d.ts)

```typescript
/// <reference types="vite/client" />

/**
 * Declaração global para face-api.js
 * A biblioteca é carregada via script tag no index.html
 */
declare global {
  const faceapi: any
}

export {}
```

---

## 3. Carregador de Modelos (lib/faceApiLoader.ts)

```typescript
// lib/faceApiLoader.ts

/**
 * URL dos modelos de IA do face-api.js
 * Hospedados no GitHub Pages oficial
 */
const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models'

/**
 * Flag para controlar se os modelos já foram carregados
 */
let modelsLoaded = false

/**
 * Carrega os modelos de IA necessários para detecção e reconhecimento facial
 * 
 * Modelos carregados:
 * - ssdMobilenetv1: Detecção de rostos (leve e rápido)
 * - faceLandmark68Net: Detecção de 68 pontos faciais
 * - faceRecognitionNet: Extração de descritores (128 dimensões)
 * 
 * @throws Error se face-api.js não estiver carregado
 * @throws Error se houver falha no carregamento dos modelos
 */
export const loadFaceApiModels = async (): Promise<void> => {
  if (typeof faceapi === 'undefined') {
    throw new Error(
      'face-api.js não está carregado. Verifique se o script está incluído no index.html'
    )
  }

  try {
    console.log('[FaceAPI] Iniciando carregamento de modelos...')
    
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ])
    
    console.log('[FaceAPI] Modelos carregados com sucesso!')
  } catch (error) {
    console.error('[FaceAPI] Erro ao carregar modelos:', error)
    throw new Error('Falha ao carregar modelos de visão computacional.')
  }
}

/**
 * Garante que os modelos estão carregados antes de prosseguir
 * Carrega apenas uma vez (singleton pattern)
 */
export const ensureFaceApiModelsLoaded = async (): Promise<void> => {
  if (modelsLoaded) {
    console.log('[FaceAPI] Modelos já carregados, pulando...')
    return
  }
  
  await loadFaceApiModels()
  modelsLoaded = true
}

/**
 * Verifica se o navegador suporta Face ID
 */
export const isFaceIdSupported = (): boolean => {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    !!navigator.mediaDevices.getUserMedia &&
    typeof indexedDB !== 'undefined' &&
    typeof faceapi !== 'undefined'
  )
}
```

---

## 4. Serviço de Detecção (services/faceIdService.ts)

```typescript
// services/faceIdService.ts

import { FaceDetectionResult, FaceMatch, FaceIdUser } from '@/types/faceId'

/**
 * Detecta um único rosto em uma imagem
 *
 * @param imageElement Elemento de imagem ou vídeo
 * @returns Resultado da detecção ou null se nenhum rosto for encontrado
 */
export const detectSingleFace = async (
  imageElement: HTMLImageElement | HTMLVideoElement
): Promise<FaceDetectionResult | null> => {
  const detection = await faceapi
    .detectSingleFace(imageElement)
    .withFaceLandmarks()
    .withFaceDescriptor()

  if (!detection) return null

  const { box } = detection.detection

  return {
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    score: detection.detection.score,
    descriptor: detection.descriptor,
  }
}

/**
 * Detecta todos os rostos em um vídeo
 *
 * @param videoElement Elemento de vídeo
 * @returns Array de resultados de detecção
 */
export const detectAllFaces = async (
  videoElement: HTMLVideoElement
): Promise<FaceDetectionResult[]> => {
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

/**
 * Cria um matcher de rostos a partir de usuários cadastrados
 *
 * @param users Lista de usuários cadastrados
 * @param threshold Threshold de matching (padrão: 0.6)
 * @returns FaceMatcher ou null se não houver usuários
 */
export const createFaceMatcher = (
  users: FaceIdUser[],
  threshold: number = 0.6
): any => {
  if (users.length === 0) return null

  const labeledDescriptors = users.map((user) => {
    const descriptorArray = new Float32Array(user.descriptors)
    return new faceapi.LabeledFaceDescriptors(user.name, [descriptorArray])
  })

  return new faceapi.FaceMatcher(labeledDescriptors, threshold)
}

/**
 * Realiza matching de rostos em um vídeo
 *
 * @param videoElement Elemento de vídeo
 * @param faceMatcher Matcher criado com createFaceMatcher
 * @param users Lista de usuários (para recuperar IDs)
 * @returns Array de matches encontrados
 */
export const matchFaces = async (
  videoElement: HTMLVideoElement,
  faceMatcher: any,
  users: FaceIdUser[]
): Promise<FaceMatch[]> => {
  const detections = await faceapi
    .detectAllFaces(videoElement)
    .withFaceLandmarks()
    .withFaceDescriptors()

  const results = detections.map((d: any) =>
    faceMatcher.findBestMatch(d.descriptor)
  )

  return results.map((result: any, i: number) => {
    const box = detections[i].detection.box
    const isUnknown = result.label === 'unknown'

    // Encontra o ID do usuário se reconhecido
    const userId = isUnknown
      ? undefined
      : users.find(u => u.name === result.label)?.id

    return {
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      label: result.toString(false), // Retorna "Nome" ou "unknown"
      distance: result.distance,
      userId,
    }
  })
}

/**
 * Gera ID único para usuário
 */
export const generateUserId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback para ambientes sem crypto.randomUUID
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}
```

---

## 5. Serviço de Armazenamento (services/faceIdStorageService.ts)

```typescript
// services/faceIdStorageService.ts

import { FaceIdUser } from '@/types/faceId'

const DB_NAME = 'CameraWebFaceIdDB'
const STORE_NAME = 'faceIdUsers'
const DB_VERSION = 1

/**
 * Inicializa o banco de dados IndexedDB
 */
export const initFaceIdDB = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(new Error('Erro ao abrir banco de dados'))

    request.onsuccess = () => resolve()

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        console.log('[FaceIdDB] Object store criado:', STORE_NAME)
      }
    }
  })
}

/**
 * Obtém conexão com o banco de dados
 */
const getDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(new Error('Erro ao abrir banco de dados'))
    request.onsuccess = () => resolve(request.result)
  })
}

/**
 * Salva ou atualiza um usuário no banco de dados
 */
export const saveFaceIdUser = async (user: FaceIdUser): Promise<void> => {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.put(user)

    request.onsuccess = () => {
      console.log('[FaceIdDB] Usuário salvo:', user.name)
      resolve()
    }
    request.onerror = () => reject(new Error('Erro ao salvar usuário'))
  })
}

/**
 * Recupera todos os usuários cadastrados
 */
export const getAllFaceIdUsers = async (): Promise<FaceIdUser[]> => {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.getAll()

    request.onsuccess = () => {
      console.log('[FaceIdDB] Usuários carregados:', request.result.length)
      resolve(request.result as FaceIdUser[])
    }
    request.onerror = () => reject(new Error('Erro ao buscar usuários'))
  })
}

/**
 * Recupera um usuário por ID
 */
export const getFaceIdUserById = async (id: string): Promise<FaceIdUser | null> => {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.get(id)

    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(new Error('Erro ao buscar usuário'))
  })
}

/**
 * Deleta um usuário do banco de dados
 */
export const deleteFaceIdUser = async (id: string): Promise<void> => {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.delete(id)

    request.onsuccess = () => {
      console.log('[FaceIdDB] Usuário deletado:', id)
      resolve()
    }
    request.onerror = () => reject(new Error('Erro ao deletar usuário'))
  })
}

/**
 * Remove todos os usuários do banco de dados
 */
export const clearAllFaceIdUsers = async (): Promise<void> => {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.clear()

    request.onsuccess = () => {
      console.log('[FaceIdDB] Todos os usuários removidos')
      resolve()
    }
    request.onerror = () => reject(new Error('Erro ao limpar banco de dados'))
  })
}
```

---

## 6. Modificação do index.html

Adicionar antes do fechamento da tag `</head>`:

```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Camera Web - Sistema de Inspeção</title>

    <!-- ADICIONAR: Biblioteca face-api.js -->
    <script
      src="https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js"
      crossorigin="anonymous"
    ></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

## 7. Modificação do LoginPage.tsx

```typescript
// src/pages/LoginPage.tsx

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useLocation, useNavigate } from 'react-router-dom'
import { Loader2, ScanFace } from 'lucide-react'

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import FaceIdModal from '@/components/face-id/FaceIdModal' // NOVO IMPORT

// ... resto do código existente ...

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isAuthenticated, isLoading, loginError } = useAuth()

  // NOVO: Estado do modal Face ID
  const [faceIdModalOpen, setFaceIdModalOpen] = useState(false)

  // ... resto do código existente ...

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Acessar conta</CardTitle>
          <CardDescription>
            Informe suas credenciais para entrar no sistema de inspeção.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* ... campos do formulário ... */}

            <div className="flex flex-row gap-2 mt-2">
              <Button
                type="submit"
                className="flex-1"
                disabled={isLoading}
              >
                {isLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                )}
                <span>{isLoading ? 'Entrando...' : 'Entrar'}</span>
              </Button>

              {/* MODIFICADO: Adicionar onClick */}
              <Button
                type="button"
                className="flex-1"
                onClick={() => setFaceIdModalOpen(true)}
              >
                <ScanFace className="mr-2 h-4 w-4" aria-hidden="true" />
                <span>Face ID</span>
              </Button>
            </div>
          </form>
        </CardContent>

        <CardFooter>
          <p className="text-xs text-muted-foreground text-center w-full">
            As credenciais são validadas apenas no navegador nesta fase do
            projeto. Quando a API oficial estiver disponível, este fluxo
            passará a usar autenticação real no backend.
          </p>
        </CardFooter>
      </Card>

      {/* NOVO: Modal Face ID */}
      <FaceIdModal
        open={faceIdModalOpen}
        onOpenChange={setFaceIdModalOpen}
      />
    </div>
  )
}
```

---

## 8. Exemplo de Hook useFaceId

```typescript
// hooks/useFaceId.ts

import { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import {
  FaceIdUser,
  FaceIdMode,
  RecognitionStatus,
  DetectionBox,
  FaceMatch,
  FACE_ID_DEFAULTS,
} from '@/types/faceId'
import {
  detectSingleFace,
  matchFaces,
  createFaceMatcher,
  generateUserId,
} from '@/services/faceIdService'
import {
  initFaceIdDB,
  getAllFaceIdUsers,
  saveFaceIdUser,
  deleteFaceIdUser,
  getFaceIdUserById,
} from '@/services/faceIdStorageService'
import { ensureFaceApiModelsLoaded } from '@/lib/faceApiLoader'

export const useFaceId = () => {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [mode, setMode] = useState<FaceIdMode>('login')
  const [status, setStatus] = useState<RecognitionStatus>('idle')
  const [users, setUsers] = useState<FaceIdUser[]>([])
  const [detectedBoxes, setDetectedBoxes] = useState<DetectionBox[]>([])
  const [recognizedUser, setRecognizedUser] = useState<FaceIdUser | null>(null)

  const lastProcessedTime = useRef<number>(0)
  const faceMatcher = useRef<any>(null)

  // Inicialização
  useEffect(() => {
    const init = async () => {
      try {
        setIsLoading(true)

        // Inicializa DB
        await initFaceIdDB()

        // Carrega modelos de IA
        await ensureFaceApiModelsLoaded()

        // Carrega usuários cadastrados
        const savedUsers = await getAllFaceIdUsers()
        setUsers(savedUsers)

        setIsInitialized(true)
        console.log('[useFaceId] Inicializado com sucesso')
      } catch (error) {
        console.error('[useFaceId] Erro na inicialização:', error)
        toast.error('Erro ao inicializar Face ID')
      } finally {
        setIsLoading(false)
      }
    }

    init()
  }, [])

  // Atualiza matcher quando usuários mudam
  useEffect(() => {
    if (users.length > 0) {
      faceMatcher.current = createFaceMatcher(users, FACE_ID_DEFAULTS.matchThreshold)
    } else {
      faceMatcher.current = null
    }
  }, [users])

  // Alterna entre modos
  const switchMode = useCallback((newMode: FaceIdMode) => {
    setMode(newMode)
    setStatus('idle')
    setDetectedBoxes([])
    setRecognizedUser(null)
  }, [])

  // Processa frame de reconhecimento
  const processRecognitionFrame = useCallback(async (video: HTMLVideoElement) => {
    // Throttling
    const now = Date.now()
    if (now - lastProcessedTime.current < FACE_ID_DEFAULTS.throttleMs) return
    lastProcessedTime.current = now

    if (!faceMatcher.current || users.length === 0) {
      setDetectedBoxes([])
      return
    }

    try {
      setStatus('detecting')

      const matches = await matchFaces(video, faceMatcher.current, users)

      // Converte para DetectionBox
      const boxes: DetectionBox[] = matches.map((match: FaceMatch) => ({
        x: match.x,
        y: match.y,
        width: match.width,
        height: match.height,
        label: match.label,
        distance: match.distance,
        color: match.userId ? '#10b981' : '#ef4444', // Verde ou vermelho
      }))

      setDetectedBoxes(boxes)

      // Verifica se algum usuário foi reconhecido
      const recognizedMatch = matches.find(m => m.userId)
      if (recognizedMatch && recognizedMatch.userId) {
        const user = await getFaceIdUserById(recognizedMatch.userId)
        if (user) {
          setRecognizedUser(user)
          setStatus('recognized')
        }
      } else {
        setStatus(matches.length > 0 ? 'unknown' : 'idle')
      }
    } catch (error) {
      console.error('[useFaceId] Erro no processamento:', error)
      setStatus('error')
    }
  }, [users])

  // Registra novo usuário
  const registerUser = useCallback(async (
    name: string,
    matricula: string | undefined,
    photoUrl: string,
    descriptors: Float32Array
  ) => {
    try {
      const newUser: FaceIdUser = {
        id: generateUserId(),
        name: name.trim(),
        matricula: matricula?.trim(),
        descriptors: Array.from(descriptors),
        photoUrl,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      await saveFaceIdUser(newUser)
      setUsers(prev => [...prev, newUser])

      toast.success(`Usuário ${newUser.name} cadastrado com sucesso!`)
      return newUser
    } catch (error) {
      console.error('[useFaceId] Erro ao registrar usuário:', error)
      toast.error('Erro ao cadastrar usuário')
      throw error
    }
  }, [])

  // Deleta usuário
  const deleteUser = useCallback(async (id: string) => {
    try {
      await deleteFaceIdUser(id)
      setUsers(prev => prev.filter(u => u.id !== id))
      toast.success('Usuário removido com sucesso')
    } catch (error) {
      console.error('[useFaceId] Erro ao deletar usuário:', error)
      toast.error('Erro ao remover usuário')
      throw error
    }
  }, [])

  return {
    isInitialized,
    isLoading,
    mode,
    status,
    users,
    detectedBoxes,
    recognizedUser,
    switchMode,
    processRecognitionFrame,
    registerUser,
    deleteUser,
  }
}
```

---

## 9. Resumo de Instalação

```bash
# Instalar dependências
npm install face-api.js@0.22.2 react-webcam@7.2.0

# Instalar tipos (dev)
npm install --save-dev @types/face-api.js
```

---

## 10. Checklist de Arquivos a Criar

- [ ] `src/types/faceId.ts`
- [ ] `src/lib/faceApiLoader.ts`
- [ ] `src/services/faceIdService.ts`
- [ ] `src/services/faceIdStorageService.ts`
- [ ] `src/hooks/useFaceId.ts`
- [ ] `src/components/face-id/FaceIdModal.tsx`
- [ ] `src/components/face-id/FaceIdWebcamView.tsx`
- [ ] `src/components/face-id/FaceIdRegisterForm.tsx`
- [ ] `src/components/face-id/FaceIdRecognitionView.tsx`

---

## 11. Próximos Passos

1. Revisar e aprovar os exemplos de código
2. Criar os arquivos base conforme checklist
3. Implementar componentes UI
4. Testar fluxo completo
5. Ajustar conforme necessário


