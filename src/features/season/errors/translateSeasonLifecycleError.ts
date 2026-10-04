import { FirebaseNotConfiguredError } from '../../../services/firebase';
import { SeasonSetupCatalogError } from './seasonSetupCatalogError';
import { ParticipationRepositoryError } from './participationRepositoryError';
import {
  SeasonLifecycleError,
  type SeasonLifecycleErrorCode,
} from './seasonLifecycleError';

function firestoreErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }
  const code = (error as { code: unknown }).code;
  if (typeof code !== 'string') {
    return undefined;
  }
  return code.replace(/^firestore\//, '');
}

function fromParticipation(error: ParticipationRepositoryError): SeasonLifecycleError {
  switch (error.code) {
    case 'permission-denied':
      return new SeasonLifecycleError('permission-denied');
    case 'unavailable':
      return new SeasonLifecycleError('unavailable');
    case 'invalid-participation-data':
      return new SeasonLifecycleError('invalid-participation');
    case 'unexpected':
      return new SeasonLifecycleError('unexpected');
    default: {
      const unexpected: never = error.code;
      return unexpected;
    }
  }
}

function fromCatalog(
  error: SeasonSetupCatalogError,
  invalidCode: Extract<SeasonLifecycleErrorCode, 'invalid-season-catalog' | 'invalid-material-set'>,
): SeasonLifecycleError {
  switch (error.code) {
    case 'permission-denied':
      return new SeasonLifecycleError('permission-denied');
    case 'unavailable':
      return new SeasonLifecycleError('unavailable');
    case 'invalid-catalog':
      return new SeasonLifecycleError(invalidCode);
    case 'unexpected':
      return new SeasonLifecycleError('unexpected');
    default: {
      const unexpected: never = error.code;
      return unexpected;
    }
  }
}

/** Maps infrastructure failures to the Season lifecycle error. Never returns. */
export function translateSeasonReadError(
  error: unknown,
  invalidCode: Extract<SeasonLifecycleErrorCode, 'invalid-season-catalog' | 'invalid-material-set'>,
): never {
  if (error instanceof SeasonLifecycleError) {
    throw error;
  }
  if (error instanceof ParticipationRepositoryError) {
    throw fromParticipation(error);
  }
  if (error instanceof SeasonSetupCatalogError) {
    throw fromCatalog(error, invalidCode);
  }
  if (error instanceof FirebaseNotConfiguredError) {
    throw new SeasonLifecycleError('unexpected');
  }

  const code = firestoreErrorCode(error);
  if (code === 'permission-denied') {
    throw new SeasonLifecycleError('permission-denied');
  }
  if (code === 'unavailable' || code === 'deadline-exceeded') {
    throw new SeasonLifecycleError('unavailable');
  }

  throw new SeasonLifecycleError('unexpected');
}

/** Same translation for session state, which stores the error instead of throwing. */
export function toSeasonLifecycleError(error: unknown): SeasonLifecycleError {
  if (error instanceof SeasonLifecycleError) {
    return error;
  }
  try {
    translateSeasonReadError(error, 'invalid-season-catalog');
  } catch (translated) {
    if (translated instanceof SeasonLifecycleError) {
      return translated;
    }
  }
  return new SeasonLifecycleError('unexpected');
}
