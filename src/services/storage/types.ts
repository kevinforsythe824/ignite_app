/** Keys for typed local persistence. Expand as offline features land. */
export type StorageKey =
  | 'offline.decks'
  | 'offline.progress'
  | 'settings.theme'
  | 'settings.notifications'
  | 'settings.autoDownloadWifi';

export interface StoredDeckBundle {
  deckId: string;
  title: string;
  versesJson: string;
  downloadedAt: string;
}

export interface OfflineSettings {
  autoDownloadOnWifi: boolean;
  notificationsEnabled: boolean;
  darkModeEnabled: boolean;
}
