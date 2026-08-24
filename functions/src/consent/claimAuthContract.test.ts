import { HttpsError } from 'firebase-functions/v2/https';

/**
 * Documents the callable claim contract used by claimParentalConsentFn:
 * authenticatedUid must come from request.auth.uid, never from request.data.
 */
function extractClaimUid(request: {
  auth?: { uid: string } | null;
  data?: { uid?: string; authenticatedUid?: string };
}): string {
  if (!request.auth?.uid) {
    throw new HttpsError(
      'unauthenticated',
      'Authentication is required to claim parental consent.',
    );
  }
  // Intentionally ignore client-supplied uid fields.
  void request.data?.uid;
  void request.data?.authenticatedUid;
  return request.auth.uid;
}

describe('claimParentalConsent callable auth contract', () => {
  it('derives uid only from request.auth.uid', () => {
    expect(
      extractClaimUid({
        auth: { uid: 'server-uid' },
        data: { uid: 'spoofed', authenticatedUid: 'also-spoofed' },
      }),
    ).toBe('server-uid');
  });

  it('rejects unauthenticated callers', () => {
    expect(() =>
      extractClaimUid({
        auth: null,
        data: { uid: 'spoofed' },
      }),
    ).toThrow(HttpsError);
  });
});
