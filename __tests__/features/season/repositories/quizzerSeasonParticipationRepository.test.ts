import type { DivisionId } from '../../../../src/features/season/domain/division';
import { quizzerSeasonParticipationDocumentPath } from '../../../../src/features/season/data/firestoreQuizzerSeasonParticipationDocument';
import {
  OFFICIAL_REGION_CONFIGURATION_RETENTION,
  QUIZZER_SEASON_PARTICIPATION_DELETION_TARGET,
} from '../../../../src/features/season/data/participationDeletionInventory';
import { mapFirestoreQuizzerSeasonParticipationToDomain } from '../../../../src/features/season/data/mapFirestoreQuizzerSeasonParticipation';
import { ParticipationRepositoryError } from '../../../../src/features/season/errors/participationRepositoryError';
import {
  FirestoreQuizzerSeasonParticipationRepository,
  type ParticipationDocumentSnapshot,
  type QuizzerSeasonParticipationFirestoreSource,
} from '../../../../src/features/season/repositories/firestoreQuizzerSeasonParticipationRepository';

const USER_ID = 'quizzer-1';
const SEASON_ID = '2032';

function competitiveDocument(overrides: Record<string, unknown> = {}) {
  return {
    quizzerId: USER_ID,
    seasonId: SEASON_ID,
    regionId: 'northwest',
    readiness: 'ready',
    participationType: 'competitive',
    divisionId: 'junior' as DivisionId,
    ...overrides,
  };
}

function studyTrackDocument() {
  return {
    quizzerId: USER_ID,
    seasonId: SEASON_ID,
    regionId: 'southeast',
    readiness: 'ready',
    participationType: 'studyTrack',
    studyTrackMaterialSetId: 'ms-experienced',
  };
}

function source(
  snapshot: ParticipationDocumentSnapshot,
  onGet?: (userId: string, seasonId: string) => void,
): QuizzerSeasonParticipationFirestoreSource {
  return {
    async getParticipation(userId, seasonId) {
      onGet?.(userId, seasonId);
      return snapshot;
    },
  };
}

describe('FirestoreQuizzerSeasonParticipationRepository', () => {
  it('returns null when the document is missing', async () => {
    const calls: string[] = [];
    const repository = new FirestoreQuizzerSeasonParticipationRepository(
      source({ exists: false, data: undefined }, (userId, seasonId) => {
        calls.push(`${userId}/${seasonId}`);
      }),
    );
    await expect(repository.getParticipation(USER_ID, SEASON_ID)).resolves.toBeNull();
    expect(calls).toEqual([`${USER_ID}/${SEASON_ID}`]);
  });

  it('maps valid competitive and study track documents', async () => {
    const competitive = new FirestoreQuizzerSeasonParticipationRepository(
      source({ exists: true, data: competitiveDocument() }),
    );
    await expect(competitive.getParticipation(USER_ID, SEASON_ID)).resolves.toEqual(
      competitiveDocument(),
    );

    const studyTrack = new FirestoreQuizzerSeasonParticipationRepository(
      source({ exists: true, data: studyTrackDocument() }),
    );
    await expect(studyTrack.getParticipation(USER_ID, SEASON_ID)).resolves.toEqual(
      studyTrackDocument(),
    );
  });

  it('rejects identity mismatches, broken XOR, privacy fields, and unexpected fields', async () => {
    const cases = [
      competitiveDocument({ quizzerId: 'someone-else' }),
      competitiveDocument({ seasonId: '2026' }),
      { ...competitiveDocument(), studyTrackMaterialSetId: 'ms-junior' },
      { ...competitiveDocument(), eligibilityAge: 11 },
      { ...competitiveDocument(), dateOfBirth: '2010-01-01' },
      { ...competitiveDocument(), isFirstYearQuizzer: true },
      { ...competitiveDocument(), wizardStep: 'review' },
      { ...studyTrackDocument(), divisionId: 'experienced' },
    ];

    for (const data of cases) {
      const repository = new FirestoreQuizzerSeasonParticipationRepository(
        source({ exists: true, data }),
      );
      await expect(repository.getParticipation(USER_ID, SEASON_ID)).rejects.toEqual(
        expect.objectContaining<Partial<ParticipationRepositoryError>>({
          code: 'invalid-participation-data',
          message: 'Participation data is invalid.',
        }),
      );
    }
  });

  it('does not substitute another season or invent a fallback participation', async () => {
    const repository = new FirestoreQuizzerSeasonParticipationRepository(
      source({ exists: true, data: competitiveDocument({ seasonId: '2026', divisionId: 'beginner' }) }),
    );
    await expect(repository.getParticipation(USER_ID, SEASON_ID)).rejects.toMatchObject({
      code: 'invalid-participation-data',
    });

    const missing = new FirestoreQuizzerSeasonParticipationRepository(
      source({ exists: false, data: undefined }),
    );
    await expect(missing.getParticipation(USER_ID, '2099')).resolves.toBeNull();
  });

  it('translates permission and network failures', async () => {
    const denied = new FirestoreQuizzerSeasonParticipationRepository({
      async getParticipation() {
        throw { code: 'permission-denied' };
      },
    });
    await expect(denied.getParticipation(USER_ID, SEASON_ID)).rejects.toMatchObject({
      code: 'permission-denied',
    });

    const offline = new FirestoreQuizzerSeasonParticipationRepository({
      async getParticipation() {
        throw { code: 'unavailable', message: 'users/quizzer-1/seasons/2032' };
      },
    });
    await expect(offline.getParticipation(USER_ID, SEASON_ID)).rejects.toMatchObject({
      code: 'unavailable',
      message: 'Participation is temporarily unavailable. Check your connection and try again.',
    });
  });

  it('does not expose a client create, update, or delete method', () => {
    const repository = new FirestoreQuizzerSeasonParticipationRepository(
      source({ exists: false, data: undefined }),
    );
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(repository));
    expect(methods).toContain('getParticipation');
    expect(methods).not.toContain('createParticipation');
    expect(methods).not.toContain('updateParticipation');
    expect(methods).not.toContain('deleteParticipation');
  });
});

describe('participation document mapping', () => {
  it('does not infer a missing quizzer id from the path', () => {
    const { quizzerId: _omitted, ...withoutQuizzer } = competitiveDocument();
    expect(() =>
      mapFirestoreQuizzerSeasonParticipationToDomain(withoutQuizzer, USER_ID, SEASON_ID),
    ).toThrow(/quizzerId|document/);
  });
});

describe('participation deletion inventory', () => {
  it('lists the participation path as delete-with-account and regions as not account-owned', () => {
    expect(QUIZZER_SEASON_PARTICIPATION_DELETION_TARGET).toEqual({
      pathPattern: 'users/{uid}/seasons/{seasonId}',
      classification: 'DELETE_WITH_ACCOUNT',
      clientDelete: 'denied',
    });
    expect(quizzerSeasonParticipationDocumentPath('quizzer-1', '2032')).toBe(
      'users/quizzer-1/seasons/2032',
    );
    expect(OFFICIAL_REGION_CONFIGURATION_RETENTION).toEqual({
      pathPattern: 'seasons/{seasonId}/regions/{regionId}',
      classification: 'NOT_ACCOUNT_OWNED',
    });
  });
});
