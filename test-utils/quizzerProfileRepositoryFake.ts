import type {
  ProvisionQuizzerProfileInput,
  QuizzerProfile,
  QuizzerProfileRepository,
} from '../src/features/profile';
import { normalizeProvisionInput } from '../src/features/profile';
import { QuizzerProfileError } from '../src/features/profile';

export interface QuizzerProfileRepositoryFake extends QuizzerProfileRepository {
  /** Seed or replace a stored profile (test helper). */
  seed(profile: QuizzerProfile): void;
  /** Remove a stored profile (test helper). */
  clear(quizzerId?: string): void;
}

export function createQuizzerProfileRepositoryFake(options?: {
  getError?: QuizzerProfileError;
  provisionError?: QuizzerProfileError;
  updateNameError?: QuizzerProfileError;
}): QuizzerProfileRepositoryFake {
  const store = new Map<string, QuizzerProfile>();

  return {
    seed(profile) {
      store.set(profile.quizzerId, { ...profile });
    },

    clear(quizzerId) {
      if (quizzerId === undefined) {
        store.clear();
        return;
      }
      store.delete(quizzerId);
    },

    getProfile: jest.fn(async (quizzerId: string) => {
      if (options?.getError) {
        throw options.getError;
      }
      return store.get(quizzerId) ?? null;
    }),

    provisionProfile: jest.fn(async (input: ProvisionQuizzerProfileInput) => {
      if (options?.provisionError) {
        throw options.provisionError;
      }
      const normalized = normalizeProvisionInput(input);
      const existing = store.get(normalized.quizzerId);
      if (existing) {
        return { ...existing };
      }
      const created: QuizzerProfile = {
        quizzerId: normalized.quizzerId,
        firstName: normalized.firstName,
        lastName: normalized.lastName,
        avatarId: normalized.avatarId,
      };
      store.set(normalized.quizzerId, created);
      return { ...created };
    }),

    updateName: jest.fn(async (input) => {
      if (options?.updateNameError) {
        throw options.updateNameError;
      }
      const existing = store.get(input.quizzerId);
      if (!existing) {
        throw new QuizzerProfileError(
          'unexpected',
          'Unable to load or save profile.',
          input.quizzerId,
        );
      }
      const normalized = normalizeProvisionInput({
        quizzerId: input.quizzerId,
        firstName: input.firstName,
        lastName: input.lastName,
        avatarId: existing.avatarId,
      });
      const updated: QuizzerProfile = {
        quizzerId: existing.quizzerId,
        firstName: normalized.firstName,
        lastName: normalized.lastName,
        avatarId: existing.avatarId,
      };
      store.set(updated.quizzerId, updated);
      return { ...updated };
    }),
  };
}
