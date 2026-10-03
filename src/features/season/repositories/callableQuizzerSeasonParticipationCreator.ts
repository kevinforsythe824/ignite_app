import type { CreateQuizzerSeasonParticipationRequest } from '../application/buildCreateParticipationRequest';
import {
  parseCreateParticipationCallableResult,
  type CreateParticipationResult,
} from '../data/parseCreateParticipationCallableResult';
import { translateSeasonSetupSubmissionError } from '../errors/translateSeasonSetupSubmissionError';
import type { QuizzerSeasonParticipationCallableSource } from './firebaseQuizzerSeasonParticipationCallableSource';
import type { QuizzerSeasonParticipationCreator } from './quizzerSeasonParticipationCreator';

/**
 * Callable adapter. Forwards the participation request unchanged and
 * validates the response before it becomes a domain result.
 */
export class CallableQuizzerSeasonParticipationCreator implements QuizzerSeasonParticipationCreator {
  constructor(private readonly source: QuizzerSeasonParticipationCallableSource) {}

  async create(
    request: CreateQuizzerSeasonParticipationRequest,
  ): Promise<CreateParticipationResult> {
    try {
      const data = await this.source.invoke(request);
      return parseCreateParticipationCallableResult(data, request);
    } catch (error) {
      translateSeasonSetupSubmissionError(error);
    }
  }
}
