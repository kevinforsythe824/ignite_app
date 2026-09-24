/**
 * @jest-environment node
 */
import {
  openFirestoreCurriculumReader,
  type FirestoreCurriculumReaderDependencies,
} from '../../scripts/content-import/firestoreCurriculumReader';

describe('openFirestoreCurriculumReader', () => {
  it('reads one season through the injected named app and does not initialize Admin', async () => {
    const resolveApp = jest.fn(async () => ({ name: 'ignite-content-import' }));
    const seasonGet = jest.fn(async () => ({
      exists: true,
      data: () => ({ seasonId: 'fixture', name: 'Fixture' }),
    }));
    const materialSetsGet = jest.fn(async () => ({ docs: [] }));
    const getFirestore = (() => ({
      collection: () => ({
        doc: () => ({
          get: seasonGet,
          collection: () => ({ get: materialSetsGet }),
        }),
      }),
    })) as unknown as NonNullable<FirestoreCurriculumReaderDependencies['getFirestore']>;

    const reader = openFirestoreCurriculumReader(
      { environment: 'dev', projectId: 'expected-project' },
      { resolveApp, getFirestore },
    );
    const snapshot = await reader.loadSeasonCurriculum('fixture');

    expect(resolveApp).toHaveBeenCalledWith('expected-project');
    expect(snapshot.documents).toEqual([
      { path: 'seasons/fixture', data: { seasonId: 'fixture', name: 'Fixture' } },
    ]);
  });
});
