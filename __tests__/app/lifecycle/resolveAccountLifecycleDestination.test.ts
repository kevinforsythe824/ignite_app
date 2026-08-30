import type {
  AccountLifecycleDestination,
  AccountLifecycleInput,
} from '../../../src/app/lifecycle/accountLifecycleDestination';
import { UNAVAILABLE_LIFECYCLE_SEAM } from '../../../src/app/lifecycle/futureLifecycleSeams';
import { mapAccountLifecycleDestinationToRootScreen } from '../../../src/app/lifecycle/mapAccountLifecycleDestinationToRootScreen';
import { resolveAccountLifecycleDestination } from '../../../src/app/lifecycle/resolveAccountLifecycleDestination';

const AUTHENTICATED_UID = 'user-b';
const OTHER_UID = 'user-a';

function input(
  overrides: Partial<AccountLifecycleInput> = {},
): AccountLifecycleInput {
  return {
    authStatus: 'authenticated',
    authenticatedUid: AUTHENTICATED_UID,
    consentHydrateStatus: 'ready',
    isClaimRequired: false,
    profileStatus: 'ready',
    profileQuizzerId: AUTHENTICATED_UID,
    seasonSeam: UNAVAILABLE_LIFECYCLE_SEAM,
    entitlementSeam: UNAVAILABLE_LIFECYCLE_SEAM,
    ...overrides,
  };
}

describe('resolveAccountLifecycleDestination', () => {
  it.each([
    {
      name: 'initializing never yields Auth or MainTabs',
      given: input({
        authStatus: 'initializing',
        authenticatedUid: null,
        profileStatus: 'ready',
        profileQuizzerId: OTHER_UID,
      }),
      expected: 'initializing',
    },
    {
      name: 'signed out is unauthenticated',
      given: input({
        authStatus: 'unauthenticated',
        authenticatedUid: null,
        profileStatus: 'ready',
        profileQuizzerId: OTHER_UID,
      }),
      expected: 'unauthenticated',
    },
    {
      name: 'sign-out wins even if profile is still ready in memory',
      given: input({
        authStatus: 'unauthenticated',
        authenticatedUid: null,
        profileStatus: 'ready',
        profileQuizzerId: AUTHENTICATED_UID,
      }),
      expected: 'unauthenticated',
    },
    {
      name: 'authenticated without uid is unauthenticated',
      given: input({
        authStatus: 'authenticated',
        authenticatedUid: null,
        profileStatus: 'ready',
        profileQuizzerId: AUTHENTICATED_UID,
      }),
      expected: 'unauthenticated',
    },
    {
      name: 'consent hydrate idle is resolving and does not evaluate claim',
      given: input({
        consentHydrateStatus: 'idle',
        isClaimRequired: true,
        profileStatus: 'ready',
      }),
      expected: 'resolving',
    },
    {
      name: 'consent hydrate hydrating is resolving and does not evaluate profile',
      given: input({
        consentHydrateStatus: 'hydrating',
        isClaimRequired: false,
        profileStatus: 'missing',
        profileQuizzerId: AUTHENTICATED_UID,
      }),
      expected: 'resolving',
    },
    {
      name: 'claim required beats profile ready',
      given: input({
        isClaimRequired: true,
        profileStatus: 'ready',
      }),
      expected: 'consentClaim',
    },
    {
      name: 'claim required beats profile missing',
      given: input({
        isClaimRequired: true,
        profileStatus: 'missing',
        profileQuizzerId: AUTHENTICATED_UID,
      }),
      expected: 'consentClaim',
    },
    {
      name: 'claim required never yields main',
      given: input({
        isClaimRequired: true,
        profileStatus: 'ready',
      }),
      expected: 'consentClaim',
    },
    {
      name: 'mismatched ready profile is resolving (A cannot win for B)',
      given: input({
        profileStatus: 'ready',
        profileQuizzerId: OTHER_UID,
      }),
      expected: 'resolving',
    },
    {
      name: 'mismatched missing profile is resolving',
      given: input({
        profileStatus: 'missing',
        profileQuizzerId: OTHER_UID,
      }),
      expected: 'resolving',
    },
    {
      name: 'mismatched error profile is resolving',
      given: input({
        profileStatus: 'error',
        profileQuizzerId: OTHER_UID,
      }),
      expected: 'resolving',
    },
    {
      name: 'profile idle is resolving',
      given: input({
        profileStatus: 'idle',
        profileQuizzerId: null,
      }),
      expected: 'resolving',
    },
    {
      name: 'profile loading is resolving',
      given: input({
        profileStatus: 'loading',
        profileQuizzerId: AUTHENTICATED_UID,
      }),
      expected: 'resolving',
    },
    {
      name: 'UID-matched profile error is profileError, not missing',
      given: input({
        profileStatus: 'error',
        profileQuizzerId: AUTHENTICATED_UID,
      }),
      expected: 'profileError',
    },
    {
      name: 'UID-matched profile missing is profileOnboarding',
      given: input({
        profileStatus: 'missing',
        profileQuizzerId: AUTHENTICATED_UID,
      }),
      expected: 'profileOnboarding',
    },
    {
      name: 'UID-matched ready with unavailable seams is main',
      given: input(),
      expected: 'main',
    },
    {
      name: 'UID-matched ready with ready seams is main',
      given: input({
        seasonSeam: { status: 'ready' },
        entitlementSeam: { status: 'ready' },
      }),
      expected: 'main',
    },
    {
      name: 'season loading is resolving',
      given: input({
        seasonSeam: { status: 'loading' },
      }),
      expected: 'resolving',
    },
    {
      name: 'season error does not become main',
      given: input({
        seasonSeam: { status: 'error' },
      }),
      expected: 'resolving',
    },
    {
      name: 'season required returns seasonSetup contract',
      given: input({
        seasonSeam: { status: 'required' },
      }),
      expected: 'seasonSetup',
    },
    {
      name: 'entitlement loading is resolving',
      given: input({
        entitlementSeam: { status: 'loading' },
      }),
      expected: 'resolving',
    },
    {
      name: 'entitlement error does not become main',
      given: input({
        entitlementSeam: { status: 'error' },
      }),
      expected: 'resolving',
    },
    {
      name: 'entitlement required returns entitlementAccess contract',
      given: input({
        entitlementSeam: { status: 'required' },
      }),
      expected: 'entitlementAccess',
    },
    {
      name: 'season required is evaluated before entitlement required',
      given: input({
        seasonSeam: { status: 'required' },
        entitlementSeam: { status: 'required' },
      }),
      expected: 'seasonSetup',
    },
    {
      name: 'claim required beats season required',
      given: input({
        isClaimRequired: true,
        seasonSeam: { status: 'required' },
      }),
      expected: 'consentClaim',
    },
  ] satisfies { name: string; given: AccountLifecycleInput; expected: AccountLifecycleDestination }[])(
    '$name',
    ({ given, expected }) => {
      expect(resolveAccountLifecycleDestination(given)).toBe(expected);
    },
  );

  it('claim incomplete never yields QuizzerName or MainTabs destinations', () => {
    const destination = resolveAccountLifecycleDestination(
      input({
        isClaimRequired: true,
        profileStatus: 'missing',
        profileQuizzerId: AUTHENTICATED_UID,
      }),
    );

    expect(destination).toBe('consentClaim');
    expect(destination).not.toBe('profileOnboarding');
    expect(destination).not.toBe('main');
  });

  it('initializing never maps to Auth or MainTabs screens', () => {
    const destination = resolveAccountLifecycleDestination(
      input({
        authStatus: 'initializing',
        authenticatedUid: null,
      }),
    );
    const screen = mapAccountLifecycleDestinationToRootScreen(destination);

    expect(destination).toBe('initializing');
    expect(screen).toBe('IgniteEntry');
    expect(screen).not.toBe('Auth');
    expect(screen).not.toBe('MainTabs');
  });
});

describe('mapAccountLifecycleDestinationToRootScreen', () => {
  it.each([
    ['initializing', 'IgniteEntry'],
    ['unauthenticated', 'Auth'],
    ['resolving', 'QuizzerProfileLoading'],
    ['consentClaim', 'ConsentClaimPending'],
    ['profileOnboarding', 'QuizzerName'],
    ['profileError', 'QuizzerProfileLoadError'],
    ['main', 'MainTabs'],
    ['seasonSetup', 'QuizzerProfileLoading'],
    ['entitlementAccess', 'QuizzerProfileLoading'],
  ] as const)('maps %s to %s', (destination, screen) => {
    expect(mapAccountLifecycleDestinationToRootScreen(destination)).toBe(screen);
  });

  it('fail-closes seasonSetup and entitlementAccess away from MainTabs', () => {
    expect(mapAccountLifecycleDestinationToRootScreen('seasonSetup')).not.toBe(
      'MainTabs',
    );
    expect(mapAccountLifecycleDestinationToRootScreen('entitlementAccess')).not.toBe(
      'MainTabs',
    );
  });
});
