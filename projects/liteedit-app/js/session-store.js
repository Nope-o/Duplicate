const DB_NAME = 'liteedit-session-db';
const DB_VERSION = 1;
const STORE_NAME = 'session';
const SESSION_KEY = 'latest';

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error || new Error('Unable to open session database.'));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

async function withStore(mode, callback) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    let output;
    tx.oncomplete = () => {
      db.close();
      resolve(output);
    };
    tx.onerror = () => {
      const err = tx.error || new Error('Session store transaction failed.');
      db.close();
      reject(err);
    };
    tx.onabort = () => {
      const err = tx.error || new Error('Session store transaction aborted.');
      db.close();
      reject(err);
    };
    output = callback(store);
  });
}

export async function readSession() {
  return withStore('readonly', (store) => new Promise((resolve, reject) => {
    const req = store.get(SESSION_KEY);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error || new Error('Failed to read session.'));
  }));
}

export async function writeSession(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid session payload.');
  }
  return withStore('readwrite', (store) => {
    store.put(payload, SESSION_KEY);
  });
}

export async function clearSession() {
  return withStore('readwrite', (store) => {
    store.delete(SESSION_KEY);
  });
}
