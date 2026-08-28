/**
 * Local SecureStore capability for under-13 account creation.
 * Never stores server status, parentApproved, full parent email, or age/DOB.
 */
export const CONSENT_CLIENT_SESSION_VERSION = 1;

export interface ConsentClientSession {
  version: number;
  requestId?: string;
  clientSessionToken?: string;
  /**
   * Transient only: set immediately before signUp; cleared on signup failure
   * or promoted to pendingClaimUid on Auth success.
   */
  awaitingClaim?: boolean;
  /** Only UID allowed to claim / complete under-13 post-signup recovery. */
  pendingClaimUid?: string;
  /**
   * Auth account exists but current consent cannot be claimed;
   * require new parent approval then Sign In (not Create Account).
   */
  needsFreshConsent?: boolean;
}

/** True when a requestId + clientSessionToken pair is present (active privacy path). */
export function hasConsentCapability(session: ConsentClientSession | null): boolean {
  if (session === null) {
    return false;
  }
  return (
    typeof session.requestId === 'string' &&
    session.requestId.length > 0 &&
    typeof session.clientSessionToken === 'string' &&
    session.clientSessionToken.length > 0
  );
}

export function createEmptyConsentClientSession(): ConsentClientSession {
  return { version: CONSENT_CLIENT_SESSION_VERSION };
}
