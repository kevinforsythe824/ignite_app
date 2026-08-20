import {
  authSessionReducer,
  initialAuthSessionState,
} from '../../../src/features/auth';

describe('authSessionReducer', () => {
  it('starts initializing', () => {
    expect(initialAuthSessionState).toEqual({ status: 'initializing' });
  });

  it('resolves to unauthenticated when identity is null', () => {
    expect(
      authSessionReducer(initialAuthSessionState, {
        type: 'auth_state_resolved',
        identity: null,
      }),
    ).toEqual({ status: 'unauthenticated' });
  });

  it('resolves to authenticated with identity', () => {
    const identity = {
      uid: 'user-1',
      email: 'quizzer@example.com',
      emailVerified: false,
    };

    expect(
      authSessionReducer(initialAuthSessionState, {
        type: 'auth_state_resolved',
        identity,
      }),
    ).toEqual({ status: 'authenticated', identity });
  });
});
