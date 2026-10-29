import React, { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';

import { useFlashcardCurriculum } from '../../flashcards/hooks/useFlashcardCurriculum';
import { firestoreCurriculumRepository } from '../../flashcards/repositories';
import type { StudyCurriculum } from '../../flashcards/repositories/curriculumRepository';
import { useSeasonParticipation } from '../../season/state/SeasonParticipationProvider';
import { StudyMessage } from '../components/StudyMessage';

/** Live Study curriculum source — Firestore, not the JSON fixture. */
export const studyCurriculumRepository = firestoreCurriculumRepository;

interface StudyCurriculumContextValue {
  curriculum: StudyCurriculum;
}

const StudyCurriculumContext = createContext<StudyCurriculumContextValue | undefined>(undefined);

export function StudyCurriculumProvider({
  curriculum,
  children,
}: {
  curriculum: StudyCurriculum;
  children: ReactNode;
}): React.JSX.Element {
  const value = useMemo(() => ({ curriculum }), [curriculum]);
  return (
    <StudyCurriculumContext.Provider value={value}>{children}</StudyCurriculumContext.Provider>
  );
}

export function useStudyCurriculum(): StudyCurriculum {
  const value = useContext(StudyCurriculumContext);
  if (value === undefined) {
    throw new Error('useStudyCurriculum must be used within a Study curriculum provider');
  }
  return value.curriculum;
}

/**
 * One curriculum load for the Study tab. Hub and Flashcards read this context.
 * A new Season or MaterialSet remounts the loader so the previous target's
 * cards are not left on screen. An unready Season session does not fall back
 * to another MaterialSet.
 */
export function StudyCurriculumGate({ children }: { children: ReactNode }): React.JSX.Element {
  const { session } = useSeasonParticipation();
  if (session.status !== 'ready') {
    return (
      <StudyMessage testID="study-target-unavailable" title="Study isn't available right now" />
    );
  }

  return (
    <StudyCurriculumLoader
      key={`${session.studyTarget.seasonId}:${session.studyTarget.materialSetId}`}
      materialSetId={session.studyTarget.materialSetId}
      seasonId={session.studyTarget.seasonId}
    >
      {children}
    </StudyCurriculumLoader>
  );
}

function StudyCurriculumLoader({
  seasonId,
  materialSetId,
  children,
}: {
  seasonId: string;
  materialSetId: string;
  children: ReactNode;
}): React.JSX.Element {
  const { loadState, reload } = useFlashcardCurriculum(
    seasonId,
    materialSetId,
    studyCurriculumRepository,
  );

  if (loadState.status === 'ready') {
    return (
      <StudyCurriculumProvider curriculum={loadState.curriculum}>
        {children}
      </StudyCurriculumProvider>
    );
  }

  if (loadState.status === 'loading') {
    return <StudyMessage title="Loading cards…" />;
  }

  if (loadState.status === 'empty') {
    return (
      <StudyMessage
        title="No cards available"
        copy="There are no cards for this season."
      />
    );
  }

  return (
    <StudyMessage
      title="Could not load cards"
      copy={loadState.message}
      onRetry={reload}
    />
  );
}
