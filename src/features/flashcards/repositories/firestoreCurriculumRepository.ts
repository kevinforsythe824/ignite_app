import type { FirestoreCardSnapshot } from '../data/mapFirestoreToCard';
import { InvalidCurriculumDocumentError, mapFirestoreCardsToDomain } from '../data/mapFirestoreToCard';
import {
  UnknownSeasonError,
  type CurriculumRepository,
  type StudyCurriculum,
} from './curriculumRepository';

export interface SeasonDocumentSnapshot {
  exists: boolean;
  data: unknown;
}

/** Smallest Firestore read port for curriculum. Injected in tests. */
export interface CurriculumFirestoreSource {
  getSeason(seasonId: string): Promise<SeasonDocumentSnapshot>;
  listCardsOrderedByNumber(seasonId: string): Promise<readonly FirestoreCardSnapshot[]>;
}

export type CurriculumPersistenceCode = 'permission-denied' | 'unavailable' | 'unexpected';

/** Application-facing Firestore/infrastructure failure. */
export class CurriculumPersistenceError extends Error {
  readonly code: CurriculumPersistenceCode;
  readonly seasonId: string | undefined;

  constructor(code: CurriculumPersistenceCode, message: string, seasonId?: string) {
    super(message);
    this.name = 'CurriculumPersistenceError';
    this.code = code;
    this.seasonId = seasonId;
  }
}

const PERMISSION_MESSAGE = 'You do not have permission to load this curriculum.';
const UNAVAILABLE_MESSAGE =
  'Curriculum is temporarily unavailable. Check your connection and try again.';
const UNEXPECTED_MESSAGE = 'Unable to load curriculum.';

function firestoreErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }
  const code = (error as { code: unknown }).code;
  if (typeof code !== 'string') {
    return undefined;
  }
  return code.replace(/^firestore\//, '');
}

function translateCurriculumError(error: unknown, seasonId: string): never {
  if (
    error instanceof UnknownSeasonError ||
    error instanceof InvalidCurriculumDocumentError ||
    error instanceof CurriculumPersistenceError
  ) {
    throw error;
  }

  const code = firestoreErrorCode(error);
  if (code === 'not-found') {
    throw new UnknownSeasonError(seasonId);
  }
  if (code === 'permission-denied') {
    throw new CurriculumPersistenceError('permission-denied', PERMISSION_MESSAGE, seasonId);
  }
  if (code === 'unavailable' || code === 'deadline-exceeded') {
    throw new CurriculumPersistenceError('unavailable', UNAVAILABLE_MESSAGE, seasonId);
  }

  throw new CurriculumPersistenceError('unexpected', UNEXPECTED_MESSAGE, seasonId);
}

function readSeasonTitle(data: unknown, seasonId: string): string {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw new InvalidCurriculumDocumentError('document', 'must be an object', seasonId);
  }

  const title = (data as { title?: unknown }).title;
  if (typeof title !== 'string' || title.trim().length === 0) {
    throw new InvalidCurriculumDocumentError(
      'title',
      'must be a non-empty string',
      seasonId,
    );
  }

  return title.trim();
}

/** Firestore-backed CurriculumRepository. Not wired into the live Study tab yet. */
export class FirestoreCurriculumRepository implements CurriculumRepository {
  constructor(private readonly source: CurriculumFirestoreSource) {}

  async getCurriculum(seasonId: string): Promise<StudyCurriculum> {
    try {
      const season = await this.source.getSeason(seasonId);
      if (!season.exists) {
        throw new UnknownSeasonError(seasonId);
      }

      const title = readSeasonTitle(season.data, seasonId);
      const snapshots = await this.source.listCardsOrderedByNumber(seasonId);
      const cards = mapFirestoreCardsToDomain(snapshots, seasonId);

      return { seasonId, title, cards };
    } catch (error) {
      translateCurriculumError(error, seasonId);
    }
  }
}
