import { QuizzerProfileError } from '../errors/quizzerProfileError';

export interface NameFieldsInput {
  firstName: unknown;
  lastName: unknown;
}

export interface NormalizedNameFields {
  firstName: string;
  lastName: string;
}

/**
 * Write-boundary normalization for first/last name.
 * Trims leading/trailing whitespace only; does not alter case, punctuation, or script.
 */
export function normalizeNameFields(input: NameFieldsInput): NormalizedNameFields {
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

  return { firstName, lastName };
}
