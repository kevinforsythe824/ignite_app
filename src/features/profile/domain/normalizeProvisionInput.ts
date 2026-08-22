import { QuizzerProfileError } from '../errors/quizzerProfileError';
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

  if (typeof input.firstName !== 'string') {
    throw new QuizzerProfileError(
      'invalid-profile-data',
      'First name must be a string.',
    );
  }
  if (typeof input.lastName !== 'string') {
    throw new QuizzerProfileError(
      'invalid-profile-data',
      'Last name must be a string.',
    );
  }

  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();

  if (firstName.length === 0) {
    throw new QuizzerProfileError(
      'invalid-profile-data',
      'First name is required.',
    );
  }
  if (lastName.length === 0) {
    throw new QuizzerProfileError(
      'invalid-profile-data',
      'Last name is required.',
    );
  }

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
