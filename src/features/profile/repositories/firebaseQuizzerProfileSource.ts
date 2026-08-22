import { doc, getDoc, runTransaction } from 'firebase/firestore';

import { getFirebaseFirestore } from '../../../services/firebase';
import type { FirestoreQuizzerProfileDocument } from '../data/firestoreQuizzerProfileDocument';
import {
  PROFILE_COLLECTION,
  PROFILE_DOCUMENT_ID,
  USERS_COLLECTION,
} from '../data/firestoreQuizzerProfileDocument';
import { FirestoreQuizzerProfileRepository } from './firestoreQuizzerProfileRepository';
import type { QuizzerProfileFirestoreSource } from './firestoreQuizzerProfileRepository';

function profileDocRef(
  getDb: () => ReturnType<typeof getFirebaseFirestore>,
  quizzerId: string,
) {
  return doc(
    getDb(),
    USERS_COLLECTION,
    quizzerId,
    PROFILE_COLLECTION,
    PROFILE_DOCUMENT_ID,
  );
}

/**
 * Production Firestore reads/writes for Quizzer profile.
 * Uses getFirebaseFirestore(); does not initialize Firebase itself.
 */
export function createFirebaseQuizzerProfileSource(
  getDb: () => ReturnType<typeof getFirebaseFirestore> = getFirebaseFirestore,
): QuizzerProfileFirestoreSource {
  return {
    async getProfile(quizzerId) {
      const snapshot = await getDoc(profileDocRef(getDb, quizzerId));
      return {
        exists: snapshot.exists(),
        data: snapshot.exists() ? snapshot.data() : undefined,
      };
    },

    async createProfileIfMissing(quizzerId, document: FirestoreQuizzerProfileDocument) {
      const ref = profileDocRef(getDb, quizzerId);

      return runTransaction(getDb(), async (transaction) => {
        const snapshot = await transaction.get(ref);
        if (snapshot.exists()) {
          return {
            exists: true,
            data: snapshot.data(),
          };
        }

        transaction.set(ref, document);
        return {
          exists: true,
          data: document,
        };
      });
    },
  };
}

export const firestoreQuizzerProfileRepository = new FirestoreQuizzerProfileRepository(
  createFirebaseQuizzerProfileSource(),
);
