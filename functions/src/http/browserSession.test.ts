import {
  buildSessionPayload,
  sealBrowserSession,
  unsealBrowserSession,
} from './browserSession';
import { CONSENT_SECURITY_HEADERS } from './securityHeaders';

describe('browserSession', () => {
  const secret = 'browser-session-test-secret';

  it('round-trips purpose-bound sealed sessions', () => {
    const payload = buildSessionPayload({
      purpose: 'approve',
      requestId: 'abc',
      capability: 'raw-token-value',
    });
    const sealed = sealBrowserSession(payload, secret);
    const opened = unsealBrowserSession(sealed, secret);
    expect(opened.purpose).toBe('approve');
    expect(opened.requestId).toBe('abc');
    expect(opened.capability).toBe('raw-token-value');
    expect(opened.csrf).toBeTruthy();
  });

  it('rejects expired sessions', () => {
    const payload = buildSessionPayload({
      purpose: 'confirm',
      requestId: 'abc',
      capability: 'tok',
      nowMs: Date.now() - 60_000,
      ttlMs: 1_000,
    });
    const sealed = sealBrowserSession(payload, secret);
    expect(() => unsealBrowserSession(sealed, secret)).toThrow(/expired/i);
  });
});

describe('security headers', () => {
  it('includes no-store and referrer-policy', () => {
    expect(CONSENT_SECURITY_HEADERS['Cache-Control']).toBe('no-store');
    expect(CONSENT_SECURITY_HEADERS['Referrer-Policy']).toBe('no-referrer');
  });
});
