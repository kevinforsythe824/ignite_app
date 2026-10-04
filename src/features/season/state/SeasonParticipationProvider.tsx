import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';

import { readIgniteEnvironment } from '../../../services/firebase';
import { useAuth } from '../../auth';
import { loadSeasonParticipationSession } from '../application/loadSeasonParticipationSession';
import { systemSeasonClock, type SeasonClock } from '../application/seasonClock';
import { SeasonLifecycleError } from '../errors/seasonLifecycleError';
import { createFirebaseSeasonCatalogSource } from '../repositories/firebaseSeasonCatalogSource';
import { createFirebaseSeasonMaterialSetCatalogSource } from '../repositories/firebaseSeasonMaterialSetCatalogSource';
import { createFirebaseQuizzerSeasonParticipationSource } from '../repositories/firebaseQuizzerSeasonParticipationSource';
import { FirestoreSeasonCatalogRepository } from '../repositories/firestoreSeasonCatalogRepository';
import { FirestoreSeasonMaterialSetCatalogRepository } from '../repositories/firestoreSeasonMaterialSetCatalogRepository';
import { FirestoreQuizzerSeasonParticipationRepository } from '../repositories/firestoreQuizzerSeasonParticipationRepository';
import type { QuizzerSeasonParticipationRepository } from '../repositories/quizzerSeasonParticipationRepository';
import type { SeasonCatalogRepository } from '../repositories/seasonCatalogRepository';
import type { SeasonMaterialSetCatalogRepository } from '../repositories/seasonMaterialSetCatalogRepository';
import {
  isolateSeasonParticipationSessionForUid,
  type SeasonParticipationSession,
} from './seasonParticipationSession';

/** Identifies a successful setup handoff. The record itself is not stored from the callback. */
export interface SeasonParticipationReadyClaim {
  readonly quizzerId: string;
  readonly seasonId: string;
}

export interface SeasonParticipationContextValue {
  session: SeasonParticipationSession;
  /** Re-run Season → participation → Study target for the current authenticated Quizzer. */
  refresh(): Promise<void>;
  /**
   * After Season Setup succeeds, refresh only when the claim still matches the
   * active Quizzer and current Season. Otherwise ignore it.
   */
  acceptParticipationReady(claim: SeasonParticipationReadyClaim): Promise<void>;
}

const SeasonParticipationContext = createContext<SeasonParticipationContextValue | undefined>(
  undefined,
);

export interface SeasonParticipationProviderProps {
  children: ReactNode;
  seasonCatalog?: SeasonCatalogRepository;
  participationRepository?: QuizzerSeasonParticipationRepository;
  materialSetCatalog?: SeasonMaterialSetCatalogRepository;
  clock?: SeasonClock;
  readEnvironment?: () => string;
}

function defaultSeasonCatalog(): SeasonCatalogRepository {
  return new FirestoreSeasonCatalogRepository(createFirebaseSeasonCatalogSource());
}

function defaultParticipationRepository(): QuizzerSeasonParticipationRepository {
  return new FirestoreQuizzerSeasonParticipationRepository(
    createFirebaseQuizzerSeasonParticipationSource(),
  );
}

function defaultMaterialSetCatalog(): SeasonMaterialSetCatalogRepository {
  return new FirestoreSeasonMaterialSetCatalogRepository(
    createFirebaseSeasonMaterialSetCatalogSource(),
  );
}

/**
 * Current Season, this Quizzer's participation, and the resolved Study target.
 * Keyed to the authenticated uid. Same-uid metadata refreshes do not reset it.
 * A late response for a previous uid is ignored.
 */
export function SeasonParticipationProvider({
  children,
  seasonCatalog,
  participationRepository,
  materialSetCatalog,
  clock = systemSeasonClock,
  readEnvironment = readIgniteEnvironment,
}: SeasonParticipationProviderProps): React.JSX.Element {
  const { session: authSession } = useAuth();
  const authenticatedUid =
    authSession.status === 'authenticated' ? authSession.identity.uid : null;

  const seasonCatalogRef = useRef(seasonCatalog ?? defaultSeasonCatalog());
  const participationRepositoryRef = useRef(
    participationRepository ?? defaultParticipationRepository(),
  );
  const materialSetCatalogRef = useRef(materialSetCatalog ?? defaultMaterialSetCatalog());
  const clockRef = useRef(clock);
  const readEnvironmentRef = useRef(readEnvironment);
  if (seasonCatalog !== undefined) {
    seasonCatalogRef.current = seasonCatalog;
  }
  if (participationRepository !== undefined) {
    participationRepositoryRef.current = participationRepository;
  }
  if (materialSetCatalog !== undefined) {
    materialSetCatalogRef.current = materialSetCatalog;
  }
  clockRef.current = clock;
  readEnvironmentRef.current = readEnvironment;

  const authenticatedUidRef = useRef(authenticatedUid);
  authenticatedUidRef.current = authenticatedUid;

  const [session, setSession] = useState<SeasonParticipationSession>({ status: 'idle' });
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const requestGenerationRef = useRef(0);

  const run = useCallback(async (quizzerId: string, generation: number) => {
    const stillCurrent = () =>
      requestGenerationRef.current === generation && authenticatedUidRef.current === quizzerId;

    if (!stillCurrent()) {
      return;
    }
    setSession({ status: 'loading', quizzerId });

    let environment: string;
    try {
      environment = readEnvironmentRef.current();
    } catch {
      if (!stillCurrent()) {
        return;
      }
      setSession({
        status: 'error',
        quizzerId,
        error: new SeasonLifecycleError('unexpected'),
      });
      return;
    }

    let instant: Date;
    try {
      instant = clockRef.current();
    } catch {
      if (!stillCurrent()) {
        return;
      }
      setSession({
        status: 'error',
        quizzerId,
        error: new SeasonLifecycleError('unexpected'),
      });
      return;
    }

    const resolution = await loadSeasonParticipationSession({
      quizzerId,
      seasonCatalog: seasonCatalogRef.current,
      participationRepository: participationRepositoryRef.current,
      materialSetCatalog: materialSetCatalogRef.current,
      instant,
      environment,
    });
    if (!stillCurrent()) {
      return;
    }
    setSession(resolution);
  }, []);

  useEffect(() => {
    if (authenticatedUid === null) {
      requestGenerationRef.current += 1;
      setSession({ status: 'idle' });
      return;
    }

    const generation = requestGenerationRef.current + 1;
    requestGenerationRef.current = generation;
    void run(authenticatedUid, generation);
  }, [authenticatedUid, run]);

  const refresh = useCallback(async () => {
    const quizzerId = authenticatedUidRef.current;
    if (quizzerId === null) {
      requestGenerationRef.current += 1;
      setSession({ status: 'idle' });
      return;
    }
    const generation = requestGenerationRef.current + 1;
    requestGenerationRef.current = generation;
    await run(quizzerId, generation);
  }, [run]);

  const acceptParticipationReady = useCallback(
    async (claim: SeasonParticipationReadyClaim) => {
      const uid = authenticatedUidRef.current;
      const current = sessionRef.current;
      if (uid === null || claim.quizzerId !== uid) {
        return;
      }
      if (current.status !== 'setupRequired' || current.quizzerId !== uid) {
        return;
      }
      if (current.season.seasonId !== claim.seasonId) {
        return;
      }
      await refresh();
    },
    [refresh],
  );

  const isolated = isolateSeasonParticipationSessionForUid(session, authenticatedUid);
  const value = useMemo<SeasonParticipationContextValue>(
    () => ({
      session: isolated,
      refresh,
      acceptParticipationReady,
    }),
    [isolated, refresh, acceptParticipationReady],
  );

  return (
    <SeasonParticipationContext.Provider value={value}>
      {children}
    </SeasonParticipationContext.Provider>
  );
}

export function useSeasonParticipation(): SeasonParticipationContextValue {
  const value = useContext(SeasonParticipationContext);
  if (value === undefined) {
    throw new Error('useSeasonParticipation must be used within SeasonParticipationProvider');
  }
  return value;
}
