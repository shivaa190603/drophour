/**
 * In-browser IndexedDB storage engine for local development & demo mode.
 * Allows testing full file uploads (up to 50MB), downloads, 1-hour countdowns,
 * code lookups, and deletions without needing an active Supabase server.
 */

const DB_NAME = 'drophour_local_db';
const DB_VERSION = 1;
const STORE_NAME = 'files';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export interface StoredLocalFile {
  id: string; // share_token
  blob: Blob;
  filename: string;
}

export async function saveLocalFileBlob(shareToken: string, blob: Blob, filename: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const item: StoredLocalFile = { id: shareToken, blob, filename };
    const request = store.put(item);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getLocalFileBlob(shareToken: string): Promise<StoredLocalFile | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(shareToken);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteLocalFileBlob(shareToken: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(shareToken);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
