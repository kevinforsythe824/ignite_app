import {
  CONSENT_CLIENT_SESSION_VERSION,
  hasConsentCapability,
} from '../../../src/features/parentalConsent/domain/consentClientSession';
import { toParentalConsentPresentation } from '../../../src/features/parentalConsent/domain/parentalConsentStatus';
import { ParentalConsentError } from '../../../src/features/parentalConsent/errors/parentalConsentError';
import {
  isTerminalClaimError,
  isTransientParentalConsentError,
  translateParentalConsentError,
} from '../../../src/features/parentalConsent/errors/translateParentalConsentError';
import { validateParentEmail } from '../../../src/features/parentalConsent/validation/parentEmailValidation';
import { createExpoConsentSecureStore } from '../../../src/features/parentalConsent/storage/expoConsentSecureStore';
import * as SecureStore from 'expo-secure-store';

describe('parentalConsent domain', () => {
  it('maps waiting and approved binding states', () => {
    expect(toParentalConsentPresentation('pending', 'unbound')).toBe('waiting');
    expect(toParentalConsentPresentation('initial_consent_received', 'unbound')).toBe(
      'waiting',
    );
    expect(toParentalConsentPresentation('approved', 'unbound')).toBe('approvedUnbound');
    expect(toParentalConsentPresentation('approved', 'bound')).toBe('approvedBound');
    expect(toParentalConsentPresentation('expired', 'unbound')).toBe('recovery');
    expect(toParentalConsentPresentation('revoked', 'bound')).toBe('recovery');
  });

  it('detects active capability only when requestId and token are present', () => {
    expect(hasConsentCapability(null)).toBe(false);
    expect(
      hasConsentCapability({
        version: CONSENT_CLIENT_SESSION_VERSION,
        requestId: 'req-1',
      }),
    ).toBe(false);
    expect(
      hasConsentCapability({
        version: CONSENT_CLIENT_SESSION_VERSION,
        requestId: 'req-1',
        clientSessionToken: 'token-1',
      }),
    ).toBe(true);
  });
});

describe('translateParentalConsentError', () => {
  it('maps stable Functions codes without parsing message text', () => {
    expect(
      translateParentalConsentError({ code: 'functions/resource-exhausted', message: 'wait' })
        .code,
    ).toBe('resource-exhausted');
    expect(
      translateParentalConsentError({ code: 'functions/already-exists', message: 'bound' }).code,
    ).toBe('already-exists');
    expect(
      translateParentalConsentError({
        code: 'functions/failed-precondition',
        message: 'This consent request has expired.',
      }).code,
    ).toBe('failed-precondition');
  });

  it('classifies transient vs terminal claim codes', () => {
    expect(
      isTransientParentalConsentError(new ParentalConsentError('unavailable', 'x')),
    ).toBe(true);
    expect(
      isTerminalClaimError(new ParentalConsentError('already-exists', 'x')),
    ).toBe(true);
    expect(
      isTerminalClaimError(new ParentalConsentError('permission-denied', 'x')),
    ).toBe(true);
  });
});

describe('validateParentEmail', () => {
  it('requires a parent email shape', () => {
    expect(validateParentEmail('')).toBeTruthy();
    expect(validateParentEmail('not-an-email')).toBeTruthy();
    expect(validateParentEmail('parent@example.com')).toBeUndefined();
  });
});

describe('expoConsentSecureStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('persists and restores a capability blob with WHEN_UNLOCKED_THIS_DEVICE_ONLY', async () => {
    const store = createExpoConsentSecureStore();
    const session = {
      version: CONSENT_CLIENT_SESSION_VERSION,
      requestId: 'req-1',
      clientSessionToken: 'token-1',
    };

    await store.write(session);

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      expect.any(String),
      JSON.stringify(session),
      expect.objectContaining({
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        requireAuthentication: false,
      }),
    );

    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(JSON.stringify(session));
    await expect(store.read()).resolves.toEqual(session);
  });

  it('clears corrupt JSON and returns null', async () => {
    const store = createExpoConsentSecureStore();
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('{not-json');
    await expect(store.read()).resolves.toBeNull();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
  });

  it('does not store a local approved flag', async () => {
    const store = createExpoConsentSecureStore();
    await store.write({
      version: CONSENT_CLIENT_SESSION_VERSION,
      requestId: 'req-1',
      clientSessionToken: 'token-1',
    });
    const payload = (SecureStore.setItemAsync as jest.Mock).mock.calls[0][1] as string;
    expect(payload).not.toContain('approved');
    expect(payload).not.toContain('parentApproved');
  });
});
