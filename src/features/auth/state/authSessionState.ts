import type { AuthenticatedIdentity } from '../domain/authenticatedIdentity';

export type AuthSessionState =
  | { status: 'initializing' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; identity: AuthenticatedIdentity };
