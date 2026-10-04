import { resolveAppCurrentSeason } from '../application/resolveAppCurrentSeason';
import { resolveStudyMaterialSet } from '../domain/resolveStudyMaterialSet';
import type { QuizzerSeasonParticipation } from '../domain/quizzerSeasonParticipation';
import { SeasonLifecycleError } from '../errors/seasonLifecycleError';
import { toSeasonLifecycleError } from '../errors/translateSeasonLifecycleError';
import type { QuizzerSeasonParticipationRepository } from '../repositories/quizzerSeasonParticipationRepository';
import type { SeasonCatalogRepository } from '../repositories/seasonCatalogRepository';
import type { SeasonMaterialSetCatalogRepository } from '../repositories/seasonMaterialSetCatalogRepository';
import type { SeasonParticipationSession } from '../state/seasonParticipationSession';

export type LoadedSeasonParticipationSession = Exclude<
  SeasonParticipationSession,
  { status: 'idle' } | { status: 'loading' }
>;

export interface LoadSeasonParticipationSessionInput {
  quizzerId: string;
  seasonCatalog: SeasonCatalogRepository;
  participationRepository: QuizzerSeasonParticipationRepository;
  materialSetCatalog: SeasonMaterialSetCatalogRepository;
  /** Already read from the injected clock. This function does not read the clock. */
  instant: Date;
  /** Already read from Ignite environment composition. */
  environment: string;
}

function errorSession(quizzerId: string, error: SeasonLifecycleError): LoadedSeasonParticipationSession {
  return { status: 'error', quizzerId, error };
}

/**
 * Resolves current Season, this Quizzer's participation, and the Study target.
 * Does not write, enumerate participation history, or choose a fallback MaterialSet.
 */
export async function loadSeasonParticipationSession(
  input: LoadSeasonParticipationSessionInput,
): Promise<LoadedSeasonParticipationSession> {
  const { quizzerId } = input;
  try {
    const seasons = await input.seasonCatalog.listSeasons();
    const resolved = resolveAppCurrentSeason({
      seasons,
      instant: input.instant,
      environment: input.environment,
    });

    if (resolved.status === 'none') {
      return {
        status: 'noCurrentSeason',
        quizzerId,
        calendarDate: resolved.calendarDate,
      };
    }
    if (resolved.status === 'ambiguous') {
      return errorSession(quizzerId, new SeasonLifecycleError('ambiguous-season'));
    }
    if (resolved.status === 'invalid') {
      const code =
        resolved.reason === 'unknownEnvironment' || resolved.reason === 'calendarInstant'
          ? 'unexpected'
          : 'invalid-season-catalog';
      return errorSession(quizzerId, new SeasonLifecycleError(code));
    }

    const { season, calendarDate } = resolved;
    const participation = await input.participationRepository.getParticipation(
      quizzerId,
      season.seasonId,
    );
    if (participation === null) {
      return {
        status: 'setupRequired',
        quizzerId,
        season,
        calendarDate,
      };
    }
    if (participation.quizzerId !== quizzerId || participation.seasonId !== season.seasonId) {
      return errorSession(quizzerId, new SeasonLifecycleError('invalid-participation'));
    }

    return await resolveReadySession(quizzerId, season, calendarDate, participation, input);
  } catch (error) {
    return errorSession(quizzerId, toSeasonLifecycleError(error));
  }
}

async function resolveReadySession(
  quizzerId: string,
  season: Extract<LoadedSeasonParticipationSession, { status: 'setupRequired' }>['season'],
  calendarDate: string,
  participation: QuizzerSeasonParticipation,
  input: LoadSeasonParticipationSessionInput,
): Promise<LoadedSeasonParticipationSession> {
  const materialSets = await input.materialSetCatalog.listMaterialSets(season.seasonId);
  const study = resolveStudyMaterialSet(participation, materialSets);
  if (study.status !== 'resolved' || study.studyTarget.seasonId !== season.seasonId) {
    return errorSession(quizzerId, new SeasonLifecycleError('invalid-material-set'));
  }

  return {
    status: 'ready',
    quizzerId,
    season,
    calendarDate,
    participation,
    studyTarget: study.studyTarget,
  };
}
