/**
 * @jest-environment node
 */
import {
  ContentImportWriteError,
  createBufferedCurriculumWriter,
  type CurriculumBatchSink,
} from '../../scripts/content-import/firestoreCurriculumWriter';
import type { CurriculumWritePort } from '../../scripts/content-import/types';

function recordingSink(): CurriculumBatchSink & { commits: string[][] } {
  const commits: string[][] = [];
  return {
    commits,
    async commit(operations) {
      commits.push(operations.map((operation) => `${operation.kind}:${operation.path}`));
    },
  };
}

async function writeCards(writer: CurriculumWritePort, count: number): Promise<void> {
  for (let index = 0; index < count; index += 1) {
    await writer.upsert(`seasons/2027/materialSets/ms/cards/c${index}`, { cardId: `c${index}` });
  }
}

describe('firestore curriculum writer', () => {
  it('commits each phase before the next phase enters a chunk', async () => {
    const sink = recordingSink();
    const writer = createBufferedCurriculumWriter(sink, 2);
    await writer.upsert('seasons/2027', { status: 'draft', name: 'Importing' });
    await writer.upsert('seasons/2027/materialSets/ms', { materialSetId: 'ms' });
    await writer.upsert('seasons/2027/materialSets/ms/sections/s1', { sectionId: 's1' });
    await writeCards(writer, 5);
    await writer.remove('seasons/2027/materialSets/stale/cards/old');
    await writer.remove('seasons/2027/materialSets/stale/sections/old');
    await writer.remove('seasons/2027/materialSets/stale');
    await writer.upsert('seasons/2027', { status: 'draft', name: 'Complete' });

    expect(sink.commits[0]).toEqual(['upsert:seasons/2027']);
    expect(sink.commits.some((commit) => commit.some((entry) => entry.startsWith('upsert:seasons/2027/materialSets/ms/cards')) && commit.some((entry) => entry === 'upsert:seasons/2027'))).toBe(false);
    const cardCommits = sink.commits.filter((commit) => commit.some((entry) => entry.includes('/cards/c')));
    expect(cardCommits.map((commit) => commit.length)).toEqual([2, 2, 1]);
    const removalIndex = sink.commits.findIndex((commit) => commit.some((entry) => entry.startsWith('remove:')));
    const completeIndex = sink.commits.findIndex(
      (commit, index) => index > 0 && commit.length === 1 && commit[0] === 'upsert:seasons/2027',
    );
    expect(removalIndex).toBeGreaterThan(cardCommits.length);
    expect(completeIndex).toBe(sink.commits.length - 1);
    expect(sink.commits[completeIndex]).toEqual(['upsert:seasons/2027']);
    const flatRemovals = sink.commits.flat().filter((entry) => entry.startsWith('remove:'));
    expect(flatRemovals).toEqual([
      'remove:seasons/2027/materialSets/stale/cards/old',
      'remove:seasons/2027/materialSets/stale/sections/old',
      'remove:seasons/2027/materialSets/stale',
    ]);
  });

  it('stops on the failing chunk and names the phase without document bodies', async () => {
    let calls = 0;
    const sink: CurriculumBatchSink = {
      async commit(operations) {
        calls += 1;
        if (calls === 2) {
          throw new Error(`secret body ${JSON.stringify(operations)}`);
        }
      },
    };
    const writer = createBufferedCurriculumWriter(sink, 2);
    await writer.upsert('seasons/2027', { verseText: 'do not print' });
    await writer.upsert('seasons/2027/materialSets/ms/cards/c0', { verseText: 'hidden' });
    let caught: unknown;
    try {
      await writer.upsert('seasons/2027/materialSets/ms/cards/c1', { verseText: 'hidden' });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ContentImportWriteError);
    const message = caught instanceof Error ? caught.message : '';
    expect(message).toMatch(/phase card-upsert chunk 1/);
    expect(message).not.toContain('verseText');
    expect(message).not.toContain('hidden');
    expect(message).not.toContain('secret body');
    expect(calls).toBe(2);
  });
});
