import { notConnected } from '../errors';
import type { OfflineSettings, StorageKey, StoredDeckBundle } from './types';

/**
 * Local persistence for offline study and preferences (AsyncStorage / SQLite later).
 */
export interface StorageService {
  getItem<T>(key: StorageKey): Promise<T | null>;
  setItem<T>(key: StorageKey, value: T): Promise<void>;
  removeItem(key: StorageKey): Promise<void>;
  clear(): Promise<void>;

  listDownloadedDecks(): Promise<readonly StoredDeckBundle[]>;
  saveDownloadedDeck(bundle: StoredDeckBundle): Promise<void>;
  removeDownloadedDeck(deckId: string): Promise<void>;

  getOfflineSettings(): Promise<OfflineSettings>;
  saveOfflineSettings(settings: OfflineSettings): Promise<void>;
}

/** Stub storage service — no AsyncStorage/SQLite yet. */
export const storageService: StorageService = {
  getItem: () => notConnected('storage', 'getItem'),
  setItem: () => notConnected('storage', 'setItem'),
  removeItem: () => notConnected('storage', 'removeItem'),
  clear: () => notConnected('storage', 'clear'),
  listDownloadedDecks: () => notConnected('storage', 'listDownloadedDecks'),
  saveDownloadedDeck: () => notConnected('storage', 'saveDownloadedDeck'),
  removeDownloadedDeck: () => notConnected('storage', 'removeDownloadedDeck'),
  getOfflineSettings: () => notConnected('storage', 'getOfflineSettings'),
  saveOfflineSettings: () => notConnected('storage', 'saveOfflineSettings'),
};

export function createStorageService(): StorageService {
  return storageService;
}
