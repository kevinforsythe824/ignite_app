import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  verifyBeforeUpdateEmail,
  type User,
} from 'firebase/auth';

import { getFirebaseAuth } from '../../../services/firebase/firebaseAuth';
import { AuthenticationError } from '../errors/authenticationError';
import type { AuthFirebaseSource } from './firebaseAuthRepository';

function toSnapshot(user: User) {
  return {
    uid: user.uid,
    email: user.email,
    emailVerified: user.emailVerified,
  };
}

function requireCurrentUser(getAuthInstance: typeof getFirebaseAuth): User {
  const user = getAuthInstance().currentUser;
  if (!user) {
    throw new AuthenticationError(
      'unexpected',
      'Unable to complete authentication.',
    );
  }
  return user;
}

/**
 * Reauthenticates the current email/password user.
 * Internal to the auth source — not part of AuthRepository.
 */
async function reauthenticateWithPassword(user: User, currentPassword: string): Promise<void> {
  if (!user.email) {
    throw new AuthenticationError(
      'unexpected',
      'Unable to complete authentication.',
    );
  }
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
}

/**
 * Production Firebase Auth reads/writes.
 * Uses shared `getFirebaseAuth()`; does not initialize Firebase itself.
 */
export function createFirebaseAuthSource(
  getAuthInstance: typeof getFirebaseAuth = getFirebaseAuth,
): AuthFirebaseSource {
  return {
    getCurrentUser() {
      const user = getAuthInstance().currentUser;
      return user ? toSnapshot(user) : null;
    },

    async signInWithEmailAndPassword(email, password) {
      const credential = await signInWithEmailAndPassword(
        getAuthInstance(),
        email,
        password,
      );
      return toSnapshot(credential.user);
    },

    async createUserWithEmailAndPassword(email, password) {
      const credential = await createUserWithEmailAndPassword(
        getAuthInstance(),
        email,
        password,
      );
      return toSnapshot(credential.user);
    },

    async signOut() {
      await signOut(getAuthInstance());
    },

    async sendPasswordResetEmail(email) {
      await sendPasswordResetEmail(getAuthInstance(), email);
    },

    async changeEmail(newEmail, currentPassword) {
      const user = requireCurrentUser(getAuthInstance);
      await reauthenticateWithPassword(user, currentPassword);
      await verifyBeforeUpdateEmail(user, newEmail);
    },

    async changePassword(currentPassword, newPassword) {
      const user = requireCurrentUser(getAuthInstance);
      await reauthenticateWithPassword(user, currentPassword);
      await updatePassword(user, newPassword);
    },

    async reloadCurrentUser() {
      const user = getAuthInstance().currentUser;
      if (!user) {
        return null;
      }
      await user.reload();
      const refreshed = getAuthInstance().currentUser;
      return refreshed ? toSnapshot(refreshed) : null;
    },

    onAuthStateChanged(listener) {
      return onAuthStateChanged(getAuthInstance(), (user) => {
        listener(user ? toSnapshot(user) : null);
      });
    },
  };
}
