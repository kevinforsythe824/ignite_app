export type { AuthRepository, AuthStateUnsubscribe } from './authRepository';
export { FirebaseAuthRepository } from './firebaseAuthRepository';
export type { AuthFirebaseSource, AuthFirebaseUserSnapshot } from './firebaseAuthRepository';
export { createFirebaseAuthSource } from './firebaseAuthSource';

import { FirebaseAuthRepository } from './firebaseAuthRepository';
import { createFirebaseAuthSource } from './firebaseAuthSource';

export const firebaseAuthRepository = new FirebaseAuthRepository(
  createFirebaseAuthSource(),
);
