import type { AuthenticatedIdentity } from '../domain/authenticatedIdentity';
import type { AuthSessionState } from './authSessionState';

export type AuthSessionAction = {
  type: 'auth_state_resolved';
  identity: AuthenticatedIdentity | null;
};

export const initialAuthSessionState: AuthSessionState = { status: 'initializing' };

export function authSessionReducer(
  state: AuthSessionState,
  action: AuthSessionAction,
): AuthSessionState {
  switch (action.type) {
    case 'auth_state_resolved':
      if (action.identity === null) {
        return { status: 'unauthenticated' };
      }
      return { status: 'authenticated', identity: action.identity };
    default:
      return state;
  }
}
