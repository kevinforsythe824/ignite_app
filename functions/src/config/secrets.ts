/**
 * Server secrets for parental consent.
 * Never expose to clients or commit real values.
 */

import { ParentalConsentError } from '../domain/parentalConsent';

const TEST_SECRET_OVERRIDE_KEY = '__IGNITE_TEST_PARENT_EMAIL_HMAC_SECRET__';

let testSecretOverride: string | undefined;

/** Test-only injection. Production/emulator use env or defineSecret. */
export function setParentEmailHmacSecretForTests(secret: string | undefined): void {
  testSecretOverride = secret;
}

export function getParentEmailHmacSecret(
  env: NodeJS.ProcessEnv = process.env,
): string {
  if (testSecretOverride !== undefined && testSecretOverride.length > 0) {
    return testSecretOverride;
  }
  const fromEnv = env.PARENT_EMAIL_HMAC_SECRET?.trim();
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv;
  }
  const fromGlobal = (globalThis as Record<string, unknown>)[TEST_SECRET_OVERRIDE_KEY];
  if (typeof fromGlobal === 'string' && fromGlobal.length > 0) {
    return fromGlobal;
  }
  throw new ParentalConsentError(
    'internal',
    'PARENT_EMAIL_HMAC_SECRET is not configured.',
  );
}
