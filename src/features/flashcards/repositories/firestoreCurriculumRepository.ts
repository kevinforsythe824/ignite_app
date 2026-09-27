import { FirebaseNotConfiguredError } from '../../../services/firebase/firebaseConfig';
import type { Card } from '../domain/card';
import { readMaterialSetDisplayName } from '../data/mapFirestoreMaterialSet';
import type { FirestoreSectionSnapshot } from '../data/mapFirestoreSection';
import { mapFirestoreSectionToDomain } from '../data/mapFirestoreSection';
import type { FirestoreCardSnapshot } from '../data/mapFirestoreToCard';
import {
  InvalidCurriculumDocumentError,
  mapFirestoreCardsToDomain,
} from '../data/mapFirestoreToCard';
import {
  assertCurriculumSectionInvariants,
  CurriculumSectionInvariantError,
  sortCurriculumSections,
  type CurriculumSection,
} from '../../season/domain/curriculumSection';
import {
  UnknownMaterialSetError,
  UnknownSeasonError,
  type CurriculumRepository,
  type StudyCurriculum,
} from './curriculumRepository';

export interface CurriculumDocumentSnapshot {
  exists: boolean;
  data: unknown;
}

/** @deprecated Use CurriculumDocumentSnapshot. Kept for existing imports. */
export type SeasonDocumentSnapshot = CurriculumDocumentSnapshot;

/** Smallest Firestore read port for nested curriculum. Injected in tests. */
export interface CurriculumFirestoreSource {
  getSeason(seasonId: string): Promise<CurriculumDocumentSnapshot>;
  getMaterialSet(
    seasonId: string,
    materialSetId: string,
  ): Promise<CurriculumDocumentSnapshot>;
  listSections(
    seasonId: string,
    materialSetId: string,
  ): Promise<readonly FirestoreSectionSnapshot[]>;
  listCardsOrderedByNumber(
    seasonId: string,
    materialSetId: string,
  ): Promise<readonly FirestoreCardSnapshot[]>;
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
    error instanceof UnknownMaterialSetError ||
    error instanceof InvalidCurriculumDocumentError ||
    error instanceof CurriculumSectionInvariantError ||
    error instanceof CurriculumPersistenceError
  ) {
    throw error;
  }

  if (error instanceof FirebaseNotConfiguredError) {
    throw new CurriculumPersistenceError('unexpected', UNEXPECTED_MESSAGE, seasonId);
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

function sortCardsByStudyOrder(cards: readonly Card[]): Card[] {
  return [...cards].sort((left, right) => {
    if (left.cardNumber !== right.cardNumber) {
      return left.cardNumber - right.cardNumber;
    }
    return left.cardId.localeCompare(right.cardId);
  });
}

function assertUniqueCardIdentity(cards: readonly Card[], seasonId: string): void {
  const seenIds = new Set<string>();
  const seenNumbers = new Set<number>();
  for (const card of cards) {
    if (seenIds.has(card.cardId)) {
      throw new InvalidCurriculumDocumentError(
        'cardId',
        'is duplicated within the MaterialSet',
        seasonId,
        card.cardId,
      );
    }
    seenIds.add(card.cardId);
    if (seenNumbers.has(card.cardNumber)) {
      throw new InvalidCurriculumDocumentError(
        'cardNumber',
        'is duplicated within the MaterialSet',
        seasonId,
        card.cardId,
      );
    }
    seenNumbers.add(card.cardNumber);
  }
}

function assertCardsBelongToListedSections(
  cards: readonly Card[],
  sections: readonly CurriculumSection[],
): void {
  const sectionsById = new Map(sections.map((section) => [section.sectionId, section]));
  for (const card of cards) {
    if (!card.sectionId) {
      throw new InvalidCurriculumDocumentError(
        'sectionId',
        'must be a non-empty string',
        card.seasonId,
        card.cardId,
      );
    }
    const section = sectionsById.get(card.sectionId);
    if (!section) {
      throw new CurriculumSectionInvariantError(
        `Card "${card.cardId}" references missing section "${card.sectionId}"`,
      );
    }
    if (!section.cardIds.includes(card.cardId)) {
      throw new CurriculumSectionInvariantError(
        `Card "${card.cardId}" is missing from section "${card.sectionId}" that it belongs to`,
      );
    }
  }
}

/** Firestore-backed CurriculumRepository used by the live Study tab. */
export class FirestoreCurriculumRepository implements CurriculumRepository {
  constructor(private readonly source: CurriculumFirestoreSource) {}

  async getCurriculum(seasonId: string, materialSetId: string): Promise<StudyCurriculum> {
    try {
      const season = await this.source.getSeason(seasonId);
      if (!season.exists) {
        throw new UnknownSeasonError(seasonId);
      }

      const materialSet = await this.source.getMaterialSet(seasonId, materialSetId);
      if (!materialSet.exists) {
        throw new UnknownMaterialSetError(seasonId, materialSetId);
      }

      const title = readMaterialSetDisplayName(materialSet.data, seasonId, materialSetId);
      const [sectionSnapshots, cardSnapshots] = await Promise.all([
        this.source.listSections(seasonId, materialSetId),
        this.source.listCardsOrderedByNumber(seasonId, materialSetId),
      ]);

      const cards = sortCardsByStudyOrder(
        mapFirestoreCardsToDomain(cardSnapshots, seasonId, materialSetId),
      );
      assertUniqueCardIdentity(cards, seasonId);

      const sections = sortCurriculumSections(
        sectionSnapshots.map((snapshot) =>
          mapFirestoreSectionToDomain(
            snapshot.data,
            seasonId,
            materialSetId,
            snapshot.sectionId,
          ),
        ),
      );

      assertCurriculumSectionInvariants(
        sections,
        new Set(cards.map((card) => card.cardId)),
      );
      assertCardsBelongToListedSections(cards, sections);

      return { seasonId, materialSetId, title, cards, sections };
    } catch (error) {
      translateCurriculumError(error, seasonId);
    }
  }
}
