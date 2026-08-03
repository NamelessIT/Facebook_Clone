import { OFFLINE } from '../shared/generated/constants';

export const OFFLINE_STORES = Object.freeze({
  actions: 'actions',
  uploadChunks: 'uploadChunks',
  entitySnapshots: 'entitySnapshots',
  syncMeta: 'syncMeta',
});

const hasIndexedDb = () => typeof indexedDB !== 'undefined';

let dbPromise = null;

const requestToPromise = (request) => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const createStore = (db, name, options) => {
  if (!db.objectStoreNames.contains(name)) {
    return db.createObjectStore(name, options);
  }
  return null;
};

const upgrade = (db) => {
  const actions = createStore(db, OFFLINE_STORES.actions, { keyPath: 'id' });
  if (actions) {
    actions.createIndex('status', 'status', { unique: false });
    actions.createIndex('createdAt', 'createdAt', { unique: false });
    actions.createIndex('updatedAt', 'updatedAt', { unique: false });
    actions.createIndex('idempotencyKey', 'idempotencyKey', { unique: true });
  }

  const uploadChunks = createStore(db, OFFLINE_STORES.uploadChunks, { keyPath: 'id' });
  if (uploadChunks) {
    uploadChunks.createIndex('uploadId', 'uploadId', { unique: false });
    uploadChunks.createIndex('status', 'status', { unique: false });
    uploadChunks.createIndex('updatedAt', 'updatedAt', { unique: false });
    uploadChunks.createIndex('uploadStatus', ['uploadId', 'status'], { unique: false });
  }

  const entitySnapshots = createStore(db, OFFLINE_STORES.entitySnapshots, { keyPath: 'id' });
  if (entitySnapshots) {
    entitySnapshots.createIndex('entity', ['entityType', 'entityId'], { unique: false });
    entitySnapshots.createIndex('createdAt', 'createdAt', { unique: false });
  }

  createStore(db, OFFLINE_STORES.syncMeta, { keyPath: 'key' });
};

export const openOfflineDb = () => {
  if (!hasIndexedDb()) {
    return Promise.reject(new Error('IndexedDB is not available in this browser context.'));
  }

  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(OFFLINE.dbName, OFFLINE.dbVersion);
    request.onupgradeneeded = () => upgrade(request.result);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('IndexedDB upgrade is blocked by another open tab.'));
  });

  return dbPromise;
};

export const withStore = async (storeName, mode, callback) => {
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    let callbackResult;

    transaction.oncomplete = () => resolve(callbackResult);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error('IndexedDB transaction aborted.'));

    try {
      callbackResult = callback(store, transaction);
    } catch (error) {
      transaction.abort();
      reject(error);
    }
  });
};

export const getAllFromStore = async (storeName) => withStore(storeName, 'readonly', (store) =>
  requestToPromise(store.getAll())
);

export const putInStore = async (storeName, value) => withStore(storeName, 'readwrite', (store) =>
  requestToPromise(store.put(value))
);

export const deleteFromStore = async (storeName, key) => withStore(storeName, 'readwrite', (store) =>
  requestToPromise(store.delete(key))
);

export const clearStore = async (storeName) => withStore(storeName, 'readwrite', (store) =>
  requestToPromise(store.clear())
);

export const isIndexedDbAvailable = hasIndexedDb;

