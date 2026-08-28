import type { ConsentClientSession } from '../src/features/parentalConsent/domain/consentClientSession';
import type { ConsentSecureStore } from '../src/features/parentalConsent/storage/consentSecureStore';

export interface ConsentSecureStoreFake extends ConsentSecureStore {
  /** Test helper: inspect current blob without going through read(). */
  peek(): ConsentClientSession | null;
  seed(session: ConsentClientSession | null): void;
}

export function createConsentSecureStoreFake(
  initial: ConsentClientSession | null = null,
): ConsentSecureStoreFake {
  let current: ConsentClientSession | null = initial;

  return {
    peek: () => current,
    seed: (session) => {
      current = session;
    },
    read: jest.fn(async () => current),
    write: jest.fn(async (session: ConsentClientSession) => {
      current = { ...session };
    }),
    clear: jest.fn(async () => {
      current = null;
    }),
  };
}
