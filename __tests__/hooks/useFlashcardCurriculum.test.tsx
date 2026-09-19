import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import type { Card } from '../../src/features/flashcards/domain/card';
import { TEST_MATERIAL_SET_ID, TEST_SEASON_ID } from '../../src/features/flashcards/domain/testSeason';
import {
  useFlashcardCurriculum,
  type UseFlashcardCurriculumResult,
} from '../../src/features/flashcards/hooks/useFlashcardCurriculum';
import type {
  CurriculumRepository,
  StudyCurriculum,
} from '../../src/features/flashcards/repositories/curriculumRepository';
import { UnknownSeasonError } from '../../src/features/flashcards/repositories/curriculumRepository';

const sampleCard: Card = {
  seasonId: TEST_SEASON_ID,
  materialSetId: TEST_MATERIAL_SET_ID,
  cardId: 'v1',
  cardNumber: 1,
  reference: 'Luke 2:1',
  verseText: 'And it came to pass.',
  indexCode: '103-2b',
  matchedRules: [],
  tags: [],
};

const readyCurriculum: StudyCurriculum = {
  seasonId: TEST_SEASON_ID,
  materialSetId: TEST_MATERIAL_SET_ID,
  title: 'Luke 2:1-9',
  cards: [sampleCard],
  sections: [],
};

function createMockRepository(
  impl: CurriculumRepository['getCurriculum'],
): CurriculumRepository {
  return { getCurriculum: jest.fn(impl) };
}

interface HookController {
  getResult: () => UseFlashcardCurriculumResult;
  renderer: ReactTestRenderer;
}

function createHookController(
  seasonId: string,
  materialSetId: string,
  repository: CurriculumRepository,
): HookController {
  const resultRef: { current: UseFlashcardCurriculumResult | null } = { current: null };

  function HookProbe(): null {
    resultRef.current = useFlashcardCurriculum(seasonId, materialSetId, repository);
    return null;
  }

  let renderer!: ReactTestRenderer;

  act(() => {
    renderer = TestRenderer.create(<HookProbe />);
  });

  return {
    renderer,
    getResult: () => {
      if (resultRef.current === null) {
        throw new Error('useFlashcardCurriculum was not initialized');
      }
      return resultRef.current;
    },
  };
}

async function flushEffects(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

describe('useFlashcardCurriculum', () => {
  it('moves from loading to ready when cards are returned', async () => {
    const repository = createMockRepository(() => Promise.resolve(readyCurriculum));
    const { getResult } = createHookController(
      TEST_SEASON_ID,
      TEST_MATERIAL_SET_ID,
      repository,
    );

    expect(getResult().loadState).toEqual({ status: 'loading' });

    await flushEffects();

    expect(getResult().loadState).toEqual({
      status: 'ready',
      curriculum: readyCurriculum,
    });
    expect(repository.getCurriculum).toHaveBeenCalledWith(
      TEST_SEASON_ID,
      TEST_MATERIAL_SET_ID,
    );
  });

  it('moves to error when the repository rejects', async () => {
    const repository = createMockRepository(() =>
      Promise.reject(new UnknownSeasonError('missing-season')),
    );
    const { getResult } = createHookController(
      'missing-season',
      TEST_MATERIAL_SET_ID,
      repository,
    );

    expect(getResult().loadState.status).toBe('loading');

    await flushEffects();

    expect(getResult().loadState).toEqual({
      status: 'error',
      message: 'No curriculum available for season "missing-season"',
    });
  });

  it('moves to empty when the curriculum has no cards', async () => {
    const repository = createMockRepository(() =>
      Promise.resolve({
        seasonId: TEST_SEASON_ID,
        materialSetId: TEST_MATERIAL_SET_ID,
        title: 'Empty',
        cards: [],
        sections: [],
      }),
    );
    const { getResult } = createHookController(
      TEST_SEASON_ID,
      TEST_MATERIAL_SET_ID,
      repository,
    );

    await flushEffects();

    expect(getResult().loadState).toEqual({ status: 'empty' });
  });

  it('reload retries after an error and can reach ready', async () => {
    const repository = createMockRepository(() =>
      Promise.reject(new UnknownSeasonError('missing-season')),
    );
    const { getResult } = createHookController(
      'missing-season',
      TEST_MATERIAL_SET_ID,
      repository,
    );

    await flushEffects();
    expect(getResult().loadState.status).toBe('error');

    (repository.getCurriculum as jest.Mock).mockResolvedValueOnce(readyCurriculum);

    act(() => {
      getResult().reload();
    });
    expect(getResult().loadState).toEqual({ status: 'loading' });

    await flushEffects();

    expect(getResult().loadState).toEqual({
      status: 'ready',
      curriculum: readyCurriculum,
    });
    expect(repository.getCurriculum).toHaveBeenCalledTimes(2);
  });
});
