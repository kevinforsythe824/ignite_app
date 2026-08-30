import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Text, View } from 'react-native';

import { AuthProvider } from '../../../src/features/auth';
import {
  ParentalConsentProvider,
  useParentalConsent,
} from '../../../src/features/parentalConsent';
import { ParentalConsentError } from '../../../src/features/parentalConsent/errors/parentalConsentError';
import { createAuthRepositoryFake } from '../../../test-utils/authRepositoryFake';
import { createConsentSecureStoreFake } from '../../../test-utils/consentSecureStoreFake';
import { createParentalConsentRepositoryFake } from '../../../test-utils/parentalConsentRepositoryFake';

function ConsentProbe(): React.JSX.Element {
  const {
    session,
    hasActiveConsent,
    isClaimRequired,
    needsFreshConsent,
    beginPostSignupClaim,
    completePostSignupClaim,
    cancelPostSignupClaim,
    createRequest,
    claim,
    enterFreshConsentRecovery,
    clearSession,
    resolveResumeDestination,
    refreshStatus,
  } = useParentalConsent();

  return (
    <View>
      <Text testID="hydrate">{session.hydrateStatus}</Text>
      <Text testID="active">{hasActiveConsent ? 'yes' : 'no'}</Text>
      <Text testID="claim-required">{isClaimRequired ? 'yes' : 'no'}</Text>
      <Text testID="fresh">{needsFreshConsent ? 'yes' : 'no'}</Text>
      <Text testID="awaiting">{session.capability?.awaitingClaim ? 'yes' : 'no'}</Text>
      <Text testID="pending-uid">{session.capability?.pendingClaimUid ?? ''}</Text>
      <Text testID="request-id">{session.capability?.requestId ?? ''}</Text>
      <Text testID="status">{session.snapshot?.status ?? 'none'}</Text>
      <Text testID="destination">{resolveResumeDestination(session.snapshot)}</Text>
      <Text
        testID="begin-claim"
        onPress={() => {
          void beginPostSignupClaim();
        }}
      >
        begin
      </Text>
      <Text
        testID="complete-claim"
        onPress={() => {
          void completePostSignupClaim('user-42');
        }}
      >
        complete
      </Text>
      <Text
        testID="cancel-claim"
        onPress={() => {
          void cancelPostSignupClaim();
        }}
      >
        cancel
      </Text>
      <Text
        testID="create-request"
        onPress={() => {
          void createRequest('parent@example.com');
        }}
      >
        create
      </Text>
      <Text
        testID="refresh"
        onPress={() => {
          void refreshStatus().catch(() => undefined);
        }}
      >
        refresh
      </Text>
      <Text
        testID="claim"
        onPress={() => {
          void claim().catch(() => undefined);
        }}
      >
        claim
      </Text>
      <Text
        testID="fresh-recovery"
        onPress={() => {
          void enterFreshConsentRecovery('user-1');
        }}
      >
        fresh
      </Text>
      <Text
        testID="clear"
        onPress={() => {
          void clearSession();
        }}
      >
        clear
      </Text>
    </View>
  );
}

async function renderConsent(options?: {
  auth?: ReturnType<typeof createAuthRepositoryFake>;
  secureStore?: ReturnType<typeof createConsentSecureStoreFake>;
  repository?: ReturnType<typeof createParentalConsentRepositoryFake>;
}) {
  const auth = options?.auth ?? createAuthRepositoryFake();
  const secureStore = options?.secureStore ?? createConsentSecureStoreFake();
  const repository = options?.repository ?? createParentalConsentRepositoryFake();

  const screen = await render(
    <AuthProvider repository={auth}>
      <ParentalConsentProvider repository={repository} secureStore={secureStore}>
        <ConsentProbe />
      </ParentalConsentProvider>
    </AuthProvider>,
  );

  await waitFor(() => {
    expect(screen.getByTestId('hydrate').props.children).toBe('ready');
  });

  return { screen, auth, secureStore, repository };
}

describe('ParentalConsentProvider claim intent', () => {
  it('AUTH HYDRATION RACE: keeps awaitingClaim while Auth initializing then promotes on authenticate', async () => {
    const auth = createAuthRepositoryFake({ emitOnSubscribe: false });
    const secureStore = createConsentSecureStoreFake({
      version: 1,
      requestId: 'req-1',
      clientSessionToken: 'token-1',
      awaitingClaim: true,
    });

    const screen = await render(
      <AuthProvider repository={auth}>
        <ParentalConsentProvider
          repository={createParentalConsentRepositoryFake()}
          secureStore={secureStore}
        >
          <ConsentProbe />
        </ParentalConsentProvider>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('hydrate').props.children).toBe('ready');
    });

    // While Auth is still initializing, awaitingClaim must survive hydrate.
    expect(screen.getByTestId('awaiting').props.children).toBe('yes');
    expect(screen.getByTestId('pending-uid').props.children).toBe('');
    expect(secureStore.peek()?.awaitingClaim).toBe(true);

    await act(async () => {
      auth.emit({
        uid: 'user-race',
        email: 'race@example.com',
        emailVerified: false,
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('pending-uid').props.children).toBe('user-race');
    });
    expect(screen.getByTestId('awaiting').props.children).toBe('no');
    expect(screen.getByTestId('claim-required').props.children).toBe('yes');
    expect(secureStore.peek()?.pendingClaimUid).toBe('user-race');
    expect(secureStore.peek()?.awaitingClaim).toBeUndefined();
  });

  it('AUTH HYDRATION RACE: unauthenticated Auth resolve keeps awaitingClaim and blocks CreateAccount', async () => {
    const auth = createAuthRepositoryFake({ emitOnSubscribe: false });
    const secureStore = createConsentSecureStoreFake({
      version: 1,
      requestId: 'req-1',
      clientSessionToken: 'token-1',
      awaitingClaim: true,
    });
    const repository = createParentalConsentRepositoryFake({
      initialSnapshot: {
        status: 'approved',
        maskedParentEmail: 'p***@example.com',
        expiresAt: new Date(Date.now() + 1000).toISOString(),
        bindingState: 'unbound',
      },
    });

    const screen = await render(
      <AuthProvider repository={auth}>
        <ParentalConsentProvider repository={repository} secureStore={secureStore}>
          <ConsentProbe />
        </ParentalConsentProvider>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('hydrate').props.children).toBe('ready');
    });
    expect(screen.getByTestId('awaiting').props.children).toBe('yes');

    await act(async () => {
      auth.emit(null);
    });

    // Do not silently destroy ambiguous post-signup claim state.
    expect(screen.getByTestId('awaiting').props.children).toBe('yes');
    expect(secureStore.peek()?.awaitingClaim).toBe(true);

    fireEvent.press(screen.getByTestId('refresh'));
    await waitFor(() => {
      expect(screen.getByTestId('status').props.children).toBe('approved');
    });
    expect(screen.getByTestId('destination').props.children).toBe('signInToClaim');
  });

  it('AUTH HYDRATION RACE: explicit signUp-failure cancel still clears generic claim intent', async () => {
    const secureStore = createConsentSecureStoreFake({
      version: 1,
      requestId: 'req-1',
      clientSessionToken: 'token-1',
    });
    const { screen, secureStore: store } = await renderConsent({ secureStore });

    fireEvent.press(screen.getByTestId('begin-claim'));
    await waitFor(() => {
      expect(screen.getByTestId('awaiting').props.children).toBe('yes');
    });

    fireEvent.press(screen.getByTestId('cancel-claim'));
    await waitFor(() => {
      expect(screen.getByTestId('awaiting').props.children).toBe('no');
    });
    expect(store.peek()?.requestId).toBe('req-1');
    expect(store.peek()?.clientSessionToken).toBe('token-1');
    expect(store.peek()?.awaitingClaim).toBeUndefined();
  });

  it('promotes awaitingClaim to pendingClaimUid when hydrating authenticated', async () => {
    const auth = createAuthRepositoryFake({
      initialIdentity: {
        uid: 'user-1',
        email: 'quizzer@example.com',
        emailVerified: false,
      },
    });
    const secureStore = createConsentSecureStoreFake({
      version: 1,
      requestId: 'req-1',
      clientSessionToken: 'token-1',
      awaitingClaim: true,
    });

    const { screen } = await renderConsent({ auth, secureStore });

    expect(screen.getByTestId('pending-uid').props.children).toBe('user-1');
    expect(screen.getByTestId('claim-required').props.children).toBe('yes');
    expect(screen.getByTestId('awaiting').props.children).toBe('no');
  });

  it('begin then cancel clears awaitingClaim only and preserves approved request', async () => {
    const secureStore = createConsentSecureStoreFake({
      version: 1,
      requestId: 'req-1',
      clientSessionToken: 'token-1',
    });
    const { screen, secureStore: store } = await renderConsent({ secureStore });

    fireEvent.press(screen.getByTestId('begin-claim'));
    await waitFor(() => {
      expect(screen.getByTestId('awaiting').props.children).toBe('yes');
    });

    fireEvent.press(screen.getByTestId('cancel-claim'));
    await waitFor(() => {
      expect(screen.getByTestId('awaiting').props.children).toBe('no');
    });
    expect(store.peek()?.requestId).toBe('req-1');
    expect(store.peek()?.clientSessionToken).toBe('token-1');
  });

  it('promotes awaitingClaim to pendingClaimUid after successful signup auth emit', async () => {
    const auth = createAuthRepositoryFake({ emitOnSubscribe: true });
    const secureStore = createConsentSecureStoreFake({
      version: 1,
      requestId: 'req-1',
      clientSessionToken: 'token-1',
    });
    const { screen } = await renderConsent({ auth, secureStore });

    fireEvent.press(screen.getByTestId('begin-claim'));
    await waitFor(() => {
      expect(screen.getByTestId('awaiting').props.children).toBe('yes');
    });

    await act(async () => {
      auth.emit({
        uid: 'user-42',
        email: 'new@example.com',
        emailVerified: false,
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('pending-uid').props.children).toBe('user-42');
    });
    expect(screen.getByTestId('awaiting').props.children).toBe('no');
    expect(screen.getByTestId('claim-required').props.children).toBe('yes');
  });

  it('FRESH UNDER-13 SIGNUP: completePostSignupClaim binds UID immediately without Sign-in message path', async () => {
    const auth = createAuthRepositoryFake({ emitOnSubscribe: true });
    const secureStore = createConsentSecureStoreFake({
      version: 1,
      requestId: 'req-1',
      clientSessionToken: 'token-1',
    });
    const { screen, secureStore: store } = await renderConsent({ auth, secureStore });

    fireEvent.press(screen.getByTestId('begin-claim'));
    await waitFor(() => {
      expect(screen.getByTestId('awaiting').props.children).toBe('yes');
    });

    fireEvent.press(screen.getByTestId('complete-claim'));
    await waitFor(() => {
      expect(screen.getByTestId('pending-uid').props.children).toBe('user-42');
    });
    expect(screen.getByTestId('awaiting').props.children).toBe('no');
    expect(store.peek()?.pendingClaimUid).toBe('user-42');
    expect(store.peek()?.awaitingClaim).toBeUndefined();
    expect(store.peek()?.requestId).toBe('req-1');
  });

  it('gates claim-required while awaitingClaim with active tokens after authenticate', async () => {
    const auth = createAuthRepositoryFake({ emitOnSubscribe: false });
    const secureStore = createConsentSecureStoreFake({
      version: 1,
      requestId: 'req-1',
      clientSessionToken: 'token-1',
      awaitingClaim: true,
    });

    const screen = await render(
      <AuthProvider repository={auth}>
        <ParentalConsentProvider
          repository={createParentalConsentRepositoryFake()}
          secureStore={secureStore}
        >
          <ConsentProbe />
        </ParentalConsentProvider>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('hydrate').props.children).toBe('ready');
    });

    await act(async () => {
      auth.emit({
        uid: 'user-race',
        email: 'race@example.com',
        emailVerified: false,
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('claim-required').props.children).toBe('yes');
    });
  });

  it('does not set claim-required for a different signed-in UID', async () => {
    const auth = createAuthRepositoryFake({
      initialIdentity: {
        uid: 'user-b',
        email: 'b@example.com',
        emailVerified: false,
      },
    });
    const secureStore = createConsentSecureStoreFake({
      version: 1,
      requestId: 'req-1',
      clientSessionToken: 'token-1',
      pendingClaimUid: 'user-a',
    });

    const { screen } = await renderConsent({ auth, secureStore });

    expect(screen.getByTestId('claim-required').props.children).toBe('no');
    expect(screen.getByTestId('active').props.children).toBe('yes');
  });

  it('preserves pendingClaimUid and needsFreshConsent across fresh createRequest', async () => {
    const secureStore = createConsentSecureStoreFake({
      version: 1,
      pendingClaimUid: 'user-1',
      needsFreshConsent: true,
    });
    const { screen } = await renderConsent({ secureStore });

    expect(screen.getByTestId('fresh').props.children).toBe('yes');

    fireEvent.press(screen.getByTestId('create-request'));

    await waitFor(() => {
      expect(screen.getByTestId('request-id').props.children).toMatch(/^req-/);
    });
    expect(screen.getByTestId('pending-uid').props.children).toBe('user-1');
    expect(screen.getByTestId('fresh').props.children).toBe('yes');
  });

  it('EXISTING ACCOUNT START-OVER RECOVERY: clearSession preserves recovery UID', async () => {
    const secureStore = createConsentSecureStoreFake({
      version: 1,
      requestId: 'req-dead',
      clientSessionToken: 'token-dead',
      pendingClaimUid: 'user-existing',
    });
    const { screen, secureStore: store } = await renderConsent({ secureStore });

    fireEvent.press(screen.getByTestId('clear'));

    await waitFor(() => {
      expect(screen.getByTestId('request-id').props.children).toBe('');
    });
    expect(screen.getByTestId('pending-uid').props.children).toBe('user-existing');
    expect(screen.getByTestId('fresh').props.children).toBe('yes');
    expect(store.peek()?.pendingClaimUid).toBe('user-existing');
    expect(store.peek()?.needsFreshConsent).toBe(true);
    expect(store.peek()?.requestId).toBeUndefined();
    expect(store.peek()?.clientSessionToken).toBeUndefined();
  });

  it('EXISTING ACCOUNT START-OVER RECOVERY: approved unbound routes to Sign In not CreateAccount', async () => {
    const secureStore = createConsentSecureStoreFake({
      version: 1,
      requestId: 'req-1',
      clientSessionToken: 'token-1',
      pendingClaimUid: 'user-existing',
      needsFreshConsent: true,
    });
    const repository = createParentalConsentRepositoryFake({
      initialSnapshot: {
        status: 'approved',
        maskedParentEmail: 'p***@example.com',
        expiresAt: new Date(Date.now() + 1000).toISOString(),
        bindingState: 'unbound',
      },
    });

    const { screen } = await renderConsent({ secureStore, repository });
    fireEvent.press(screen.getByTestId('refresh'));

    await waitFor(() => {
      expect(screen.getByTestId('destination').props.children).toBe('signInToClaim');
    });
  });

  it('EXISTING ACCOUNT START-OVER RECOVERY: matching UID claims; different UID cannot', async () => {
    const matchingAuth = createAuthRepositoryFake({
      initialIdentity: {
        uid: 'user-existing',
        email: 'existing@example.com',
        emailVerified: false,
      },
    });
    const secureStore = createConsentSecureStoreFake({
      version: 1,
      requestId: 'req-fresh',
      clientSessionToken: 'token-fresh',
      pendingClaimUid: 'user-existing',
      needsFreshConsent: true,
    });
    const { screen, repository } = await renderConsent({
      auth: matchingAuth,
      secureStore,
    });

    expect(screen.getByTestId('claim-required').props.children).toBe('yes');
    fireEvent.press(screen.getByTestId('claim'));
    await waitFor(() => {
      expect(screen.getByTestId('active').props.children).toBe('no');
    });
    expect(repository.claim).toHaveBeenCalled();

    const otherAuth = createAuthRepositoryFake({
      initialIdentity: {
        uid: 'user-other',
        email: 'other@example.com',
        emailVerified: false,
      },
    });
    const otherStore = createConsentSecureStoreFake({
      version: 1,
      requestId: 'req-fresh-2',
      clientSessionToken: 'token-fresh-2',
      pendingClaimUid: 'user-existing',
      needsFreshConsent: true,
    });
    const otherRepo = createParentalConsentRepositoryFake();
    const { screen: otherScreen } = await renderConsent({
      auth: otherAuth,
      secureStore: otherStore,
      repository: otherRepo,
    });

    expect(otherScreen.getByTestId('claim-required').props.children).toBe('no');
    fireEvent.press(otherScreen.getByTestId('claim'));
    await waitFor(() => {
      expect(otherRepo.claim).not.toHaveBeenCalled();
    });
    expect(otherStore.peek()?.pendingClaimUid).toBe('user-existing');
  });

  it('routes approved unbound with pendingClaimUid to signInToClaim', async () => {
    const secureStore = createConsentSecureStoreFake({
      version: 1,
      requestId: 'req-1',
      clientSessionToken: 'token-1',
      pendingClaimUid: 'user-1',
      needsFreshConsent: true,
    });
    const repository = createParentalConsentRepositoryFake({
      initialSnapshot: {
        status: 'approved',
        maskedParentEmail: 'p***@example.com',
        expiresAt: new Date(Date.now() + 1000).toISOString(),
        bindingState: 'unbound',
      },
    });

    const { screen } = await renderConsent({ secureStore, repository });

    fireEvent.press(screen.getByTestId('refresh'));

    await waitFor(() => {
      expect(screen.getByTestId('status').props.children).toBe('approved');
    });
    expect(screen.getByTestId('destination').props.children).toBe('signInToClaim');
  });

  it('routes approved unbound without pendingClaimUid to createAccount', async () => {
    const secureStore = createConsentSecureStoreFake({
      version: 1,
      requestId: 'req-1',
      clientSessionToken: 'token-1',
    });
    const repository = createParentalConsentRepositoryFake({
      initialSnapshot: {
        status: 'approved',
        maskedParentEmail: 'p***@example.com',
        expiresAt: new Date(Date.now() + 1000).toISOString(),
        bindingState: 'unbound',
      },
    });

    const { screen } = await renderConsent({ secureStore, repository });
    fireEvent.press(screen.getByTestId('refresh'));

    await waitFor(() => {
      expect(screen.getByTestId('destination').props.children).toBe('createAccount');
    });
  });

  it('routes approved bound to recovery and never createAccount', async () => {
    const secureStore = createConsentSecureStoreFake({
      version: 1,
      requestId: 'req-1',
      clientSessionToken: 'token-1',
    });
    const repository = createParentalConsentRepositoryFake({
      initialSnapshot: {
        status: 'approved',
        maskedParentEmail: 'p***@example.com',
        expiresAt: new Date(Date.now() + 1000).toISOString(),
        bindingState: 'bound',
      },
    });

    const { screen } = await renderConsent({ secureStore, repository });
    fireEvent.press(screen.getByTestId('refresh'));

    await waitFor(() => {
      expect(screen.getByTestId('destination').props.children).toBe('recovery');
    });
  });

  it('clears capability after successful claim', async () => {
    const auth = createAuthRepositoryFake({
      initialIdentity: {
        uid: 'user-1',
        email: 'quizzer@example.com',
        emailVerified: false,
      },
    });
    const secureStore = createConsentSecureStoreFake({
      version: 1,
      requestId: 'req-1',
      clientSessionToken: 'token-1',
      pendingClaimUid: 'user-1',
    });
    const { screen, secureStore: store, repository } = await renderConsent({
      auth,
      secureStore,
    });

    fireEvent.press(screen.getByTestId('claim'));

    await waitFor(() => {
      expect(screen.getByTestId('active').props.children).toBe('no');
    });
    expect(store.peek()).toBeNull();
    expect(repository.claim).toHaveBeenCalledWith({
      requestId: 'req-1',
      clientSessionToken: 'token-1',
    });
    const claimArg = (repository.claim as jest.Mock).mock.calls[0][0];
    expect(claimArg).not.toHaveProperty('uid');
    expect(claimArg).not.toHaveProperty('authenticatedUid');
  });

  it('enters fresh consent recovery on terminal claim failure', async () => {
    const auth = createAuthRepositoryFake({
      initialIdentity: {
        uid: 'user-1',
        email: 'quizzer@example.com',
        emailVerified: false,
      },
    });
    const secureStore = createConsentSecureStoreFake({
      version: 1,
      requestId: 'req-1',
      clientSessionToken: 'token-1',
      pendingClaimUid: 'user-1',
    });
    const repository = createParentalConsentRepositoryFake();
    repository.setClaimError(new ParentalConsentError('already-exists', 'bound'));

    const { screen, secureStore: store } = await renderConsent({
      auth,
      secureStore,
      repository,
    });

    fireEvent.press(screen.getByTestId('claim'));

    await waitFor(() => {
      expect(screen.getByTestId('fresh').props.children).toBe('yes');
    });
    expect(screen.getByTestId('pending-uid').props.children).toBe('user-1');
    expect(store.peek()?.requestId).toBeUndefined();
    expect(store.peek()?.clientSessionToken).toBeUndefined();
  });

  it('ignores stale getStatus responses via generation guard', async () => {
    let releaseFirst: () => void = () => undefined;
    const firstDelay = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const repository = createParentalConsentRepositoryFake({
      initialSnapshot: {
        status: 'pending',
        maskedParentEmail: 'p***@example.com',
        expiresAt: new Date(Date.now() + 1000).toISOString(),
        bindingState: 'unbound',
      },
    });
    repository.setGetStatusDelay(() => firstDelay);

    const secureStore = createConsentSecureStoreFake({
      version: 1,
      requestId: 'req-1',
      clientSessionToken: 'token-1',
    });

    const auth = createAuthRepositoryFake();
    let refresh: () => Promise<unknown> = async () => null;

    function RefreshProbe(): React.JSX.Element {
      const { refreshStatus, session } = useParentalConsent();
      refresh = refreshStatus;
      return (
        <View>
          <Text testID="status">{session.snapshot?.status ?? 'none'}</Text>
        </View>
      );
    }

    const screen = await render(
      <AuthProvider repository={auth}>
        <ParentalConsentProvider repository={repository} secureStore={secureStore}>
          <RefreshProbe />
        </ParentalConsentProvider>
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('status')).toBeTruthy());

    let firstPromise: Promise<unknown>;
    await act(async () => {
      firstPromise = refresh();
    });

    repository.setGetStatusDelay(async () => undefined);
    repository.seedStatus({
      status: 'approved',
      bindingState: 'unbound',
      maskedParentEmail: 'p***@example.com',
      expiresAt: new Date(Date.now() + 1000).toISOString(),
    });

    await act(async () => {
      await refresh();
    });

    expect(screen.getByTestId('status').props.children).toBe('approved');

    await act(async () => {
      releaseFirst();
      await firstPromise!;
    });

    expect(screen.getByTestId('status').props.children).toBe('approved');
  });

  it('does not resurrect capability when createRequest completes after clearSession', async () => {
    let releaseCreate: () => void = () => undefined;
    const pendingCreate = new Promise<void>((resolve) => {
      releaseCreate = resolve;
    });
    const repository = createParentalConsentRepositoryFake();
    repository.setCreateDelay(() => pendingCreate);

    const { screen, secureStore } = await renderConsent({ repository });

    await waitFor(() => expect(screen.getByTestId('hydrate').props.children).toBe('ready'));

    fireEvent.press(screen.getByTestId('create-request'));
    await waitFor(() => expect(repository.createRequest).toHaveBeenCalled());

    fireEvent.press(screen.getByTestId('clear'));
    await waitFor(() => {
      expect(screen.getByTestId('request-id').props.children).toBe('');
    });
    expect(secureStore.peek()).toBeNull();

    await act(async () => {
      releaseCreate();
    });

    await waitFor(() => expect(repository.createRequest).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('request-id').props.children).toBe('');
    expect(screen.getByTestId('active').props.children).toBe('no');
    expect(secureStore.peek()).toBeNull();
  });

  it('does not wipe pendingClaimUid when claim completes after clearSession', async () => {
    let releaseClaim: () => void = () => undefined;
    const pendingClaim = new Promise<void>((resolve) => {
      releaseClaim = resolve;
    });
    const auth = createAuthRepositoryFake({
      initialIdentity: {
        uid: 'user-existing',
        email: 'existing@example.com',
        emailVerified: false,
      },
    });
    const secureStore = createConsentSecureStoreFake({
      version: 1,
      requestId: 'req-fresh',
      clientSessionToken: 'token-fresh',
      pendingClaimUid: 'user-existing',
    });
    const repository = createParentalConsentRepositoryFake();
    repository.setClaimDelay(() => pendingClaim);

    const { screen, secureStore: store } = await renderConsent({
      auth,
      secureStore,
      repository,
    });

    await waitFor(() => expect(screen.getByTestId('pending-uid').props.children).toBe('user-existing'));

    fireEvent.press(screen.getByTestId('claim'));
    await waitFor(() => expect(repository.claim).toHaveBeenCalled());

    fireEvent.press(screen.getByTestId('clear'));
    await waitFor(() => {
      expect(screen.getByTestId('request-id').props.children).toBe('');
    });
    expect(store.peek()?.pendingClaimUid).toBe('user-existing');
    expect(store.peek()?.needsFreshConsent).toBe(true);

    await act(async () => {
      releaseClaim();
    });

    await waitFor(() => expect(repository.claim).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('pending-uid').props.children).toBe('user-existing');
    expect(screen.getByTestId('fresh').props.children).toBe('yes');
    expect(store.peek()?.pendingClaimUid).toBe('user-existing');
    expect(store.peek()?.needsFreshConsent).toBe(true);
    expect(store.peek()?.requestId).toBeUndefined();
  });
});
