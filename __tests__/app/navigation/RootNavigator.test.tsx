import { act, render, userEvent, waitFor } from '@testing-library/react-native';
import React from 'react';
import { AccessibilityInfo } from 'react-native';

import type { FutureLifecycleSeam } from '../../../src/app/lifecycle';
import { RootNavigator } from '../../../src/app/navigation/RootNavigator';
import { AuthProvider } from '../../../src/features/auth';
import { authCopy } from '../../../src/features/auth/copy/authCopy';
import { IgniteEntryScreen } from '../../../src/features/auth/screens/IgniteEntryScreen';
import { ParentalConsentProvider } from '../../../src/features/parentalConsent';
import { ParentalConsentError } from '../../../src/features/parentalConsent/errors/parentalConsentError';
import { parentalConsentCopy } from '../../../src/features/parentalConsent/copy/parentalConsentCopy';
import { QuizzerProfileError } from '../../../src/features/profile';
import { QuizzerProfileProvider } from '../../../src/features/profile/state/QuizzerProfileProvider';
import { createAuthRepositoryFake } from '../../../test-utils/authRepositoryFake';
import { createConsentSecureStoreFake } from '../../../test-utils/consentSecureStoreFake';
import { createParentalConsentRepositoryFake } from '../../../test-utils/parentalConsentRepositoryFake';
import { createQuizzerProfileRepositoryFake } from '../../../test-utils/quizzerProfileRepositoryFake';

jest.mock('../../../src/features/flashcards/repositories/firebaseCurriculumSource', () => {
  const { jsonCurriculumRepository } = jest.requireActual(
    '../../../src/features/flashcards/repositories/jsonCurriculumRepository',
  ) as typeof import('../../../src/features/flashcards/repositories/jsonCurriculumRepository');

  return {
    createFirebaseCurriculumSource: jest.fn(),
    firestoreCurriculumRepository: jsonCurriculumRepository,
  };
});

async function renderRoot(
  repository: ReturnType<typeof createAuthRepositoryFake>,
  profileRepository: ReturnType<typeof createQuizzerProfileRepositoryFake> = createQuizzerProfileRepositoryFake(),
  consentOptions?: {
    secureStore?: ReturnType<typeof createConsentSecureStoreFake>;
    consentRepository?: ReturnType<typeof createParentalConsentRepositoryFake>;
  },
  seams?: {
    seasonSeam?: FutureLifecycleSeam;
    entitlementSeam?: FutureLifecycleSeam;
  },
) {
  return render(
    <AuthProvider repository={repository}>
      <ParentalConsentProvider
        repository={consentOptions?.consentRepository ?? createParentalConsentRepositoryFake()}
        secureStore={consentOptions?.secureStore ?? createConsentSecureStoreFake()}
      >
        <QuizzerProfileProvider repository={profileRepository}>
          <RootNavigator
            seasonSeam={seams?.seasonSeam}
            entitlementSeam={seams?.entitlementSeam}
          />
        </QuizzerProfileProvider>
      </ParentalConsentProvider>
    </AuthProvider>,
  );
}

describe('RootNavigator auth session switch', () => {
  it('shows Ignite Entry while initializing and does not flash Welcome', async () => {
    const repository = createAuthRepositoryFake({ emitOnSubscribe: false });
    const screen = await renderRoot(repository);

    expect(screen.getByLabelText(authCopy.brand.accessibilityLabel)).toBeTruthy();
    expect(screen.queryByTestId('auth-welcome-create-account')).toBeNull();
    expect(screen.queryByText('Luke 2:1')).toBeNull();
  });

  it('shows Welcome only after unauthenticated resolution', async () => {
    const repository = createAuthRepositoryFake({ emitOnSubscribe: false });
    const screen = await renderRoot(repository);

    expect(screen.queryByTestId('auth-welcome-create-account')).toBeNull();

    await act(async () => {
      repository.emit(null);
    });

    expect(await screen.findByTestId('auth-welcome-create-account')).toBeTruthy();
    expect(screen.queryByText('Luke 2:1')).toBeNull();
  });

  it('shows the authenticated app without Welcome', async () => {
    const repository = createAuthRepositoryFake({
      initialIdentity: {
        uid: 'user-1',
        email: 'quizzer@example.com',
        emailVerified: false,
      },
    });
    const profileRepository = createQuizzerProfileRepositoryFake();
    profileRepository.seed({
      quizzerId: 'user-1',
      firstName: 'Taylor',
      lastName: 'Quizzer',
      avatarId: null,
    });
    const screen = await renderRoot(repository, profileRepository);

    expect(await screen.findByText('Luke 2:1')).toBeTruthy();
    expect(screen.queryByTestId('auth-welcome-create-account')).toBeNull();
  });

  it('does not flash MainTabs while profile presence is loading', async () => {
    let release: (value: null) => void = () => undefined;
    const pending = new Promise<null>((resolve) => {
      release = resolve;
    });
    const repository = createAuthRepositoryFake({
      initialIdentity: {
        uid: 'user-1',
        email: 'quizzer@example.com',
        emailVerified: false,
      },
    });
    const profileRepository = createQuizzerProfileRepositoryFake();
    (profileRepository.getProfile as jest.Mock).mockImplementation(async () => pending);

    const screen = await renderRoot(repository, profileRepository);

    expect(await screen.findByTestId('quizzer-profile-loading')).toBeTruthy();
    expect(screen.queryByText('Luke 2:1')).toBeNull();
    expect(screen.queryByTestId('quizzer-name-title')).toBeNull();

    await act(async () => {
      release(null);
    });

    expect(await screen.findByTestId('quizzer-name-title')).toBeTruthy();
    expect(screen.queryByText('Luke 2:1')).toBeNull();
  });

  it('routes missing profile to Quizzer name onboarding', async () => {
    const repository = createAuthRepositoryFake({
      initialIdentity: {
        uid: 'user-1',
        email: 'quizzer@example.com',
        emailVerified: false,
      },
    });
    const screen = await renderRoot(repository);

    expect(await screen.findByTestId('quizzer-name-title')).toBeTruthy();
    expect(screen.queryByText('Luke 2:1')).toBeNull();
  });

  it('routes profile load failure to recovery UI, not name onboarding', async () => {
    const repository = createAuthRepositoryFake({
      initialIdentity: {
        uid: 'user-1',
        email: 'quizzer@example.com',
        emailVerified: false,
      },
    });
    const profileRepository = createQuizzerProfileRepositoryFake({
      getError: new QuizzerProfileError(
        'unavailable',
        'Profile is temporarily unavailable.',
      ),
    });

    const screen = await renderRoot(repository, profileRepository);

    expect(await screen.findByTestId('quizzer-profile-load-error-title')).toBeTruthy();
    expect(screen.queryByTestId('quizzer-name-title')).toBeNull();
    expect(screen.queryByText('Luke 2:1')).toBeNull();
  });

  it('keeps MainTabs and Settings mounted after same-uid identity refresh', async () => {
    const user = userEvent.setup();
    const repository = createAuthRepositoryFake({
      initialIdentity: {
        uid: 'user-1',
        email: 'quizzer@example.com',
        emailVerified: false,
      },
    });
    const profileRepository = createQuizzerProfileRepositoryFake();
    profileRepository.seed({
      quizzerId: 'user-1',
      firstName: 'Taylor',
      lastName: 'Quizzer',
      avatarId: null,
    });

    const screen = await renderRoot(repository, profileRepository);

    expect(await screen.findByText('Luke 2:1')).toBeTruthy();
    const getProfileCallsBefore = (profileRepository.getProfile as jest.Mock).mock.calls.length;

    await user.press(screen.getByText('Profile'));
    expect(await screen.findByTestId('profile-home-full-name')).toBeTruthy();

    await user.press(screen.getByTestId('profile-home-settings'));
    expect(await screen.findByTestId('settings-email')).toBeTruthy();
    expect(screen.getByText('quizzer@example.com')).toBeTruthy();

    await waitFor(() => {
      expect(repository.refreshIdentity).toHaveBeenCalled();
    });

    expect(screen.getByTestId('settings-email')).toBeTruthy();
    expect(screen.queryByTestId('quizzer-profile-loading')).toBeNull();
    expect(screen.queryByTestId('quizzer-name-title')).toBeNull();
    expect(profileRepository.getProfile).toHaveBeenCalledTimes(getProfileCallsBefore);
  });

  it('blocks profile routes until pendingClaimUid claim completes', async () => {
    const repository = createAuthRepositoryFake({
      initialIdentity: {
        uid: 'user-1',
        email: 'quizzer@example.com',
        emailVerified: false,
      },
    });
    const profileRepository = createQuizzerProfileRepositoryFake();
    profileRepository.seed({
      quizzerId: 'user-1',
      firstName: 'Taylor',
      lastName: 'Quizzer',
      avatarId: null,
    });
    const secureStore = createConsentSecureStoreFake({
      version: 1,
      requestId: 'req-1',
      clientSessionToken: 'token-1',
      pendingClaimUid: 'user-1',
    });
    const consentRepository = createParentalConsentRepositoryFake({
      initialSnapshot: {
        status: 'approved',
        maskedParentEmail: 'p***@example.com',
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        bindingState: 'unbound',
      },
    });
    // Keep claim pending visible: hang the claim callable.
    (consentRepository.claim as jest.Mock).mockImplementation(
      () => new Promise(() => undefined),
    );

    const screen = await renderRoot(repository, profileRepository, {
      secureStore,
      consentRepository,
    });

    expect(await screen.findByTestId('consent-claim-pending-title')).toBeTruthy();
    expect(screen.queryByText('Luke 2:1')).toBeNull();
    expect(screen.queryByTestId('quizzer-name-title')).toBeNull();
  });

  it('does not claim or block when signed-in UID differs from pendingClaimUid', async () => {
    const repository = createAuthRepositoryFake({
      initialIdentity: {
        uid: 'user-b',
        email: 'other@example.com',
        emailVerified: false,
      },
    });
    const profileRepository = createQuizzerProfileRepositoryFake();
    profileRepository.seed({
      quizzerId: 'user-b',
      firstName: 'Other',
      lastName: 'User',
      avatarId: null,
    });
    const secureStore = createConsentSecureStoreFake({
      version: 1,
      requestId: 'req-1',
      clientSessionToken: 'token-1',
      pendingClaimUid: 'user-a',
    });

    const screen = await renderRoot(repository, profileRepository, { secureStore });

    expect(await screen.findByText('Luke 2:1')).toBeTruthy();
    expect(screen.queryByTestId('consent-claim-pending-title')).toBeNull();
  });

  it('AUTH HYDRATION RACE: awaitingClaim survives Auth initializing then gates ConsentClaimPending', async () => {
    const repository = createAuthRepositoryFake({ emitOnSubscribe: false });
    const profileRepository = createQuizzerProfileRepositoryFake();
    profileRepository.seed({
      quizzerId: 'user-race',
      firstName: 'Race',
      lastName: 'User',
      avatarId: null,
    });
    const secureStore = createConsentSecureStoreFake({
      version: 1,
      requestId: 'req-1',
      clientSessionToken: 'token-1',
      awaitingClaim: true,
    });
    const consentRepository = createParentalConsentRepositoryFake({
      initialSnapshot: {
        status: 'approved',
        maskedParentEmail: 'p***@example.com',
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        bindingState: 'unbound',
      },
    });
    (consentRepository.claim as jest.Mock).mockImplementation(
      () => new Promise(() => undefined),
    );

    const screen = await renderRoot(repository, profileRepository, {
      secureStore,
      consentRepository,
    });

    // Auth still initializing — do not unlock profile routes.
    expect(screen.queryByTestId('quizzer-name-title')).toBeNull();
    expect(screen.queryByText('Luke 2:1')).toBeNull();
    expect(secureStore.peek()?.awaitingClaim).toBe(true);

    await act(async () => {
      repository.emit({
        uid: 'user-race',
        email: 'race@example.com',
        emailVerified: false,
      });
    });

    expect(await screen.findByTestId('consent-claim-pending-title')).toBeTruthy();
    expect(screen.queryByTestId('quizzer-name-title')).toBeNull();
    expect(screen.queryByText('Luke 2:1')).toBeNull();
    expect(secureStore.peek()?.pendingClaimUid).toBe('user-race');
    expect(secureStore.peek()?.awaitingClaim).toBeUndefined();
  });

  it('BOUND CLAIM RECOVERY: always calls claim even when status is already bound', async () => {
    const repository = createAuthRepositoryFake({
      initialIdentity: {
        uid: 'user-1',
        email: 'quizzer@example.com',
        emailVerified: false,
      },
    });
    const profileRepository = createQuizzerProfileRepositoryFake();
    profileRepository.seed({
      quizzerId: 'user-1',
      firstName: 'Taylor',
      lastName: 'Quizzer',
      avatarId: null,
    });
    const secureStore = createConsentSecureStoreFake({
      version: 1,
      requestId: 'req-1',
      clientSessionToken: 'token-1',
      pendingClaimUid: 'user-1',
    });
    const consentRepository = createParentalConsentRepositoryFake({
      initialSnapshot: {
        status: 'approved',
        maskedParentEmail: 'p***@example.com',
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        bindingState: 'bound',
      },
    });
    // Same-UID idempotent success despite bound snapshot.
    consentRepository.setClaimResult({
      status: 'approved',
      bindingState: 'bound',
      claimedByUid: 'user-1',
    });

    const screen = await renderRoot(repository, profileRepository, {
      secureStore,
      consentRepository,
    });

    await waitFor(() => {
      expect(consentRepository.claim).toHaveBeenCalled();
    });
    expect(await screen.findByText('Luke 2:1')).toBeTruthy();
    expect(screen.queryByTestId('consent-claim-pending-title')).toBeNull();
    expect(secureStore.peek()).toBeNull();
  });

  it('BOUND CLAIM RECOVERY: different-account bound enters fresh-consent recovery', async () => {
    const repository = createAuthRepositoryFake({
      initialIdentity: {
        uid: 'user-1',
        email: 'quizzer@example.com',
        emailVerified: false,
      },
    });
    const profileRepository = createQuizzerProfileRepositoryFake();
    profileRepository.seed({
      quizzerId: 'user-1',
      firstName: 'Taylor',
      lastName: 'Quizzer',
      avatarId: null,
    });
    const secureStore = createConsentSecureStoreFake({
      version: 1,
      requestId: 'req-1',
      clientSessionToken: 'token-1',
      pendingClaimUid: 'user-1',
    });
    const consentRepository = createParentalConsentRepositoryFake({
      initialSnapshot: {
        status: 'approved',
        maskedParentEmail: 'p***@example.com',
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        bindingState: 'bound',
      },
    });
    consentRepository.setClaimError(
      new ParentalConsentError('already-exists', 'already bound'),
    );

    const screen = await renderRoot(repository, profileRepository, {
      secureStore,
      consentRepository,
    });

    await waitFor(() => {
      expect(consentRepository.claim).toHaveBeenCalled();
    });
    expect(await screen.findByTestId('consent-claim-pending-sign-out')).toBeTruthy();
    expect(screen.queryByText('Luke 2:1')).toBeNull();
    expect(screen.queryByTestId('quizzer-name-title')).toBeNull();
    expect(secureStore.peek()?.pendingClaimUid).toBe('user-1');
    expect(secureStore.peek()?.needsFreshConsent).toBe(true);
    expect(secureStore.peek()?.requestId).toBeUndefined();
  });

  it('FRESH UNDER-13 SIGNUP: claim auto-runs without Sign-in-to-finish message then QuizzerName', async () => {
    const repository = createAuthRepositoryFake({ emitOnSubscribe: false });
    const profileRepository = createQuizzerProfileRepositoryFake();
    const secureStore = createConsentSecureStoreFake({
      version: 1,
      requestId: 'req-1',
      clientSessionToken: 'token-1',
      awaitingClaim: true,
    });
    const consentRepository = createParentalConsentRepositoryFake({
      initialSnapshot: {
        status: 'approved',
        maskedParentEmail: 'p***@example.com',
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        bindingState: 'unbound',
      },
    });
    consentRepository.setClaimResult({
      status: 'approved',
      bindingState: 'bound',
      claimedByUid: 'user-fresh',
    });

    const screen = await renderRoot(repository, profileRepository, {
      secureStore,
      consentRepository,
    });

    await act(async () => {
      repository.emit({
        uid: 'user-fresh',
        email: 'fresh@example.com',
        emailVerified: false,
      });
    });

    await waitFor(() => {
      expect(consentRepository.claim).toHaveBeenCalled();
    });
    expect(screen.queryByText(parentalConsentCopy.errors.unauthenticated)).toBeNull();
    expect(screen.queryByText(parentalConsentCopy.claimPending.transient)).toBeNull();
    expect(await screen.findByTestId('quizzer-name-title')).toBeTruthy();
    expect(secureStore.peek()).toBeNull();
  });

  it('CLAIM ERROR UX: authenticated unauthenticated is not network and not Sign-in-to-finish', async () => {
    const repository = createAuthRepositoryFake({
      initialIdentity: {
        uid: 'user-1',
        email: 'quizzer@example.com',
        emailVerified: false,
      },
    });
    const profileRepository = createQuizzerProfileRepositoryFake();
    const secureStore = createConsentSecureStoreFake({
      version: 1,
      requestId: 'req-1',
      clientSessionToken: 'token-1',
      pendingClaimUid: 'user-1',
    });
    const consentRepository = createParentalConsentRepositoryFake({
      initialSnapshot: {
        status: 'approved',
        maskedParentEmail: 'p***@example.com',
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        bindingState: 'unbound',
      },
    });
    consentRepository.setClaimError(
      new ParentalConsentError('unauthenticated', parentalConsentCopy.errors.unauthenticated),
    );

    const screen = await renderRoot(repository, profileRepository, {
      secureStore,
      consentRepository,
    });

    await waitFor(() => {
      expect(consentRepository.claim).toHaveBeenCalled();
    });
    expect(await screen.findByText(parentalConsentCopy.claimPending.authContext)).toBeTruthy();
    expect(screen.queryByText(parentalConsentCopy.errors.unauthenticated)).toBeNull();
    expect(screen.queryByText(parentalConsentCopy.claimPending.transient)).toBeNull();
    expect(screen.queryByTestId('quizzer-name-title')).toBeNull();
    expect(screen.queryByText('Luke 2:1')).toBeNull();
  });

  it('CLAIM ERROR UX: real network/unavailable still uses connection copy', async () => {
    const repository = createAuthRepositoryFake({
      initialIdentity: {
        uid: 'user-1',
        email: 'quizzer@example.com',
        emailVerified: false,
      },
    });
    const profileRepository = createQuizzerProfileRepositoryFake();
    const secureStore = createConsentSecureStoreFake({
      version: 1,
      requestId: 'req-1',
      clientSessionToken: 'token-1',
      pendingClaimUid: 'user-1',
    });
    const consentRepository = createParentalConsentRepositoryFake({
      initialSnapshot: {
        status: 'approved',
        maskedParentEmail: 'p***@example.com',
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        bindingState: 'unbound',
      },
    });
    consentRepository.setClaimError(
      new ParentalConsentError('network-unavailable', parentalConsentCopy.errors.network),
    );

    const screen = await renderRoot(repository, profileRepository, {
      secureStore,
      consentRepository,
    });

    await waitFor(() => {
      expect(consentRepository.claim).toHaveBeenCalled();
    });
    expect(await screen.findByText(parentalConsentCopy.claimPending.transient)).toBeTruthy();
    expect(screen.queryByText(parentalConsentCopy.claimPending.authContext)).toBeNull();
    expect(screen.queryByTestId('quizzer-name-title')).toBeNull();
  });

  it('EXISTING-ACCOUNT RECOVERY: matching UID claims; no second Auth account created', async () => {
    const repository = createAuthRepositoryFake({
      initialIdentity: {
        uid: 'user-existing',
        email: 'existing@example.com',
        emailVerified: false,
      },
    });
    const profileRepository = createQuizzerProfileRepositoryFake();
    const secureStore = createConsentSecureStoreFake({
      version: 1,
      requestId: 'req-fresh',
      clientSessionToken: 'token-fresh',
      pendingClaimUid: 'user-existing',
    });
    const consentRepository = createParentalConsentRepositoryFake({
      initialSnapshot: {
        status: 'approved',
        maskedParentEmail: 'p***@example.com',
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        bindingState: 'unbound',
      },
    });
    consentRepository.setClaimResult({
      status: 'approved',
      bindingState: 'bound',
      claimedByUid: 'user-existing',
    });

    const screen = await renderRoot(repository, profileRepository, {
      secureStore,
      consentRepository,
    });

    await waitFor(() => {
      expect(consentRepository.claim).toHaveBeenCalled();
    });
    expect(repository.signUp).not.toHaveBeenCalled();
    expect(await screen.findByTestId('quizzer-name-title')).toBeTruthy();
    expect(secureStore.peek()).toBeNull();
  });
});

describe('RootNavigator account lifecycle', () => {
  it('does not flash user A MainTabs when switching to user B', async () => {
    let releaseB: (profile: {
      quizzerId: string;
      firstName: string;
      lastName: string;
      avatarId: null;
    }) => void = () => undefined;
    const pendingB = new Promise<{
      quizzerId: string;
      firstName: string;
      lastName: string;
      avatarId: null;
    }>((resolve) => {
      releaseB = resolve;
    });

    const repository = createAuthRepositoryFake({
      initialIdentity: {
        uid: 'user-a',
        email: 'a@example.com',
        emailVerified: false,
      },
    });
    const profileRepository = createQuizzerProfileRepositoryFake();
    (profileRepository.getProfile as jest.Mock).mockImplementation(async (quizzerId: string) => {
      if (quizzerId === 'user-a') {
        return {
          quizzerId: 'user-a',
          firstName: 'Taylor',
          lastName: 'Quizzer',
          avatarId: null,
        };
      }
      return pendingB;
    });

    const screen = await renderRoot(repository, profileRepository);

    expect(await screen.findByText('Luke 2:1')).toBeTruthy();

    await act(async () => {
      repository.emit({
        uid: 'user-b',
        email: 'b@example.com',
        emailVerified: false,
      });
    });

    expect(screen.queryByText('Luke 2:1')).toBeNull();
    expect(screen.queryByTestId('quizzer-name-title')).toBeNull();
    expect(await screen.findByTestId('quizzer-profile-loading')).toBeTruthy();

    await act(async () => {
      releaseB({
        quizzerId: 'user-b',
        firstName: 'Bailey',
        lastName: 'Quizzer',
        avatarId: null,
      });
    });

    expect(await screen.findByText('Luke 2:1')).toBeTruthy();
    expect(screen.queryByTestId('quizzer-profile-loading')).toBeNull();
  });

  it('routes a returning complete user from Sign In to MainTabs', async () => {
    const user = userEvent.setup();
    const repository = createAuthRepositoryFake({ emitOnSubscribe: false });
    const profileRepository = createQuizzerProfileRepositoryFake();
    profileRepository.seed({
      quizzerId: 'user-1',
      firstName: 'Taylor',
      lastName: 'Quizzer',
      avatarId: null,
    });

    const screen = await renderRoot(repository, profileRepository);

    await act(async () => {
      repository.emit(null);
    });

    expect(await screen.findByTestId('auth-welcome-sign-in')).toBeTruthy();
    await user.press(screen.getByTestId('auth-welcome-sign-in'));
    await user.type(await screen.findByTestId('auth-sign-in-email'), 'quizzer@example.com');
    await user.type(screen.getByTestId('auth-sign-in-password'), 'secret');
    await user.press(screen.getByTestId('auth-sign-in-submit'));

    expect(await screen.findByText('Luke 2:1')).toBeTruthy();
    expect(screen.queryByTestId('quizzer-name-title')).toBeNull();
    expect(screen.queryByTestId('auth-welcome-create-account')).toBeNull();
  });

  it('routes a returning profile-incomplete user from Sign In to QuizzerName', async () => {
    const user = userEvent.setup();
    const repository = createAuthRepositoryFake({ emitOnSubscribe: false });
    const profileRepository = createQuizzerProfileRepositoryFake();

    const screen = await renderRoot(repository, profileRepository);

    await act(async () => {
      repository.emit(null);
    });

    await user.press(await screen.findByTestId('auth-welcome-sign-in'));
    await user.type(await screen.findByTestId('auth-sign-in-email'), 'quizzer@example.com');
    await user.type(screen.getByTestId('auth-sign-in-password'), 'secret');
    await user.press(screen.getByTestId('auth-sign-in-submit'));

    expect(await screen.findByTestId('quizzer-name-title')).toBeTruthy();
    expect(screen.queryByText('Luke 2:1')).toBeNull();
  });

  it('reconstructs MainTabs after an authenticated ready restart', async () => {
    const repository = createAuthRepositoryFake({
      initialIdentity: {
        uid: 'user-1',
        email: 'quizzer@example.com',
        emailVerified: false,
      },
    });
    const profileRepository = createQuizzerProfileRepositoryFake();
    profileRepository.seed({
      quizzerId: 'user-1',
      firstName: 'Taylor',
      lastName: 'Quizzer',
      avatarId: null,
    });

    const screen = await renderRoot(repository, profileRepository);

    expect(await screen.findByText('Luke 2:1')).toBeTruthy();
    expect(screen.queryByTestId('quizzer-name-title')).toBeNull();
  });

  it('reconstructs QuizzerName after an authenticated missing-profile restart', async () => {
    const repository = createAuthRepositoryFake({
      initialIdentity: {
        uid: 'user-1',
        email: 'quizzer@example.com',
        emailVerified: false,
      },
    });

    const screen = await renderRoot(repository);

    expect(await screen.findByTestId('quizzer-name-title')).toBeTruthy();
    expect(screen.queryByText('Luke 2:1')).toBeNull();
  });

  it('reconstructs ConsentClaimPending after a pending-claim restart', async () => {
    const repository = createAuthRepositoryFake({
      initialIdentity: {
        uid: 'user-1',
        email: 'quizzer@example.com',
        emailVerified: false,
      },
    });
    const profileRepository = createQuizzerProfileRepositoryFake();
    profileRepository.seed({
      quizzerId: 'user-1',
      firstName: 'Taylor',
      lastName: 'Quizzer',
      avatarId: null,
    });
    const secureStore = createConsentSecureStoreFake({
      version: 1,
      requestId: 'req-1',
      clientSessionToken: 'token-1',
      pendingClaimUid: 'user-1',
    });
    const consentRepository = createParentalConsentRepositoryFake({
      initialSnapshot: {
        status: 'approved',
        maskedParentEmail: 'p***@example.com',
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        bindingState: 'unbound',
      },
    });
    (consentRepository.claim as jest.Mock).mockImplementation(
      () => new Promise(() => undefined),
    );

    const screen = await renderRoot(repository, profileRepository, {
      secureStore,
      consentRepository,
    });

    expect(await screen.findByTestId('consent-claim-pending-title')).toBeTruthy();
    expect(screen.queryByText('Luke 2:1')).toBeNull();
    expect(screen.queryByTestId('quizzer-name-title')).toBeNull();
  });

  it('fail-closes an injected seasonSetup seam to the loading cover, not MainTabs', async () => {
    const repository = createAuthRepositoryFake({
      initialIdentity: {
        uid: 'user-1',
        email: 'quizzer@example.com',
        emailVerified: false,
      },
    });
    const profileRepository = createQuizzerProfileRepositoryFake();
    profileRepository.seed({
      quizzerId: 'user-1',
      firstName: 'Taylor',
      lastName: 'Quizzer',
      avatarId: null,
    });

    const screen = await renderRoot(repository, profileRepository, undefined, {
      seasonSeam: { status: 'required' },
    });

    expect(await screen.findByTestId('quizzer-profile-loading')).toBeTruthy();
    expect(screen.queryByText('Luke 2:1')).toBeNull();
    expect(screen.queryByTestId('quizzer-name-title')).toBeNull();
  });

  it('fail-closes an injected entitlementAccess seam to the loading cover, not MainTabs', async () => {
    const repository = createAuthRepositoryFake({
      initialIdentity: {
        uid: 'user-1',
        email: 'quizzer@example.com',
        emailVerified: false,
      },
    });
    const profileRepository = createQuizzerProfileRepositoryFake();
    profileRepository.seed({
      quizzerId: 'user-1',
      firstName: 'Taylor',
      lastName: 'Quizzer',
      avatarId: null,
    });

    const screen = await renderRoot(repository, profileRepository, undefined, {
      entitlementSeam: { status: 'required' },
    });

    expect(await screen.findByTestId('quizzer-profile-loading')).toBeTruthy();
    expect(screen.queryByText('Luke 2:1')).toBeNull();
    expect(screen.queryByTestId('quizzer-name-title')).toBeNull();
  });
});

describe('IgniteEntryScreen reduced motion', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('still presents the brand when Reduce Motion is enabled', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockReturnValue({
      remove: jest.fn(),
    } as unknown as ReturnType<typeof AccessibilityInfo.addEventListener>);

    const screen = await render(<IgniteEntryScreen />);

    await waitFor(() => {
      expect(screen.getByText(authCopy.brand.name)).toBeTruthy();
    });
  });
});
