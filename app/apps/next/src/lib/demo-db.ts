/**
 * Demo Database Service
 * Uses localStorage for data and IndexedDB for file storage
 */

const DB_NAME = 'portex_demo_files';
const STORE_NAME = 'files';

// Initialize IndexedDB
const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

export const demoStorage = {
  async saveFile(key: string, blob: Blob): Promise<void> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(blob, key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  },

  async getFile(key: string): Promise<Blob | null> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  },

  async getFileUrl(key: string): Promise<string | null> {
    const blob = await this.getFile(key);
    if (!blob) return null;
    return URL.createObjectURL(blob);
  }
};

// LocalStorage helpers for DB-like data
export const demoDB = {
  get<T>(table: string): T[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(`demo_${table}`);
    return data ? JSON.parse(data) : [];
  },

  set<T>(table: string, data: T[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`demo_${table}`, JSON.stringify(data));
  },

  insert<T extends { id: string | number }>(table: string, item: T): T {
    const items = this.get<T>(table);
    items.push(item);
    this.set(table, items);
    return item;
  },

  update<T extends { id: string | number }>(table: string, id: string | number, updates: Partial<T>): T | null {
    const items = this.get<T>(table);
    const index = items.findIndex(i => i.id === id);
    if (index === -1) return null;
    items[index] = { ...items[index], ...updates };
    this.set(table, items);
    return items[index];
  },

  delete(table: string, id: string | number): void {
    const items = this.get<any>(table);
    const filtered = items.filter(i => i.id !== id);
    this.set(table, filtered);
  }
};
