/**
 * Durable Quizzer profile identity — not Firebase Auth identity.
 * A QuizzerProfile represents a successfully provisioned valid profile document.
 * Missing document (getProfile → null) means not yet provisioned.
 */
export interface QuizzerProfile {
  /** Stable Quizzer identity. MVP: equals Firebase Auth uid. */
  quizzerId: string;
  firstName: string;
  lastName: string;
  /** Optional controlled/preset avatar; null → initials fallback in later UI. */
  avatarId: string | null;
}
