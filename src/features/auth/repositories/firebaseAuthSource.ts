import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';

import { getFirebaseAuth } from '../../../services/firebase/firebaseAuth';
import type { AuthFirebaseSource } from './firebaseAuthRepository';

function toSnapshot(user: User) {
  return {
    uid: user.uid,
    email: user.email,
    emailVerified: user.emailVerified,
  };
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

    onAuthStateChanged(listener) {
      return onAuthStateChanged(getAuthInstance(), (user) => {
        listener(user ? toSnapshot(user) : null);
      });
    },
  };
}
