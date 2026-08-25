/**
 * Server secrets for parental consent.
 * Never expose to clients or commit real values.
 */

import { ParentalConsentError } from '../domain/parentalConsent';

const TEST_SECRET_OVERRIDE_KEY = '__IGNITE_TEST_PARENT_EMAIL_HMAC_SECRET__';
const TEST_SEAL_OVERRIDE_KEY = '__IGNITE_TEST_CONSENT_SEAL_SECRET__';
const TEST_SESSION_OVERRIDE_KEY = '__IGNITE_TEST_BROWSER_SESSION_SECRET__';

let testHmacOverride: string | undefined;
let testSealOverride: string | undefined;
let testSessionOverride: string | undefined;

/** Test-only injection. Production/emulator use env or defineSecret. */
export function setParentEmailHmacSecretForTests(secret: string | undefined): void {
  testHmacOverride = secret;
}

export function setConsentSealSecretForTests(secret: string | undefined): void {
  testSealOverride = secret;
}

export function setBrowserSessionSecretForTests(secret: string | undefined): void {
  testSessionOverride = secret;
}

function readSecret(
  envKey: string,
  testOverride: string | undefined,
  globalKey: string,
  env: NodeJS.ProcessEnv,
  label: string,
): string {
  if (testOverride !== undefined && testOverride.length > 0) {
    return testOverride;
  }
  const fromEnv = env[envKey]?.trim();
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv;
  }
  const fromGlobal = (globalThis as Record<string, unknown>)[globalKey];
  if (typeof fromGlobal === 'string' && fromGlobal.length > 0) {
    return fromGlobal;
  }
  throw new ParentalConsentError('internal', `${label} is not configured.`);
}

export function getParentEmailHmacSecret(
  env: NodeJS.ProcessEnv = process.env,
): string {
  return readSecret(
    'PARENT_EMAIL_HMAC_SECRET',
    testHmacOverride,
    TEST_SECRET_OVERRIDE_KEY,
    env,
    'PARENT_EMAIL_HMAC_SECRET',
  );
}

export function getConsentSealSecret(
  env: NodeJS.ProcessEnv = process.env,
): string {
  try {
    return readSecret(
      'CONSENT_TOKEN_SEAL_SECRET',
      testSealOverride,
      TEST_SEAL_OVERRIDE_KEY,
      env,
      'CONSENT_TOKEN_SEAL_SECRET',
    );
  } catch {
    // Local/emulator convenience: derive from HMAC when dedicated seal secret unset.
    return getParentEmailHmacSecret(env);
  }
}

export function getBrowserSessionSecret(
  env: NodeJS.ProcessEnv = process.env,
): string {
  try {
    return readSecret(
      'CONSENT_BROWSER_SESSION_SECRET',
      testSessionOverride,
      TEST_SESSION_OVERRIDE_KEY,
      env,
      'CONSENT_BROWSER_SESSION_SECRET',
    );
  } catch {
    return getParentEmailHmacSecret(env);
  }
}

export function getResendApiKey(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const key = env.RESEND_API_KEY?.trim();
  return key && key.length > 0 ? key : undefined;
}
