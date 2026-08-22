/**
 * Persistence shape of a Quizzer profile at:
 *   users/{userId}/profile/main
 *
 * Identity lives in the path (userId / quizzerId) — not duplicated on the document.
 * This is not the application QuizzerProfile domain model.
 */
export interface FirestoreQuizzerProfileDocument {
  first_name: string;
  last_name: string;
  avatar_id: string | null;
}

export const USERS_COLLECTION = 'users';
export const PROFILE_COLLECTION = 'profile';
export const PROFILE_DOCUMENT_ID = 'main';
