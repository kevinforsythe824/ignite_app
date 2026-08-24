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
  /**
   * Update first/last name for the current authenticated Quizzer.
   * quizzerId is always taken from AuthenticatedIdentity.uid — never from callers.
   */
  updateName(input: { firstName: string; lastName: string }): Promise<QuizzerProfile>;
}

const QuizzerProfileContext = createContext<QuizzerProfileContextValue | undefined>(
  undefined,
);

export interface QuizzerProfileProviderProps {
  children: ReactNode;
  repository?: QuizzerProfileRepository;
}

/**
 * Resolves Quizzer profile presence for the authenticated UID.
 * Lifecycle is keyed to the stable uid string — not AuthenticatedIdentity object identity.
 * Same-uid auth metadata refreshes (email / emailVerified) must not reset or re-fetch profile.
 * Owns idle/loading/missing/ready/error and ignores stale in-flight responses.
 */
export function QuizzerProfileProvider({
  children,
  repository = firestoreQuizzerProfileRepository,
}: QuizzerProfileProviderProps): React.JSX.Element {
  const { session: authSession } = useAuth();
  const authenticatedUid =
    authSession.status === 'authenticated' ? authSession.identity.uid : null;

  const repositoryRef = useRef(repository);
  repositoryRef.current = repository;
  const authenticatedUidRef = useRef(authenticatedUid);
  authenticatedUidRef.current = authenticatedUid;

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
    if (authenticatedUid === null) {
      requestGenerationRef.current += 1;
      setSession({ status: 'idle' });
      return;
    }

    const generation = requestGenerationRef.current + 1;
    requestGenerationRef.current = generation;
    void resolveProfile(authenticatedUid, generation);
  }, [authenticatedUid, resolveProfile]);

  const retry = useCallback(async () => {
    const quizzerId = authenticatedUidRef.current;
    if (quizzerId === null) {
      setSession({ status: 'idle' });
      return;
    }
    const generation = requestGenerationRef.current + 1;
    requestGenerationRef.current = generation;
    await resolveProfile(quizzerId, generation);
  }, [resolveProfile]);

  const provisionProfile = useCallback(
    async (input: { firstName: string; lastName: string }): Promise<QuizzerProfile> => {
      const quizzerId = authenticatedUidRef.current;
      if (quizzerId === null) {
        throw new QuizzerProfileError(
          'unexpected',
          'Unable to load or save profile.',
        );
      }

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
    [],
  );

  const updateName = useCallback(
    async (input: { firstName: string; lastName: string }): Promise<QuizzerProfile> => {
      const quizzerId = authenticatedUidRef.current;
      if (quizzerId === null) {
        throw new QuizzerProfileError(
          'unexpected',
          'Unable to load or save profile.',
        );
      }

      try {
        const profile = await repositoryRef.current.updateName({
          quizzerId,
          firstName: input.firstName,
          lastName: input.lastName,
        });
        setSession({ status: 'ready', quizzerId, profile });
        return profile;
      } catch (error) {
        translateQuizzerProfileError(error, quizzerId);
      }
    },
    [],
  );

  const value = useMemo<QuizzerProfileContextValue>(
    () => ({
      session,
      retry,
      provisionProfile,
      updateName,
    }),
    [session, retry, provisionProfile, updateName],
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
