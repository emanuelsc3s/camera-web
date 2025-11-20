import { type FaceIdUser } from '@/types/faceId'

const DB_NAME = 'CameraWebFaceIdDB'
const STORE_NAME = 'faceIdUsers'
const DB_VERSION = 1

export const initFaceIdDB = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(new Error('Erro ao abrir banco de dados'))
    request.onsuccess = () => resolve()

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
  })
}

const getDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(new Error('Erro ao abrir banco de dados'))
    request.onsuccess = () => resolve(request.result)
  })
}

export const saveFaceIdUser = async (user: FaceIdUser): Promise<void> => {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.put(user)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(new Error('Erro ao salvar usuário'))
  })
}

export const getAllFaceIdUsers = async (): Promise<FaceIdUser[]> => {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.getAll()

    request.onsuccess = () => resolve(request.result as FaceIdUser[])
    request.onerror = () => reject(new Error('Erro ao buscar usuários'))
  })
}

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

export const deleteFaceIdUser = async (id: string): Promise<void> => {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.delete(id)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(new Error('Erro ao deletar usuário'))
  })
}

export const clearAllFaceIdUsers = async (): Promise<void> => {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.clear()

    request.onsuccess = () => resolve()
    request.onerror = () => reject(new Error('Erro ao limpar banco de dados'))
  })
}
