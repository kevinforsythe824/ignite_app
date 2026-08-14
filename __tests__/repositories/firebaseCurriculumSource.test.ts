import { collection, doc, getDoc, getDocs, orderBy, query } from 'firebase/firestore';

import { createFirebaseCurriculumSource } from '../../src/features/flashcards/repositories/firebaseCurriculumSource';

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
  getDocs: jest.fn(),
}));

const mockDoc = doc as jest.MockedFunction<typeof doc>;
const mockGetDoc = getDoc as jest.MockedFunction<typeof getDoc>;
const mockCollection = collection as jest.MockedFunction<typeof collection>;
const mockQuery = query as jest.MockedFunction<typeof query>;
const mockOrderBy = orderBy as jest.MockedFunction<typeof orderBy>;
const mockGetDocs = getDocs as jest.MockedFunction<typeof getDocs>;

describe('createFirebaseCurriculumSource', () => {
  const fakeDb = { name: 'fake-db' };

  beforeEach(() => {
    mockDoc.mockReset();
    mockGetDoc.mockReset();
    mockCollection.mockReset();
    mockQuery.mockReset();
    mockOrderBy.mockReset();
    mockGetDocs.mockReset();
  });

  it('reads seasons/{seasonId} and seasons/{seasonId}/cards ordered by card_number', async () => {
    const seasonRef = { path: 'seasons/test-season' };
    const cardsRef = { path: 'seasons/test-season/cards' };
    const cardsQuery = { path: 'ordered-cards' };
    mockDoc.mockReturnValue(seasonRef as never);
    mockCollection.mockReturnValue(cardsRef as never);
    mockOrderBy.mockReturnValue('card_number-order' as never);
    mockQuery.mockReturnValue(cardsQuery as never);
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ title: 'Luke 2:1-9' }),
    } as never);
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 'v1', data: () => ({ card_number: 1 }) },
        { id: 'v2', data: () => ({ card_number: 2 }) },
      ],
    } as never);

    const source = createFirebaseCurriculumSource(() => fakeDb as never);
    const season = await source.getSeason('test-season');
    const cards = await source.listCardsOrderedByNumber('test-season');

    expect(mockDoc).toHaveBeenCalledWith(fakeDb, 'seasons', 'test-season');
    expect(season).toEqual({ exists: true, data: { title: 'Luke 2:1-9' } });
    expect(mockCollection).toHaveBeenCalledWith(fakeDb, 'seasons', 'test-season', 'cards');
    expect(mockOrderBy).toHaveBeenCalledWith('card_number');
    expect(mockQuery).toHaveBeenCalledWith(cardsRef, 'card_number-order');
    expect(cards).toEqual([
      { cardId: 'v1', data: { card_number: 1 } },
      { cardId: 'v2', data: { card_number: 2 } },
    ]);
  });
});
