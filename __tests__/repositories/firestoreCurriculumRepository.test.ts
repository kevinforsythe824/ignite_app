import { CurriculumSectionInvariantError } from '../../src/features/season/domain/curriculumSection';
import { InvalidCurriculumDocumentError } from '../../src/features/flashcards/data/mapFirestoreToCard';
import {
  CurriculumPersistenceError,
  FirestoreCurriculumRepository,
  UnknownMaterialSetError,
  UnknownSeasonError,
  type CurriculumFirestoreSource,
} from '../../src/features/flashcards/repositories';

const SEASON_ID = 'season-synth';
const MATERIAL_SET_ID = 'set-alpha';
const OTHER_MATERIAL_SET_ID = 'set-beta';

function seasonData() {
  return {
    exists: true,
    data: {
      seasonId: SEASON_ID,
      name: 'Synthetic Year',
      provenance: { fingerprint: 'do-not-copy' },
    },
  };
}

function materialSetData(materialSetId: string, displayName: string) {
  return {
    exists: true,
    data: {
      seasonId: SEASON_ID,
      materialSetId,
      displayName,
    },
  };
}

function sectionSnapshot(
  sectionId: string,
  displayOrder: number,
  cardIds: string[],
  materialSetId = MATERIAL_SET_ID,
) {
  return {
    sectionId,
    data: {
      seasonId: SEASON_ID,
      materialSetId,
      sectionId,
      title: sectionId,
      displayOrder,
      cardIds,
    },
  };
}

function cardSnapshot(
  cardId: string,
  cardNumber: number,
  options: {
    materialSetId?: string;
    sectionId?: string;
    verseText?: string;
    reference?: string;
    annotations?: unknown[];
  } = {},
) {
  const materialSetId = options.materialSetId ?? MATERIAL_SET_ID;
  return {
    cardId,
    data: {
      seasonId: SEASON_ID,
      materialSetId,
      cardId,
      cardNumber,
      reference: options.reference ?? 'Book 1:1',
      verseText: options.verseText ?? `Verse for ${cardId}.`,
      sectionId: options.sectionId ?? 'section-1',
      annotations: options.annotations ?? [],
    },
  };
}

function createSource(
  overrides: Partial<CurriculumFirestoreSource> = {},
): CurriculumFirestoreSource {
  return {
    getSeason: jest.fn().mockResolvedValue(seasonData()),
    getMaterialSet: jest.fn().mockResolvedValue(materialSetData(MATERIAL_SET_ID, 'Alpha set')),
    listSections: jest.fn().mockResolvedValue([sectionSnapshot('section-1', 1, ['card-1'])]),
    listCardsOrderedByNumber: jest.fn().mockResolvedValue([cardSnapshot('card-1', 1)]),
    ...overrides,
  };
}

describe('FirestoreCurriculumRepository', () => {
  it('returns one MaterialSet with canonical identity, annotations, and MaterialSet title', async () => {
    const source = createSource({
      listSections: jest.fn().mockResolvedValue([
        sectionSnapshot('section-late', 0, ['card-b']),
        sectionSnapshot('section-early', 1, ['card-a']),
      ]),
      listCardsOrderedByNumber: jest.fn().mockResolvedValue([
        cardSnapshot('card-b', 2, {
          sectionId: 'section-late',
          verseText: 'Second synthetic verse.',
        }),
        cardSnapshot('card-a', 1, {
          sectionId: 'section-early',
          verseText: 'First synthetic verse.',
          annotations: [
            {
              annotationId: 'ann-1',
              cardId: 'card-a',
              type: 'highlight',
              sourceTarget: {
                strategy: 'phraseOccurrence',
                phrase: 'First',
                occurrenceIndex: 1,
              },
              resolvedTarget: { start: 0, end: 5 },
            },
          ],
        }),
      ]),
    });
    const repository = new FirestoreCurriculumRepository(source);

    const curriculum = await repository.getCurriculum(SEASON_ID, MATERIAL_SET_ID);

    expect(curriculum.seasonId).toBe(SEASON_ID);
    expect(curriculum.materialSetId).toBe(MATERIAL_SET_ID);
    expect(curriculum.title).toBe('Alpha set');
    expect(curriculum).not.toHaveProperty('provenance');
    expect(curriculum.cards.map((card) => card.cardId)).toEqual(['card-a', 'card-b']);
    expect(curriculum.cards.map((card) => card.cardNumber)).toEqual([1, 2]);
    expect(curriculum.sections.map((section) => section.sectionId)).toEqual([
      'section-late',
      'section-early',
    ]);
    expect(curriculum.cards[0]).toMatchObject({
      seasonId: SEASON_ID,
      materialSetId: MATERIAL_SET_ID,
      cardId: 'card-a',
      sectionId: 'section-early',
      matchedRules: [],
    });
    expect(curriculum.cards[0].annotations).toEqual([
      {
        annotationId: 'ann-1',
        cardId: 'card-a',
        type: 'highlight',
        sourceTarget: {
          strategy: 'phraseOccurrence',
          phrase: 'First',
          occurrenceIndex: 1,
        },
        resolvedTarget: { start: 0, end: 5 },
      },
    ]);
    expect(source.getSeason).toHaveBeenCalledWith(SEASON_ID);
    expect(source.getMaterialSet).toHaveBeenCalledWith(SEASON_ID, MATERIAL_SET_ID);
    expect(source.listCardsOrderedByNumber).toHaveBeenCalledWith(SEASON_ID, MATERIAL_SET_ID);
    expect(source.listSections).toHaveBeenCalledWith(SEASON_ID, MATERIAL_SET_ID);
  });

  it('keeps a second MaterialSet with the same Scripture reference isolated', async () => {
    const source = createSource({
      getMaterialSet: jest.fn(async (_seasonId: string, materialSetId: string) =>
        materialSetData(
          materialSetId,
          materialSetId === MATERIAL_SET_ID ? 'Alpha set' : 'Beta set',
        ),
      ),
      listSections: jest.fn(async (_seasonId: string, materialSetId: string) => [
        sectionSnapshot(
          'section-1',
          1,
          [materialSetId === MATERIAL_SET_ID ? 'card-alpha' : 'card-beta'],
          materialSetId,
        ),
      ]),
      listCardsOrderedByNumber: jest.fn(async (_seasonId: string, materialSetId: string) => [
        materialSetId === MATERIAL_SET_ID
          ? cardSnapshot('card-alpha', 1, {
              materialSetId,
              verseText: 'Alpha valley text.',
              reference: 'Book 1:1',
            })
          : cardSnapshot('card-beta', 1, {
              materialSetId,
              verseText: 'Beta valley text.',
              reference: 'Book 1:1',
            }),
      ]),
    });
    const repository = new FirestoreCurriculumRepository(source);

    const alpha = await repository.getCurriculum(SEASON_ID, MATERIAL_SET_ID);
    const beta = await repository.getCurriculum(SEASON_ID, OTHER_MATERIAL_SET_ID);

    expect(alpha.cards).toHaveLength(1);
    expect(beta.cards).toHaveLength(1);
    expect(alpha.cards[0].reference).toBe(beta.cards[0].reference);
    expect(alpha.cards[0].verseText).toBe('Alpha valley text.');
    expect(beta.cards[0].verseText).toBe('Beta valley text.');
    expect(alpha.cards[0].materialSetId).toBe(MATERIAL_SET_ID);
    expect(beta.cards[0].materialSetId).toBe(OTHER_MATERIAL_SET_ID);
    expect(alpha.cards.map((card) => card.cardId)).not.toContain('card-beta');
    expect(beta.cards.map((card) => card.cardId)).not.toContain('card-alpha');
    expect(alpha.title).toBe('Alpha set');
    expect(beta.title).toBe('Beta set');
  });

  it('throws UnknownSeasonError and does not read children when the season is missing', async () => {
    const source = createSource({
      getSeason: jest.fn().mockResolvedValue({ exists: false, data: undefined }),
    });
    const repository = new FirestoreCurriculumRepository(source);

    await expect(repository.getCurriculum('missing-season', MATERIAL_SET_ID)).rejects.toBeInstanceOf(
      UnknownSeasonError,
    );
    expect(source.getMaterialSet).not.toHaveBeenCalled();
    expect(source.listSections).not.toHaveBeenCalled();
    expect(source.listCardsOrderedByNumber).not.toHaveBeenCalled();
  });

  it('throws UnknownMaterialSetError and does not read children when the MaterialSet is missing', async () => {
    const source = createSource({
      getMaterialSet: jest.fn().mockResolvedValue({ exists: false, data: undefined }),
    });
    const repository = new FirestoreCurriculumRepository(source);

    await expect(repository.getCurriculum(SEASON_ID, 'missing-set')).rejects.toBeInstanceOf(
      UnknownMaterialSetError,
    );
    expect(source.listSections).not.toHaveBeenCalled();
    expect(source.listCardsOrderedByNumber).not.toHaveBeenCalled();
  });

  it('returns an empty card list when parents exist and sections do not dangle', async () => {
    const source = createSource({
      listSections: jest.fn().mockResolvedValue([sectionSnapshot('section-1', 1, [])]),
      listCardsOrderedByNumber: jest.fn().mockResolvedValue([]),
    });
    const repository = new FirestoreCurriculumRepository(source);

    await expect(repository.getCurriculum(SEASON_ID, MATERIAL_SET_ID)).resolves.toEqual({
      seasonId: SEASON_ID,
      materialSetId: MATERIAL_SET_ID,
      title: 'Alpha set',
      cards: [],
      sections: [
        {
          seasonId: SEASON_ID,
          materialSetId: MATERIAL_SET_ID,
          sectionId: 'section-1',
          title: 'section-1',
          displayOrder: 1,
          cardIds: [],
        },
      ],
    });
  });

  it('throws InvalidCurriculumDocumentError for a malformed card', async () => {
    const source = createSource({
      listCardsOrderedByNumber: jest.fn().mockResolvedValue([
        { cardId: 'card-1', data: { cardNumber: 1 } },
      ]),
    });
    const repository = new FirestoreCurriculumRepository(source);

    await expect(repository.getCurriculum(SEASON_ID, MATERIAL_SET_ID)).rejects.toBeInstanceOf(
      InvalidCurriculumDocumentError,
    );
  });

  it('throws InvalidCurriculumDocumentError for a malformed section', async () => {
    const source = createSource({
      listSections: jest.fn().mockResolvedValue([
        {
          sectionId: 'section-1',
          data: {
            seasonId: SEASON_ID,
            materialSetId: MATERIAL_SET_ID,
            sectionId: 'section-1',
            displayOrder: 1,
            cardIds: ['card-1'],
          },
        },
      ]),
    });
    const repository = new FirestoreCurriculumRepository(source);

    await expect(repository.getCurriculum(SEASON_ID, MATERIAL_SET_ID)).rejects.toBeInstanceOf(
      InvalidCurriculumDocumentError,
    );
  });

  it('throws when two cards share a cardNumber', async () => {
    const source = createSource({
      listSections: jest.fn().mockResolvedValue([
        sectionSnapshot('section-1', 1, ['card-1', 'card-2']),
      ]),
      listCardsOrderedByNumber: jest.fn().mockResolvedValue([
        cardSnapshot('card-1', 1),
        cardSnapshot('card-2', 1, { verseText: 'Another verse.' }),
      ]),
    });
    const repository = new FirestoreCurriculumRepository(source);

    await expect(repository.getCurriculum(SEASON_ID, MATERIAL_SET_ID)).rejects.toThrow(
      /cardNumber/,
    );
  });

  it('fails section and card membership invariants', async () => {
    const danglingSection = createSource({
      listSections: jest.fn().mockResolvedValue([
        sectionSnapshot('section-1', 1, ['missing-card']),
      ]),
      listCardsOrderedByNumber: jest.fn().mockResolvedValue([]),
    });
    const missingSection = createSource({
      listSections: jest.fn().mockResolvedValue([]),
      listCardsOrderedByNumber: jest.fn().mockResolvedValue([
        cardSnapshot('card-1', 1, { sectionId: 'missing-section' }),
      ]),
    });
    const unlistedCard = createSource({
      listSections: jest.fn().mockResolvedValue([sectionSnapshot('section-1', 1, [])]),
      listCardsOrderedByNumber: jest.fn().mockResolvedValue([cardSnapshot('card-1', 1)]),
    });

    await expect(
      new FirestoreCurriculumRepository(danglingSection).getCurriculum(SEASON_ID, MATERIAL_SET_ID),
    ).rejects.toBeInstanceOf(CurriculumSectionInvariantError);
    await expect(
      new FirestoreCurriculumRepository(missingSection).getCurriculum(SEASON_ID, MATERIAL_SET_ID),
    ).rejects.toBeInstanceOf(CurriculumSectionInvariantError);
    await expect(
      new FirestoreCurriculumRepository(unlistedCard).getCurriculum(SEASON_ID, MATERIAL_SET_ID),
    ).rejects.toBeInstanceOf(CurriculumSectionInvariantError);
  });

  it('translates permission-denied into CurriculumPersistenceError', async () => {
    const source = createSource({
      getSeason: jest.fn().mockRejectedValue({
        code: 'permission-denied',
        message: 'Missing or insufficient permissions.',
      }),
    });
    const repository = new FirestoreCurriculumRepository(source);

    await expect(repository.getCurriculum(SEASON_ID, MATERIAL_SET_ID)).rejects.toMatchObject({
      name: 'CurriculumPersistenceError',
      code: 'permission-denied',
      message: 'You do not have permission to load this curriculum.',
    });
  });

  it('translates unavailable/network failure into CurriculumPersistenceError', async () => {
    const source = createSource({
      listCardsOrderedByNumber: jest.fn().mockRejectedValue({
        code: 'unavailable',
        message: 'The service is currently unavailable.',
      }),
    });
    const repository = new FirestoreCurriculumRepository(source);

    await expect(repository.getCurriculum(SEASON_ID, MATERIAL_SET_ID)).rejects.toBeInstanceOf(
      CurriculumPersistenceError,
    );
    await expect(repository.getCurriculum(SEASON_ID, MATERIAL_SET_ID)).rejects.toMatchObject({
      code: 'unavailable',
      message: 'Curriculum is temporarily unavailable. Check your connection and try again.',
    });
  });

  it('translates unexpected infrastructure errors without leaking SDK messages', async () => {
    const source = createSource({
      getSeason: jest.fn().mockRejectedValue(new Error('INTERNAL assert failed at sdk.ts:12')),
    });
    const repository = new FirestoreCurriculumRepository(source);

    await expect(repository.getCurriculum(SEASON_ID, MATERIAL_SET_ID)).rejects.toMatchObject({
      name: 'CurriculumPersistenceError',
      code: 'unexpected',
      message: 'Unable to load curriculum.',
    });
  });

  it('translates missing Firebase client config without leaking env key names', async () => {
    const { FirebaseNotConfiguredError } = jest.requireActual(
      '../../src/services/firebase/firebaseConfig',
    ) as typeof import('../../src/services/firebase/firebaseConfig');
    const source = createSource({
      getSeason: jest.fn().mockRejectedValue(
        new FirebaseNotConfiguredError(['EXPO_PUBLIC_FIREBASE_API_KEY']),
      ),
    });
    const repository = new FirestoreCurriculumRepository(source);

    await expect(repository.getCurriculum(SEASON_ID, MATERIAL_SET_ID)).rejects.toMatchObject({
      name: 'CurriculumPersistenceError',
      code: 'unexpected',
      message: 'Unable to load curriculum.',
    });
  });
});
