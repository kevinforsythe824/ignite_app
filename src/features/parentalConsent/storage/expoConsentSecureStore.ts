import * as SecureStore from 'expo-secure-store';

import {
  CONSENT_CLIENT_SESSION_VERSION,
  type ConsentClientSession,
} from '../domain/consentClientSession';
import type { ConsentSecureStore } from './consentSecureStore';

export const CONSENT_SECURE_STORE_KEY = 'ignite.consent.clientSession.v1';

const STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  requireAuthentication: false,
};

function isValidSession(value: unknown): value is ConsentClientSession {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (record.version !== CONSENT_CLIENT_SESSION_VERSION) {
    return false;
  }
  if (record.requestId !== undefined && typeof record.requestId !== 'string') {
    return false;
  }
  if (
    record.clientSessionToken !== undefined &&
    typeof record.clientSessionToken !== 'string'
  ) {
    return false;
  }
  if (record.awaitingClaim !== undefined && typeof record.awaitingClaim !== 'boolean') {
    return false;
  }
  if (
    record.pendingClaimUid !== undefined &&
    typeof record.pendingClaimUid !== 'string'
  ) {
    return false;
  }
  if (
    record.needsFreshConsent !== undefined &&
    typeof record.needsFreshConsent !== 'boolean'
  ) {
    return false;
  }
  return true;
}

/** Expo SecureStore-backed consent capability storage. */
export function createExpoConsentSecureStore(
  options: SecureStore.SecureStoreOptions = STORE_OPTIONS,
): ConsentSecureStore {
  return {
    async read(): Promise<ConsentClientSession | null> {
      let raw: string | null;
      try {
        raw = await SecureStore.getItemAsync(CONSENT_SECURE_STORE_KEY, options);
      } catch {
        return null;
      }
      if (raw === null || raw.length === 0) {
        return null;
      }
      try {
        const parsed: unknown = JSON.parse(raw);
        if (!isValidSession(parsed)) {
          await SecureStore.deleteItemAsync(CONSENT_SECURE_STORE_KEY, options);
          return null;
        }
        return parsed;
      } catch {
        await SecureStore.deleteItemAsync(CONSENT_SECURE_STORE_KEY, options);
        return null;
      }
    },

    async write(session: ConsentClientSession): Promise<void> {
      await SecureStore.setItemAsync(
        CONSENT_SECURE_STORE_KEY,
        JSON.stringify(session),
        options,
      );
    },

    async clear(): Promise<void> {
      await SecureStore.deleteItemAsync(CONSENT_SECURE_STORE_KEY, options);
    },
  };
}

export const expoConsentSecureStore = createExpoConsentSecureStore();
