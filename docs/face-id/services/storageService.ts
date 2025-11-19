import { RegisteredUser } from '../types';

const DB_NAME = 'SecureFaceDB';
const STORE_NAME = 'users';
const DB_VERSION = 1;

export const initDB = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject('Erro ao abrir banco de dados');

    request.onsuccess = () => resolve();

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

const getDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject('Erro ao abrir banco de dados');
    request.onsuccess = () => resolve(request.result);
  });
};

export const saveUserToDB = async (user: RegisteredUser): Promise<void> => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(user);

    request.onsuccess = () => resolve();
    request.onerror = () => reject('Erro ao salvar usuário');
  });
};

export const getAllUsersFromDB = async (): Promise<RegisteredUser[]> => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result as RegisteredUser[]);
    request.onerror = () => reject('Erro ao buscar usuários');
  });
};

export const deleteUserFromDB = async (id: string): Promise<void> => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject('Erro ao deletar usuário');
  });
};
