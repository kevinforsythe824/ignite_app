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
    mockDoc.mockImplementation(((...args: unknown[]) => ({ kind: 'doc', args })) as never);
    mockCollection.mockImplementation(((...args: unknown[]) => ({
      kind: 'collection',
      args,
    })) as never);
    mockOrderBy.mockImplementation(((field: string) => ({ kind: 'orderBy', field })) as never);
    mockQuery.mockImplementation(((ref: unknown, order: unknown) => ({
      kind: 'query',
      ref,
      order,
    })) as never);
  });

  it('reads the nested MaterialSet tree and orders cards by cardNumber', async () => {
    mockGetDoc.mockImplementation((async (ref: { args?: unknown[] }) => {
      const segments = ref.args?.slice(1) ?? [];
      if (segments.length === 2) {
        return { exists: () => true, data: () => ({ name: 'Synthetic Year' }) };
      }
      return { exists: () => true, data: () => ({ displayName: 'Alpha set' }) };
    }) as never);
    mockGetDocs.mockImplementation((async (ref: { kind?: string; args?: unknown[]; ref?: { args?: unknown[] } }) => {
      const segments =
        ref.kind === 'query' ? ref.ref?.args?.slice(1) : ref.args?.slice(1);
      if (segments?.includes('sections')) {
        return { docs: [{ id: 'section-1', data: () => ({ title: 'Opening' }) }] };
      }
      return { docs: [{ id: 'card-1', data: () => ({ cardNumber: 1 }) }] };
    }) as never);

    const source = createFirebaseCurriculumSource(() => fakeDb as never);
    const season = await source.getSeason('season-synth');
    const materialSet = await source.getMaterialSet('season-synth', 'set-alpha');
    const sections = await source.listSections('season-synth', 'set-alpha');
    const cards = await source.listCardsOrderedByNumber('season-synth', 'set-alpha');

    expect(mockDoc).toHaveBeenCalledWith(fakeDb, 'seasons', 'season-synth');
    expect(mockDoc).toHaveBeenCalledWith(
      fakeDb,
      'seasons',
      'season-synth',
      'materialSets',
      'set-alpha',
    );
    expect(season).toEqual({ exists: true, data: { name: 'Synthetic Year' } });
    expect(materialSet).toEqual({ exists: true, data: { displayName: 'Alpha set' } });
    expect(mockCollection).toHaveBeenCalledWith(
      fakeDb,
      'seasons',
      'season-synth',
      'materialSets',
      'set-alpha',
      'sections',
    );
    expect(mockCollection).toHaveBeenCalledWith(
      fakeDb,
      'seasons',
      'season-synth',
      'materialSets',
      'set-alpha',
      'cards',
    );
    expect(mockCollection).not.toHaveBeenCalledWith(
      fakeDb,
      'seasons',
      'season-synth',
      'cards',
    );
    expect(mockOrderBy).toHaveBeenCalledTimes(1);
    expect(mockOrderBy).toHaveBeenCalledWith('cardNumber');
    expect(mockOrderBy).not.toHaveBeenCalledWith('card_number');
    expect(sections).toEqual([{ sectionId: 'section-1', data: { title: 'Opening' } }]);
    expect(cards).toEqual([{ cardId: 'card-1', data: { cardNumber: 1 } }]);
  });
});
