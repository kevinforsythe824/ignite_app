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

/**
 * Render-time isolation: a session whose quizzerId is not the current Auth UID
 * must not surface as ready/missing/error. Signed-out always exposes idle.
 */
export function isolateQuizzerProfileSessionForUid(
  session: QuizzerProfileSessionState,
  authenticatedUid: string | null,
): QuizzerProfileSessionState {
  if (authenticatedUid === null) {
    return { status: 'idle' };
  }

  if (session.status === 'idle') {
    return session;
  }

  if (session.quizzerId !== authenticatedUid) {
    return { status: 'loading', quizzerId: authenticatedUid };
  }

  return session;
}
