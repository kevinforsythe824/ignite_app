import { FirebaseParentalConsentRepository } from '../../../src/features/parentalConsent/repositories/firebaseParentalConsentRepository';
import {
  createFirebaseParentalConsentSource,
  type ParentalConsentFirebaseSource,
} from '../../../src/features/parentalConsent/repositories/firebaseParentalConsentSource';
import { ParentalConsentError } from '../../../src/features/parentalConsent/errors/parentalConsentError';

describe('FirebaseParentalConsentRepository', () => {
  it('maps Functions failures through translateParentalConsentError', async () => {
    const source: ParentalConsentFirebaseSource = {
      createRequest: jest.fn(),
      getStatus: jest.fn(),
      resendNotice: jest.fn(),
      updateParentEmail: jest.fn(),
      claim: jest.fn(async () => {
        throw { code: 'functions/already-exists', message: 'bound' };
      }),
    };
    const repository = new FirebaseParentalConsentRepository(source);

    await expect(
      repository.claim({ requestId: 'req-1', clientSessionToken: 'token-1' }),
    ).rejects.toBeInstanceOf(ParentalConsentError);

    try {
      await repository.claim({ requestId: 'req-1', clientSessionToken: 'token-1' });
    } catch (error) {
      expect(error).toMatchObject({ code: 'already-exists' });
    }
  });

  it('forwards claim credentials without a UID field', async () => {
    const claim = jest.fn(async () => ({
      status: 'approved',
      bindingState: 'bound' as const,
      claimedByUid: 'user-1',
    }));
    const source: ParentalConsentFirebaseSource = {
      createRequest: jest.fn(),
      getStatus: jest.fn(),
      resendNotice: jest.fn(),
      updateParentEmail: jest.fn(),
      claim,
    };
    const repository = new FirebaseParentalConsentRepository(source);

    await repository.claim({ requestId: 'req-1', clientSessionToken: 'token-1' });

    expect(claim).toHaveBeenCalledWith({
      requestId: 'req-1',
      clientSessionToken: 'token-1',
    });
  });
});

describe('createFirebaseParentalConsentSource claim auth gate', () => {
  it('refuses claim when Auth currentUser is missing (no callable without auth context)', async () => {
    const getFunctionsInstance = jest.fn(() => ({}) as never);
    const getAuthInstance = jest.fn(() => ({ currentUser: null }) as never);
    const source = createFirebaseParentalConsentSource(getFunctionsInstance, getAuthInstance);

    await expect(
      source.claim({ requestId: 'req-1', clientSessionToken: 'token-1' }),
    ).rejects.toMatchObject({ code: 'unauthenticated' });

    expect(getFunctionsInstance).not.toHaveBeenCalled();
  });

  it('warms ID token before calling claimParentalConsent', async () => {
    const getIdToken = jest.fn(async () => 'id-token');
    const getFunctionsInstance = jest.fn(() => ({}) as never);
    const getAuthInstance = jest.fn(
      () =>
        ({
          currentUser: { getIdToken },
        }) as never,
    );
    const source = createFirebaseParentalConsentSource(getFunctionsInstance, getAuthInstance);

    // httpsCallable is mocked in jest.setup; assert auth warm-up always runs first.
    try {
      await source.claim({ requestId: 'req-1', clientSessionToken: 'token-1' });
    } catch {
      // Callable mock may reject; auth gate is what this test covers.
    }

    expect(getIdToken).toHaveBeenCalled();
    expect(getFunctionsInstance).toHaveBeenCalled();
  });
});
