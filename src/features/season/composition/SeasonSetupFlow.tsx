import React, { useEffect, useMemo, useRef, useState } from 'react';

import { seasonSetupCopy } from '../copy/seasonSetupCopy';
import { SeasonSetupCatalogError } from '../errors/seasonSetupCatalogError';
import { translateSeasonSetupCatalogError } from '../errors/translateSeasonSetupCatalogError';
import { SeasonSetupNavigator } from '../navigation/SeasonSetupNavigator';
import { CallableQuizzerSeasonParticipationCreator } from '../repositories/callableQuizzerSeasonParticipationCreator';
import { createFirebaseQuizzerSeasonParticipationCallableSource } from '../repositories/firebaseQuizzerSeasonParticipationCallableSource';
import { createFirebaseSeasonSetupCatalogSource } from '../repositories/firebaseSeasonSetupCatalogSource';
import { FirestoreSeasonSetupCatalogRepository } from '../repositories/firestoreSeasonSetupCatalogRepository';
import type { SeasonSetupCatalog, SeasonSetupCatalogRepository } from '../repositories/seasonSetupCatalogRepository';
import type { QuizzerSeasonParticipationCreator } from '../repositories/quizzerSeasonParticipationCreator';
import { SeasonSetupStatusScreen } from '../screens/SeasonSetupStatusScreen';
import { SeasonSetupProvider } from '../state/SeasonSetupProvider';
import {
  SeasonSetupSubmissionProvider,
  type SeasonSetupParticipationReadyHandler,
} from '../state/SeasonSetupSubmissionProvider';
import type { SeasonSetupStudyTrackOption } from '../utils/resolveStudyTrackChoices';

type CatalogPhase =
  | { status: 'loading' }
  | { status: 'ready'; catalog: SeasonSetupCatalog }
  | { status: 'error'; error: SeasonSetupCatalogError };

export interface SeasonSetupFlowProps {
  /** Already-resolved current Season. This flow does not resolve it. */
  resolvedSeasonId: string;
  /** Canonical Season calendar date. Not a birthday. */
  calendarDate: string;
  /** Changing this clears wizard answers. The catalog is Season configuration. */
  sessionIdentityKey: string | null;
  catalogRepository?: SeasonSetupCatalogRepository;
  participationCreator?: QuizzerSeasonParticipationCreator;
  onParticipationReady?: SeasonSetupParticipationReadyHandler;
}

function defaultCatalogRepository(): SeasonSetupCatalogRepository {
  return new FirestoreSeasonSetupCatalogRepository(createFirebaseSeasonSetupCatalogSource());
}

function defaultParticipationCreator(): QuizzerSeasonParticipationCreator {
  return new CallableQuizzerSeasonParticipationCreator(
    createFirebaseQuizzerSeasonParticipationCallableSource(),
  );
}

function catalogErrorFrom(error: unknown): SeasonSetupCatalogError {
  try {
    translateSeasonSetupCatalogError(error);
  } catch (translated) {
    if (translated instanceof SeasonSetupCatalogError) {
      return translated;
    }
  }
  return new SeasonSetupCatalogError('unexpected');
}

function studyTrackOptionsFrom(catalog: SeasonSetupCatalog): SeasonSetupStudyTrackOption[] {
  return catalog.materialSets.map((materialSet) => ({
    materialSetId: materialSet.materialSetId,
    divisionId: materialSet.divisionId,
  }));
}

/**
 * Isolated Season Setup composition.
 * Loads one Season catalog, then mounts the wizard. Does not choose the current Season
 * or leave this flow after a successful participation create.
 */
export function SeasonSetupFlow({
  resolvedSeasonId,
  calendarDate,
  sessionIdentityKey,
  catalogRepository,
  participationCreator,
  onParticipationReady,
}: SeasonSetupFlowProps): React.JSX.Element {
  const repository = useMemo(
    () => catalogRepository ?? defaultCatalogRepository(),
    [catalogRepository],
  );
  const creator = useMemo(
    () => participationCreator ?? defaultParticipationCreator(),
    [participationCreator],
  );
  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState<CatalogPhase>({ status: 'loading' });
  const requestId = useRef(0);

  useEffect(() => {
    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;
    setPhase({ status: 'loading' });
    let active = true;

    void repository.loadCatalog(resolvedSeasonId).then(
      (catalog) => {
        if (!active || currentRequest !== requestId.current) {
          return;
        }
        if (catalog.seasonId !== resolvedSeasonId) {
          setPhase({ status: 'error', error: new SeasonSetupCatalogError('invalid-catalog') });
          return;
        }
        setPhase({ status: 'ready', catalog });
      },
      (error: unknown) => {
        if (!active || currentRequest !== requestId.current) {
          return;
        }
        setPhase({ status: 'error', error: catalogErrorFrom(error) });
      },
    );

    return () => {
      active = false;
    };
  }, [repository, resolvedSeasonId, attempt]);

  if (phase.status === 'loading' || (phase.status === 'ready' && phase.catalog.seasonId !== resolvedSeasonId)) {
    return (
      <SeasonSetupStatusScreen
        title={seasonSetupCopy.loading.title}
        titleTestID="season-setup-loading"
        busy
      />
    );
  }

  if (phase.status === 'error') {
    const message =
      phase.error.code === 'unavailable'
        ? seasonSetupCopy.catalog.temporarilyUnavailable
        : seasonSetupCopy.catalog.unavailable;
    return (
      <SeasonSetupStatusScreen
        title={seasonSetupCopy.catalog.title}
        titleTestID="season-setup-catalog-title"
        message={message}
        messageTestID="season-setup-catalog-error"
        retryLabel={phase.error.retryable ? seasonSetupCopy.catalog.retry : undefined}
        onRetry={
          phase.error.retryable
            ? () => {
                setPhase({ status: 'loading' });
                setAttempt((value) => value + 1);
              }
            : undefined
        }
      />
    );
  }

  const catalog = phase.catalog;
  return (
    <SeasonSetupProvider
      resolvedSeasonId={catalog.seasonId}
      calendarDate={calendarDate}
      sessionIdentityKey={sessionIdentityKey}
      studyTrackOptions={studyTrackOptionsFrom(catalog)}
      regions={catalog.regions}
    >
      <SeasonSetupSubmissionProvider creator={creator} onParticipationReady={onParticipationReady}>
        <SeasonSetupNavigator />
      </SeasonSetupSubmissionProvider>
    </SeasonSetupProvider>
  );
}
