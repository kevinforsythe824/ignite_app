import type { CreateQuizzerSeasonParticipationRequest } from '../application/buildCreateParticipationRequest';
import type { CreateParticipationResult } from '../data/parseCreateParticipationCallableResult';

/**
 * Server create-only participation.
 * No Firestore write, update, or delete methods live on this contract.
 */
export interface QuizzerSeasonParticipationCreator {
  create(request: CreateQuizzerSeasonParticipationRequest): Promise<CreateParticipationResult>;
}
