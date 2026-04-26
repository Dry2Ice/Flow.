export interface CachedChunk {
  filePath: string;
  content: string;
  contentHash: string;
  startLine: number;
  endLine: number;
  embedding: number[];
  indexedAt: number;
  projectPath: string;
}

const STORE_NAME = 'chunks';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function hashContent(content: string): string {
  let hash = 5381;
  for (let i = 0; i < content.length; i += 1) {
    hash = ((hash << 5) + hash) ^ content.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

export class EmbeddingCache {
  private dbName = 'flow-embeddings';
  private version = 1;
  private db: IDBDatabase | null = null;

  async open(): Promise<void> {
    if (this.db || typeof indexedDB === 'undefined') {
      return;
    }

    const request = indexedDB.open(this.dbName, this.version);

    await new Promise<void>((resolve, reject) => {
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: ['projectPath', 'filePath', 'contentHash'],
          });
          store.createIndex('by_project', 'projectPath', { unique: false });
          store.createIndex('by_project_file', ['projectPath', 'filePath'], { unique: false });
        }
      };
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => Promise<T>): Promise<T | null> {
    await this.open();
    if (!this.db) return null;
    const tx = this.db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const result = await run(store);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    return result;
  }

  async get(projectPath: string, filePath: string, contentHash: string): Promise<number[] | null> {
    const record = await this.withStore('readonly', async (store) => {
      const request = store.get([projectPath, filePath, contentHash]);
      return requestToPromise<CachedChunk | undefined>(request as IDBRequest<CachedChunk | undefined>);
    });

    if (!record) return null;
    if (Date.now() - record.indexedAt > MAX_AGE_MS) return null;
    return record.embedding;
  }

  async set(chunk: CachedChunk): Promise<void> {
    await this.withStore('readwrite', async (store) => {
      store.put(chunk);
      return undefined;
    });
  }

  async setMany(chunks: CachedChunk[]): Promise<void> {
    if (chunks.length === 0) return;
    await this.withStore('readwrite', async (store) => {
      chunks.forEach((chunk) => {
        store.put(chunk);
      });
      return undefined;
    });
  }

  async getAll(projectPath: string): Promise<CachedChunk[]> {
    const result = await this.withStore('readonly', async (store) => {
      const index = store.index('by_project');
      const request = index.getAll(projectPath);
      return requestToPromise<CachedChunk[]>(request as IDBRequest<CachedChunk[]>);
    });

    return result ?? [];
  }

  async invalidate(projectPath: string, filePath: string): Promise<void> {
    await this.withStore('readwrite', async (store) => {
      const index = store.index('by_project_file');
      const request = index.openCursor(IDBKeyRange.only([projectPath, filePath]));
      await new Promise<void>((resolve, reject) => {
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) {
            resolve();
            return;
          }
          cursor.delete();
          cursor.continue();
        };
        request.onerror = () => reject(request.error);
      });
      return undefined;
    });
  }

  async clear(projectPath: string): Promise<void> {
    await this.withStore('readwrite', async (store) => {
      const index = store.index('by_project');
      const request = index.openCursor(IDBKeyRange.only(projectPath));
      await new Promise<void>((resolve, reject) => {
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) {
            resolve();
            return;
          }
          cursor.delete();
          cursor.continue();
        };
        request.onerror = () => reject(request.error);
      });
      return undefined;
    });
  }
}

export const embeddingCache = new EmbeddingCache();
