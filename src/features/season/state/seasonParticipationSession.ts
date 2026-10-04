import type { SeasonLifecycleError } from '../errors/seasonLifecycleError';
import type { Season } from '../domain/season';
import type { QuizzerSeasonParticipation } from '../domain/quizzerSeasonParticipation';
import type { StudyTarget } from '../domain/resolveStudyMaterialSet';

/**
 * Current Season plus this Quizzer's participation for that Season.
 * Entitlement, Flashcard session, and Study Hub are not part of this session.
 */
export type SeasonParticipationSession =
  | { status: 'idle' }
  | { status: 'loading'; quizzerId: string }
  | { status: 'noCurrentSeason'; quizzerId: string; calendarDate: string }
  | {
      status: 'setupRequired';
      quizzerId: string;
      season: Season;
      calendarDate: string;
    }
  | {
      status: 'ready';
      quizzerId: string;
      season: Season;
      calendarDate: string;
      participation: QuizzerSeasonParticipation;
      studyTarget: StudyTarget;
    }
  | { status: 'error'; quizzerId: string; error: SeasonLifecycleError };

const IDLE_SESSION: SeasonParticipationSession = { status: 'idle' };

/**
 * Render-time isolation. A session for another Quizzer must not surface as
 * ready, setup, or error. Signed-out always exposes idle.
 */
export function isolateSeasonParticipationSessionForUid(
  session: SeasonParticipationSession,
  authenticatedUid: string | null,
): SeasonParticipationSession {
  if (authenticatedUid === null) {
    return IDLE_SESSION;
  }
  if (session.status === 'idle') {
    return IDLE_SESSION;
  }
  if (session.quizzerId !== authenticatedUid) {
    return { status: 'loading', quizzerId: authenticatedUid };
  }
  return session;
}
