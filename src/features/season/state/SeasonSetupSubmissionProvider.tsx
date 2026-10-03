import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { buildCreateParticipationRequest } from '../application/buildCreateParticipationRequest';
import type { ReadyQuizzerSeasonParticipation } from '../domain/readyParticipationRecord';
import { SeasonSetupSubmissionError } from '../errors/seasonSetupSubmissionError';
import type { QuizzerSeasonParticipationCreator } from '../repositories/quizzerSeasonParticipationCreator';
import { useSeasonSetup } from './SeasonSetupProvider';

export interface SeasonSetupSubmissionContextValue {
  submit(): Promise<void>;
  submissionError: SeasonSetupSubmissionError | null;
}

const SeasonSetupSubmissionContext = createContext<SeasonSetupSubmissionContextValue | undefined>(
  undefined,
);

/** Post-success handoff. A throw or rejection must not undo server success. */
export type SeasonSetupParticipationReadyHandler = (
  participation: ReadyQuizzerSeasonParticipation,
  created: boolean,
) => void | Promise<void>;

export interface SeasonSetupSubmissionProviderProps {
  children: ReactNode;
  creator: QuizzerSeasonParticipationCreator;
  onParticipationReady?: SeasonSetupParticipationReadyHandler;
}

type CreatedParticipation = Awaited<ReturnType<QuizzerSeasonParticipationCreator['create']>>;

function asSubmissionError(error: unknown): SeasonSetupSubmissionError {
  if (error instanceof SeasonSetupSubmissionError) {
    return error;
  }
  return new SeasonSetupSubmissionError('unexpected');
}

async function handoffParticipation(
  onParticipationReady: SeasonSetupParticipationReadyHandler | undefined,
  result: CreatedParticipation,
): Promise<void> {
  if (onParticipationReady === undefined) {
    return;
  }
  try {
    await onParticipationReady(result.participation, result.created);
  } catch {
    // The participation mutation already succeeded. Handoff failure stays here.
  }
}

/**
 * One in-flight participation create. The request is rebuilt from the wizard
 * on each attempt. Server success completes submission before the handoff.
 * A handoff failure does not undo that completion or create again.
 */
export function SeasonSetupSubmissionProvider({
  children,
  creator,
  onParticipationReady,
}: SeasonSetupSubmissionProviderProps): React.JSX.Element {
  const { wizard, startSubmission, completeSubmission, failSubmission } = useSeasonSetup();
  const [submissionError, setSubmissionError] = useState<SeasonSetupSubmissionError | null>(null);
  const inFlight = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (wizard.submission.status === 'idle') {
      setSubmissionError(null);
    }
  }, [wizard.submission.status]);

  const submit = useCallback(async () => {
    if (
      inFlight.current ||
      wizard.submission.status === 'submitting' ||
      wizard.submission.status === 'complete'
    ) {
      return;
    }
    const built = buildCreateParticipationRequest(wizard);
    if (built.status !== 'ready') {
      return;
    }
    if (!startSubmission()) {
      return;
    }

    inFlight.current = true;
    setSubmissionError(null);
    try {
      let result: CreatedParticipation;
      try {
        result = await creator.create(built.request);
      } catch (error) {
        if (!mounted.current) {
          return;
        }
        failSubmission();
        setSubmissionError(asSubmissionError(error));
        return;
      }

      if (!mounted.current) {
        return;
      }
      completeSubmission();
      await handoffParticipation(onParticipationReady, result);
    } finally {
      inFlight.current = false;
    }
  }, [
    wizard,
    creator,
    startSubmission,
    completeSubmission,
    failSubmission,
    onParticipationReady,
  ]);

  return (
    <SeasonSetupSubmissionContext.Provider value={{ submit, submissionError }}>
      {children}
    </SeasonSetupSubmissionContext.Provider>
  );
}

export function useSeasonSetupSubmission(): SeasonSetupSubmissionContextValue {
  const value = useContext(SeasonSetupSubmissionContext);
  if (value === undefined) {
    throw new Error('useSeasonSetupSubmission must be used within SeasonSetupSubmissionProvider');
  }
  return value;
}
