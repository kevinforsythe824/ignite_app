import type { Card } from '../domain/card';

/** Domain curriculum payload returned by CurriculumRepository. */
export interface StudyCurriculum {
  seasonId: string;
  title: string;
  cards: readonly Card[];
}

/**
 * Application-facing curriculum access.
 * Implementations (JSON now, Firestore later) must return domain types only.
 */
export interface CurriculumRepository {
  getCurriculum(seasonId: string): Promise<StudyCurriculum>;
}

export class UnknownSeasonError extends Error {
  readonly seasonId: string;

  constructor(seasonId: string) {
    super(`No curriculum available for season "${seasonId}"`);
    this.name = 'UnknownSeasonError';
    this.seasonId = seasonId;
  }
}
