import { QuizzerProfileError } from '../errors/quizzerProfileError';
import { normalizeNameFields } from './normalizeNameFields';
import type {
  NormalizedProvisionQuizzerProfileInput,
  ProvisionQuizzerProfileInput,
} from './provisionQuizzerProfileInput';

/**
 * Write-boundary normalization for profile provisioning.
 * Trims leading/trailing whitespace only; does not alter case, punctuation, or script.
 */
export function normalizeProvisionInput(
  input: ProvisionQuizzerProfileInput,
): NormalizedProvisionQuizzerProfileInput {
  const quizzerId = typeof input.quizzerId === 'string' ? input.quizzerId.trim() : '';
  if (quizzerId.length === 0) {
    throw new QuizzerProfileError(
      'invalid-profile-data',
      'Quizzer id is required to provision a profile.',
    );
  }

  const { firstName, lastName } = normalizeNameFields({
    firstName: input.firstName,
    lastName: input.lastName,
  });

  let avatarId: string | null = null;
  if (input.avatarId !== undefined && input.avatarId !== null) {
    if (typeof input.avatarId !== 'string') {
      throw new QuizzerProfileError(
        'invalid-profile-data',
        'Avatar id must be a string or null.',
      );
    }
    avatarId = input.avatarId;
  }

  return { quizzerId, firstName, lastName, avatarId };
}
