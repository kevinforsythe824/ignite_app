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

import { useAuth } from '../../auth';
import type { QuizzerProfile } from '../domain/quizzerProfile';
import { QuizzerProfileError } from '../errors/quizzerProfileError';
import { translateQuizzerProfileError } from '../errors/translateQuizzerProfileError';
import type { QuizzerProfileRepository } from '../repositories/quizzerProfileRepository';
import { firestoreQuizzerProfileRepository } from '../repositories';
import type { QuizzerProfileSessionState } from './quizzerProfileSessionState';

export interface QuizzerProfileContextValue {
  session: QuizzerProfileSessionState;
  /** Re-run getProfile for the current authenticated identity. */
  retry(): Promise<void>;
  /**
   * Provision the current authenticated Quizzer's profile.
   * quizzerId is always taken from AuthenticatedIdentity.uid — never from callers.
   */
  provisionProfile(input: { firstName: string; lastName: string }): Promise<QuizzerProfile>;
}

const QuizzerProfileContext = createContext<QuizzerProfileContextValue | undefined>(
  undefined,
);

export interface QuizzerProfileProviderProps {
  children: ReactNode;
  repository?: QuizzerProfileRepository;
}

/**
 * Resolves Quizzer profile presence for the authenticated identity.
 * Owns idle/loading/missing/ready/error and ignores stale in-flight responses.
 */
export function QuizzerProfileProvider({
  children,
  repository = firestoreQuizzerProfileRepository,
}: QuizzerProfileProviderProps): React.JSX.Element {
  const { identity } = useAuth();
  const repositoryRef = useRef(repository);
  repositoryRef.current = repository;

  const [session, setSession] = useState<QuizzerProfileSessionState>({ status: 'idle' });
  const requestGenerationRef = useRef(0);

  const resolveProfile = useCallback(async (quizzerId: string, generation: number) => {
    setSession({ status: 'loading', quizzerId });
    try {
      const profile = await repositoryRef.current.getProfile(quizzerId);
      if (requestGenerationRef.current !== generation) {
        return;
      }
      if (profile === null) {
        setSession({ status: 'missing', quizzerId });
        return;
      }
      setSession({ status: 'ready', quizzerId, profile });
    } catch (error) {
      if (requestGenerationRef.current !== generation) {
        return;
      }
      let profileError: QuizzerProfileError;
      try {
        translateQuizzerProfileError(error, quizzerId);
      } catch (translated) {
        profileError =
          translated instanceof QuizzerProfileError
            ? translated
            : new QuizzerProfileError('unexpected', 'Unable to load or save profile.', quizzerId);
      }
      setSession({ status: 'error', quizzerId, error: profileError });
    }
  }, []);

  useEffect(() => {
    if (identity === null) {
      requestGenerationRef.current += 1;
      setSession({ status: 'idle' });
      return;
    }

    const quizzerId = identity.uid;
    const generation = requestGenerationRef.current + 1;
    requestGenerationRef.current = generation;
    void resolveProfile(quizzerId, generation);
  }, [identity, resolveProfile]);

  const retry = useCallback(async () => {
    if (identity === null) {
      setSession({ status: 'idle' });
      return;
    }
    const generation = requestGenerationRef.current + 1;
    requestGenerationRef.current = generation;
    await resolveProfile(identity.uid, generation);
  }, [identity, resolveProfile]);

  const provisionProfile = useCallback(
    async (input: { firstName: string; lastName: string }): Promise<QuizzerProfile> => {
      if (identity === null) {
        throw new QuizzerProfileError(
          'unexpected',
          'Unable to load or save profile.',
        );
      }

      const quizzerId = identity.uid;
      try {
        const profile = await repositoryRef.current.provisionProfile({
          quizzerId,
          firstName: input.firstName,
          lastName: input.lastName,
          avatarId: null,
        });
        // Authoritative ready from returned profile (or would refresh equivalently).
        setSession({ status: 'ready', quizzerId, profile });
        return profile;
      } catch (error) {
        translateQuizzerProfileError(error, quizzerId);
      }
    },
    [identity],
  );

  const value = useMemo<QuizzerProfileContextValue>(
    () => ({
      session,
      retry,
      provisionProfile,
    }),
    [session, retry, provisionProfile],
  );

  return (
    <QuizzerProfileContext.Provider value={value}>{children}</QuizzerProfileContext.Provider>
  );
}

export function useQuizzerProfile(): QuizzerProfileContextValue {
  const value = useContext(QuizzerProfileContext);
  if (value === undefined) {
    throw new Error('useQuizzerProfile must be used within QuizzerProfileProvider');
  }
  return value;
}
