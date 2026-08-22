import type { ProvisionQuizzerProfileInput } from '../domain/provisionQuizzerProfileInput';
import type { QuizzerProfile } from '../domain/quizzerProfile';

/** Application-facing Quizzer profile persistence contract (Phase 4). */
export interface QuizzerProfileRepository {
  /**
   * Returns the durable profile for the Quizzer, or null when not yet provisioned.
   * Missing profile is an expected lifecycle state — not an error.
   */
  getProfile(quizzerId: string): Promise<QuizzerProfile | null>;

  /**
   * Atomically creates a valid profile if missing; if one already exists, returns it unchanged.
   * Concurrent/retried calls must not overwrite an established profile.
   */
  provisionProfile(input: ProvisionQuizzerProfileInput): Promise<QuizzerProfile>;
}
