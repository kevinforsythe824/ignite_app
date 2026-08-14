import { notConnected } from '../errors';
import type { StorageKey } from './types';

/**
 * Generic local key-value stub. Not an offline study or download layer.
 * Implementations may later use AsyncStorage; SQLite/offline study is Post-MVP.
 */
export interface StorageService {
  getItem<T>(key: StorageKey): Promise<T | null>;
  setItem<T>(key: StorageKey, value: T): Promise<void>;
  removeItem(key: StorageKey): Promise<void>;
  clear(): Promise<void>;
}

/** Stub storage service — no AsyncStorage/SQLite. */
export const storageService: StorageService = {
  getItem: () => notConnected('storage', 'getItem'),
  setItem: () => notConnected('storage', 'setItem'),
  removeItem: () => notConnected('storage', 'removeItem'),
  clear: () => notConnected('storage', 'clear'),
};

export function createStorageService(): StorageService {
  return storageService;
}
