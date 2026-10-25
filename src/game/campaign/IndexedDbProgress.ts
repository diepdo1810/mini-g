import type { CampaignProgress } from '../config/levels';
import { type ProgressRepository, createDefaultProgress, sanitizeCampaignProgress } from './ProgressRepository';

const DB_NAME = 'MergeDefenseDB';
const DB_VERSION = 1;
const STORE_NAME = 'campaign';
const RECORD_KEY = 'progress-v1';

export class IndexedDbProgress implements ProgressRepository {
  private memoryFallback: CampaignProgress | null = null;
  private isAvailable: boolean;

  constructor() {
    this.isAvailable = typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
  }

  private openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (!this.isAvailable) {
        reject(new Error('IndexedDB not available'));
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  public async load(): Promise<CampaignProgress> {
    if (!this.isAvailable) {
      if (!this.memoryFallback) {
        this.memoryFallback = createDefaultProgress();
      }
      return this.memoryFallback;
    }

    try {
      const db = await this.openDb();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(RECORD_KEY);

        req.onsuccess = () => {
          resolve(sanitizeCampaignProgress(req.result));
        };

        req.onerror = () => {
          console.warn('Failed to load progress from IndexedDB, using default');
          resolve(createDefaultProgress());
        };
      });
    } catch {
      if (!this.memoryFallback) {
        this.memoryFallback = createDefaultProgress();
      }
      return this.memoryFallback;
    }
  }

  public async save(progress: CampaignProgress): Promise<void> {
    this.memoryFallback = JSON.parse(JSON.stringify(progress));

    if (!this.isAvailable) return;

    try {
      const db = await this.openDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(progress, RECORD_KEY);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('Failed to save progress to IndexedDB:', err);
    }
  }

  public async reset(): Promise<void> {
    const defaultData = createDefaultProgress();
    await this.save(defaultData);
  }
}

