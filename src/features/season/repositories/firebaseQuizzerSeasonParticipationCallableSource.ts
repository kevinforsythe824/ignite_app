import { httpsCallable } from 'firebase/functions';

import type { CreateQuizzerSeasonParticipationRequest } from '../application/buildCreateParticipationRequest';
import { getFirebaseFunctions } from '../../../services/firebase/firebaseFunctions';

/** Smallest Firebase Functions port for createQuizzerSeasonParticipation. */
export interface QuizzerSeasonParticipationCallableSource {
  invoke(request: CreateQuizzerSeasonParticipationRequest): Promise<unknown>;
}

export function createFirebaseQuizzerSeasonParticipationCallableSource(
  getFunctionsInstance: typeof getFirebaseFunctions = getFirebaseFunctions,
): QuizzerSeasonParticipationCallableSource {
  return {
    async invoke(request) {
      const callable = httpsCallable(
        getFunctionsInstance(),
        'createQuizzerSeasonParticipation',
      );
      const result = await callable(request);
      return result.data;
    },
  };
}
