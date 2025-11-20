import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ensureFaceApiModelsLoaded } from '@/lib/faceApiLoader'
import {
  generateUserId,
  createFaceMatcher,
  matchFaces,
} from '@/services/faceIdService'
import {
  clearAllFaceIdUsers,
  deleteFaceIdUser,
  getAllFaceIdUsers,
  getFaceIdUserById,
  initFaceIdDB,
  saveFaceIdUser,
} from '@/services/faceIdStorageService'
import {
  FACE_ID_DEFAULTS,
  type DetectionBox,
  type FaceIdMode,
  type FaceIdUser,
  type RecognitionStatus,
} from '@/types/faceId'

export const useFaceId = () => {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [mode, setMode] = useState<FaceIdMode>('login')
  const [status, setStatus] = useState<RecognitionStatus>('idle')
  const [users, setUsers] = useState<FaceIdUser[]>([])
  const [detectedBoxes, setDetectedBoxes] = useState<DetectionBox[]>([])
  const [recognizedUser, setRecognizedUser] = useState<FaceIdUser | null>(null)
  const [error, setError] = useState<string | null>(null)

  const lastProcessedTime = useRef<number>(0)
  const faceMatcher = useRef<any>(null)

  useEffect(() => {
    const init = async () => {
      try {
        setIsLoading(true)
        await initFaceIdDB()
        await ensureFaceApiModelsLoaded()
        const savedUsers = await getAllFaceIdUsers()
        setUsers(savedUsers)
        setIsInitialized(true)
        setError(null)
      } catch (err) {
        console.error('[FaceID] Erro na inicialização:', err)
        setError('Erro ao inicializar Face ID')
        toast.error('Erro ao inicializar Face ID')
      } finally {
        setIsLoading(false)
      }
    }

    void init()
  }, [])

  useEffect(() => {
    if (users.length === 0) {
      faceMatcher.current = null
      return
    }

    faceMatcher.current = createFaceMatcher(users, FACE_ID_DEFAULTS.matchThreshold)
  }, [users])

  const switchMode = useCallback((newMode: FaceIdMode) => {
    setMode(newMode)
    setStatus('idle')
    setDetectedBoxes([])
    setRecognizedUser(null)
  }, [])

  const resetRecognition = useCallback(() => {
    setStatus('idle')
    setDetectedBoxes([])
    setRecognizedUser(null)
  }, [])

  const processRecognitionFrame = useCallback(
    async (video: HTMLVideoElement) => {
      const now = Date.now()
      if (now - lastProcessedTime.current < FACE_ID_DEFAULTS.throttleMs) return
      lastProcessedTime.current = now

      if (!faceMatcher.current || users.length === 0) {
        setDetectedBoxes([])
        setStatus('idle')
        return
      }

      try {
        setStatus('detecting')
        const matches = await matchFaces(video, faceMatcher.current, users)

        const boxes: DetectionBox[] = matches.map((match) => ({
          x: match.x,
          y: match.y,
          width: match.width,
          height: match.height,
          label: match.userId ? match.label : 'Desconhecido',
          distance: match.distance,
          color: match.userId ? '#22c55e' : '#ef4444',
        }))

        setDetectedBoxes(boxes)

        const recognizedMatch = matches.find((m) => m.userId)
        if (recognizedMatch?.userId) {
          const user = await getFaceIdUserById(recognizedMatch.userId)
          if (user) {
            setRecognizedUser(user)
            setStatus('recognized')
            return
          }
        }

        setStatus(matches.length > 0 ? 'unknown' : 'idle')
      } catch (err) {
        console.error('[FaceID] Erro no processamento:', err)
        setStatus('error')
        setError('Erro ao processar reconhecimento')
      }
    },
    [users]
  )

  const registerUser = useCallback(
    async (input: {
      name: string
      matricula?: string
      photoUrl: string
      descriptor: Float32Array
    }): Promise<FaceIdUser> => {
      const newUser: FaceIdUser = {
        id: generateUserId(),
        name: input.name.trim(),
        matricula: input.matricula?.trim(),
        descriptors: Array.from(input.descriptor),
        photoUrl: input.photoUrl,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      await saveFaceIdUser(newUser)
      setUsers((prev) => [...prev, newUser])
      setRecognizedUser(null)
      setStatus('idle')
      setDetectedBoxes([])
      toast.success(`Usuário ${newUser.name} cadastrado com sucesso`)
      return newUser
    },
    []
  )

  const removeUser = useCallback(async (id: string) => {
    await deleteFaceIdUser(id)
    setUsers((prev) => prev.filter((user) => user.id !== id))
    if (recognizedUser?.id === id) {
      setRecognizedUser(null)
      setStatus('idle')
    }
    toast.success('Cadastro removido')
  }, [recognizedUser])

  const wipeUsers = useCallback(async () => {
    await clearAllFaceIdUsers()
    setUsers([])
    resetRecognition()
  }, [resetRecognition])

  return {
    isInitialized,
    isLoading,
    mode,
    status,
    users,
    detectedBoxes,
    recognizedUser,
    error,
    switchMode,
    resetRecognition,
    processRecognitionFrame,
    registerUser,
    removeUser,
    wipeUsers,
  }
}
