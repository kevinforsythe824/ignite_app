import { useCallback, useRef, useState } from 'react';

import { authCopy } from '../copy/authCopy';
import { AuthenticationError } from '../errors/authenticationError';

export interface UseAuthOperationResult {
  submitting: boolean;
  errorMessage: string | undefined;
  clearError(): void;
  run(operation: () => Promise<void>): Promise<boolean>;
}

/**
 * Local submit lifecycle for auth forms.
 * Duplicate presses are ignored until the in-flight operation finishes.
 */
export function useAuthOperation(): UseAuthOperationResult {
  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const clearError = useCallback(() => {
    setErrorMessage(undefined);
  }, []);

  const run = useCallback(async (operation: () => Promise<void>): Promise<boolean> => {
    if (submittingRef.current) {
      return false;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setErrorMessage(undefined);

    try {
      await operation();
      return true;
    } catch (error) {
      setErrorMessage(
        error instanceof AuthenticationError
          ? error.message
          : authCopy.errors.unexpected,
      );
      return false;
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, []);

  return { submitting, errorMessage, clearError, run };
}
