import { useCallback, useEffect, useRef, useState } from 'react';

import type {
  CurriculumRepository,
  StudyCurriculum,
} from '../repositories/curriculumRepository';

export type CurriculumLoadState =
  | { status: 'loading' }
  | { status: 'ready'; curriculum: StudyCurriculum }
  | { status: 'empty' }
  | { status: 'error'; message: string };

export interface UseFlashcardCurriculumResult {
  loadState: CurriculumLoadState;
  reload: () => void;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unable to load curriculum';
}

/**
 * Feature-local curriculum load state. Not a global data-fetching layer.
 * Callers inject the repository; Study composes Firestore at the route.
 */
export function useFlashcardCurriculum(
  seasonId: string,
  repository: CurriculumRepository,
): UseFlashcardCurriculumResult {
  const [loadState, setLoadState] = useState<CurriculumLoadState>({ status: 'loading' });
  const [reloadToken, setReloadToken] = useState(0);
  const repositoryRef = useRef(repository);
  repositoryRef.current = repository;

  const reload = useCallback(() => {
    setLoadState({ status: 'loading' });
    setReloadToken((token) => token + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadState({ status: 'loading' });

    repositoryRef.current.getCurriculum(seasonId).then(
      (curriculum) => {
        if (cancelled) {
          return;
        }
        if (curriculum.cards.length === 0) {
          setLoadState({ status: 'empty' });
          return;
        }
        setLoadState({ status: 'ready', curriculum });
      },
      (error: unknown) => {
        if (cancelled) {
          return;
        }
        setLoadState({ status: 'error', message: errorMessage(error) });
      },
    );

    return () => {
      cancelled = true;
    };
  }, [seasonId, reloadToken]);

  return { loadState, reload };
}
