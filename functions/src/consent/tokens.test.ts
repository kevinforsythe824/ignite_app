import {
  generateOpaqueToken,
  hashToken,
  verifyTokenHash,
} from './tokens';

describe('consent tokens', () => {
  it('generates unique opaque tokens', () => {
    const a = generateOpaqueToken('approval');
    const b = generateOpaqueToken('approval');
    expect(a.rawToken).not.toBe(b.rawToken);
    expect(a.tokenHash).not.toBe(b.tokenHash);
  });

  it('does not store raw token as hash', () => {
    const token = generateOpaqueToken('revoke');
    expect(token.tokenHash).not.toBe(token.rawToken);
    expect(token.tokenHash).toBe(hashToken(token.rawToken));
  });

  it('verifies matching tokens and rejects wrong ones', () => {
    const token = generateOpaqueToken('confirmation');
    expect(verifyTokenHash(token.rawToken, token.tokenHash)).toBe(true);
    expect(verifyTokenHash('not-the-token', token.tokenHash)).toBe(false);
  });

  it('keeps purposes as separate generations', () => {
    const approval = generateOpaqueToken('approval');
    const revoke = generateOpaqueToken('revoke');
    expect(approval.purpose).toBe('approval');
    expect(revoke.purpose).toBe('revoke');
    expect(approval.rawToken).not.toBe(revoke.rawToken);
  });
});
