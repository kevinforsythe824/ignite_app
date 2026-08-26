import * as index from './index';

describe('functions export surface (6.5B)', () => {
  it('does not export raw-token mutation HTTP handlers', () => {
    const exported = index as Record<string, unknown>;
    expect(exported.processInitialConsentHttp).toBeUndefined();
    expect(exported.processConfirmationHttp).toBeUndefined();
    expect(exported.revokeConsentHttp).toBeUndefined();
  });

  it('exports hosting router and confirmation task', () => {
    expect(index.parentalConsentHosting).toBeDefined();
    expect(index.sendParentalConsentConfirmationTask).toBeDefined();
    expect(index.createParentalConsentRequest).toBeDefined();
    expect(index.claimParentalConsent).toBeDefined();
  });

  it('does not export duplicate *Fn callable aliases', () => {
    const exported = index as Record<string, unknown>;
    expect(exported.createParentalConsentRequestFn).toBeUndefined();
    expect(exported.getParentalConsentStatusFn).toBeUndefined();
    expect(exported.resendParentalConsentNoticeFn).toBeUndefined();
    expect(exported.updateParentalConsentEmailFn).toBeUndefined();
    expect(exported.claimParentalConsentFn).toBeUndefined();
  });
});
