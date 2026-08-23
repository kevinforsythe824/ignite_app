import type { QuizzerProfile } from '../domain/quizzerProfile';
import type { QuizzerProfileError } from '../errors/quizzerProfileError';

/**
 * Auth-scoped Quizzer profile resolution session.
 * Failed reads are `error`, never `missing`.
 */
export type QuizzerProfileSessionState =
  | { status: 'idle' }
  | { status: 'loading'; quizzerId: string }
  | { status: 'missing'; quizzerId: string }
  | { status: 'ready'; quizzerId: string; profile: QuizzerProfile }
  | { status: 'error'; quizzerId: string; error: QuizzerProfileError };
