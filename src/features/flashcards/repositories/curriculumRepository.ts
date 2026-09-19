import type { CurriculumSection } from '../../season/domain/curriculumSection';
import type { Card } from '../domain/card';

/** Domain curriculum payload returned by CurriculumRepository. */
export interface StudyCurriculum {
  seasonId: string;
  materialSetId: string;
  title: string;
  cards: readonly Card[];
  /** Empty for the current DEV fixture; Phase 2 import will populate. */
  sections: readonly CurriculumSection[];
}

/**
 * Application-facing curriculum access.
 * Implementations must return domain types only.
 */
export interface CurriculumRepository {
  getCurriculum(seasonId: string, materialSetId: string): Promise<StudyCurriculum>;
}

export class UnknownSeasonError extends Error {
  readonly seasonId: string;

  constructor(seasonId: string) {
    super(`No curriculum available for season "${seasonId}"`);
    this.name = 'UnknownSeasonError';
    this.seasonId = seasonId;
  }
}

export class UnknownMaterialSetError extends Error {
  readonly seasonId: string;
  readonly materialSetId: string;

  constructor(seasonId: string, materialSetId: string) {
    super(
      `No curriculum available for material set "${materialSetId}" in season "${seasonId}"`,
    );
    this.name = 'UnknownMaterialSetError';
    this.seasonId = seasonId;
    this.materialSetId = materialSetId;
  }
}
