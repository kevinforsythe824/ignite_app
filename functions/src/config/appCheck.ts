/**
 * App Check posture for parental-consent callables (ADR-008).
 * Enforcement is optional and off by default in emulator / 6.5A.
 */

export function isAppCheckEnforceEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.APP_CHECK_ENFORCE === 'true';
}

/**
 * Placeholder for future callable options.
 * 6.5A does not require App Check tokens to succeed.
 */
export function appCheckCallableOptions(): { enforceAppCheck?: boolean } {
  if (isAppCheckEnforceEnabled()) {
    return { enforceAppCheck: true };
  }
  return {};
}
