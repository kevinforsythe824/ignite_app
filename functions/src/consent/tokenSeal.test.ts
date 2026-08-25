import { sealToken, unsealToken } from './tokenSeal';

describe('tokenSeal', () => {
  it('round-trips tokens', () => {
    const sealed = sealToken('opaque-confirmation-token', 'seal-secret');
    expect(sealed).not.toContain('opaque-confirmation-token');
    expect(unsealToken(sealed, 'seal-secret')).toBe('opaque-confirmation-token');
  });
});
