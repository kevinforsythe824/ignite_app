import { notConnected } from '../errors';

/**
 * Legacy Firebase service facade for non-auth initialization hooks.
 * Authentication lives in `src/features/auth/` behind AuthRepository.
 */
export interface FirebaseService {
  initialize(): Promise<void>;
}

export const firebaseService: FirebaseService = {
  initialize: () => notConnected('firebase', 'initialize'),
};

export function createFirebaseService(): FirebaseService {
  return firebaseService;
}
