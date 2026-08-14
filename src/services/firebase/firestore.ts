import type { FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

import { getFirebaseApp } from './firebaseApp';

/**
 * Firestore instance for persistence implementations (e.g. a future
 * FirestoreCurriculumRepository). Does not query curriculum.
 */
export function getFirebaseFirestore(app: FirebaseApp = getFirebaseApp()): Firestore {
  return getFirestore(app);
}
