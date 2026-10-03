import { FirebaseNotConfiguredError } from '../../../services/firebase';
import { SeasonSetupCatalogError } from './seasonSetupCatalogError';

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

/** Translates infrastructure and mapping failures. Never returns. */
export function translateSeasonSetupCatalogError(error: unknown): never {
  if (error instanceof SeasonSetupCatalogError) {
    throw error;
  }

  if (error instanceof FirebaseNotConfiguredError) {
    throw new SeasonSetupCatalogError('unexpected');
  }

  const code = firestoreErrorCode(error);
  if (code === 'permission-denied') {
    throw new SeasonSetupCatalogError('permission-denied');
  }
  if (code === 'unavailable' || code === 'deadline-exceeded') {
    throw new SeasonSetupCatalogError('unavailable');
  }

  throw new SeasonSetupCatalogError('unexpected');
}
