import type { ConsentClientSession } from '../domain/consentClientSession';

/**
 * Injectable secure-storage port for the under-13 consent capability blob.
 * Implementations must not use AsyncStorage.
 */
export interface ConsentSecureStore {
  read(): Promise<ConsentClientSession | null>;
  write(session: ConsentClientSession): Promise<void>;
  clear(): Promise<void>;
}
